"""
Appointment Canceller Service - Multi-turn conversation for cancellation
Manages the flow: select appointment -> confirm cancellation -> cancel
"""

import logging
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Tuple, Optional
from app.models import WhatsAppSession, Cita, AppointmentStatusEnum, Doctor
from app.services.whatsapp_session_service import (
    get_session, update_session, set_phase, set_appointment_to_cancel,
    clear_session, get_patient_by_whatsapp
)
from app.services.notification_service import notify_appointment_cancelled
from sqlalchemy import and_

logger = logging.getLogger(__name__)


def handle_cancelacion_start(
    session: WhatsAppSession,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> Tuple[str, WhatsAppSession]:
    """
    Phase 1: Start cancellation - show patient's pending appointments.

    Args:
        session: WhatsAppSession object
        empresa_id: Company ID
        caller_id: WhatsApp caller ID
        db: Database session

    Returns:
        Tuple of (message, updated_session)
    """
    try:
        # Get patient by WhatsApp number
        patient = get_patient_by_whatsapp(caller_id, empresa_id, db)

        if not patient:
            return (
                "No encontramos tu perfil. Por favor, agenda una cita primero. 📝",
                session
            )

        # Get pending and confirmed appointments
        appointments = db.query(Cita).filter(
            and_(
                Cita.patient_id == patient.id,
                Cita.empresa_id == empresa_id,
                Cita.status.in_([
                    AppointmentStatusEnum.pendiente,
                    AppointmentStatusEnum.confirmada
                ])
            )
        ).all()

        if not appointments:
            return (
                "No tienes citas para cancelar. 😊\n\n"
                "Escribe 'agendar' para reservar una nueva.",
                session
            )

        # Prepare appointments data for display
        appointments_data = []
        for appt in appointments:
            doctor = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
            appointment_date = datetime.strptime(appt.date, "%Y-%m-%d")
            date_display = appointment_date.strftime("%d/%m")

            appointments_data.append({
                "id": appt.id,
                "date": appt.date,
                "time": appt.time,
                "date_display": date_display,
                "doctor_name": doctor.name if doctor else "Tu doctor"
            })

        # Update session
        session = update_session(
            session, db,
            available_times=appointments_data
        )
        session = set_phase(session, "CANCELACION_SELECT", db)

        # Format message
        message = "Tus citas para cancelar:\n\n"

        for idx, appt_info in enumerate(appointments_data, 1):
            message += f"{idx}️⃣  {appt_info['date_display']} a las {appt_info['time']}\n"
            message += f"    Con: {appt_info['doctor_name']}\n\n"

        message += "📱 Responde con el número\n"
        message += "❌ O escribe 'cancelar' para salir"

        return (message, session)

    except Exception as e:
        logger.error(f"Error in cancelacion start: {str(e)}")
        return ("Error al procesar tu solicitud. Intenta de nuevo.", session)


def handle_cancelacion_appointment_selection(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    db: Session
) -> Tuple[str, WhatsAppSession, bool]:
    """
    Phase 2: User selects appointment to cancel - ask for confirmation.

    Args:
        session: WhatsAppSession object
        user_message: User's response
        empresa_id: Company ID
        db: Database session

    Returns:
        Tuple of (message, updated_session, success)
    """
    try:
        # Parse selection
        try:
            selection = int(user_message.strip())
        except ValueError:
            return ("Por favor, responde con un número válido.", session, False)

        # Get appointments from session
        available_appointments = session.available_times or []
        if not available_appointments or selection < 1 or selection > len(available_appointments):
            return ("❌ Selección inválida. Intenta de nuevo.", session, False)

        # Get selected appointment
        appointment_id = available_appointments[selection - 1].get("id")
        appointment = db.query(Cita).filter(Cita.id == appointment_id).first()

        if not appointment:
            return ("Cita no encontrada. Intenta de nuevo.", session, False)

        # Update session with appointment to cancel
        session = set_appointment_to_cancel(session, appointment_id, db)
        session = set_phase(session, "CANCELACION_CONFIRM", db)

        # Format confirmation message
        doctor = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
        appointment_date = datetime.strptime(appointment.date, "%Y-%m-%d")
        date_display = appointment_date.strftime("%d/%m/%Y")

        message = "⚠️  ¿Estás seguro de que deseas cancelar?\n\n"
        message += f"👨‍⚕️  Doctor: {doctor.name if doctor else 'Tu doctor'}\n"
        message += f"📅 Fecha: {date_display}\n"
        message += f"⏰ Hora: {appointment.time}\n\n"
        message += "Escribe 'sí' para confirmar la cancelación\n"
        message += "o 'no' para volver atrás"

        return (message, session, True)

    except Exception as e:
        logger.error(f"Error in appointment selection: {str(e)}")
        return ("Error al procesar tu selección. Intenta de nuevo.", session, False)


def handle_cancelacion_confirmation(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> Tuple[str, WhatsAppSession, bool]:
    """
    Phase 3: User confirms cancellation - cancel appointment.

    Args:
        session: WhatsAppSession object
        user_message: User's response
        empresa_id: Company ID
        caller_id: WhatsApp caller ID
        db: Database session

    Returns:
        Tuple of (message, updated_session, success)
    """
    try:
        # Check user's confirmation response
        confirmation = user_message.lower().strip()
        confirm_keywords = ["sí", "si", "yes", "yes", "confirmó", "confirmo", "ok", "okay"]
        cancel_keywords = ["no", "no", "cancel", "cancelar", "volver"]

        if cancel_keywords[0] in confirmation or any(k in confirmation for k in cancel_keywords):
            # User doesn't want to cancel
            message = "❌ Cancelación abortada.\n\n"
            message += "Escribe:\n"
            message += "  • 'reagendar' - para cambiar tu cita\n"
            message += "  • 'agendar' - para reservar otra cita"
            return (message, session, False)

        if not any(kw in confirmation for kw in confirm_keywords):
            message = "Por favor, escribe 'sí' para confirmar o 'no' para volver atrás"
            return (message, session, False)

        # Get appointment to cancel
        appointment = db.query(Cita).filter(
            Cita.id == session.appointment_to_cancel_id
        ).first()

        if not appointment:
            return ("Cita no encontrada. Intenta de nuevo.", session, False)

        # Cancel appointment
        appointment.status = AppointmentStatusEnum.cancelada
        db.commit()

        # Notify doctor
        notify_appointment_cancelled(
            appointment=appointment,
            db=db,
            doctor_id=appointment.doctor_id,
            empresa_id=empresa_id
        )

        # Format confirmation message
        message = "✅ ¡Tu cita ha sido cancelada!\n\n"
        message += "Lamentamos que no puedas asistir. 😢\n\n"
        message += "Si deseas:\n"
        message += "  • 'agendar' - para reservar una nueva cita\n"
        message += "  • 'contacto' - para hablar con nosotros"

        # Update session
        session = set_phase(session, "CANCELACION_COMPLETADA", db)

        # Clear session after success
        clear_session(caller_id, empresa_id, db)

        return (message, session, True)

    except Exception as e:
        logger.error(f"Error in confirmation: {str(e)}")
        return ("Error al cancelar tu cita. Intenta de nuevo.", session, False)


def handle_cancelacion_flow(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> Tuple[str, WhatsAppSession]:
    """
    Main handler for the complete cancellation flow.

    Args:
        session: WhatsAppSession object
        user_message: User's message
        empresa_id: Company ID
        caller_id: WhatsApp caller ID
        db: Database session

    Returns:
        Tuple of (message, updated_session)
    """
    current_phase = session.current_phase

    if current_phase == "CANCELACION_SELECT":
        message, session, _ = handle_cancelacion_appointment_selection(
            session, user_message, empresa_id, db
        )
        return (message, session)

    elif current_phase == "CANCELACION_CONFIRM":
        message, session, _ = handle_cancelacion_confirmation(
            session, user_message, empresa_id, caller_id, db
        )
        return (message, session)

    else:
        # Invalid phase, start over
        message, session = handle_cancelacion_start(
            session, empresa_id, caller_id, db
        )
        return (message, session)
