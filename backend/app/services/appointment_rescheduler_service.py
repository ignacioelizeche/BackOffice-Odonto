"""
Appointment Rescheduler Service - Multi-turn conversation for rescheduling
Manages the flow: select appointment -> select new date -> select new time -> update appointment
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import Tuple, Optional
from app.models import WhatsAppSession, Cita, AppointmentStatusEnum, Doctor, Paciente
from app.utils.availability import get_available_slots, validate_appointment_availability
from app.services.whatsapp_session_service import (
    get_session, update_session, set_phase, set_selected_date, set_selected_time,
    set_appointment_to_reschedule, set_available_times, clear_session,
    get_patient_by_whatsapp
)
from app.services.notification_service import notify_appointment_created
from sqlalchemy import and_

logger = logging.getLogger(__name__)


def handle_reagendamiento_start(
    session: WhatsAppSession,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> Tuple[str, WhatsAppSession]:
    """
    Phase 1: Start rescheduling - show patient's pending appointments.

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
                "No tienes citas para reagendar. 😊\n\n"
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
        session = set_phase(session, "REAGENDAMIENTO_SELECT", db)

        # Format message
        message = "Tus citas para reagendar:\n\n"

        for idx, appt_info in enumerate(appointments_data, 1):
            message += f"{idx}️⃣  {appt_info['date_display']} a las {appt_info['time']}\n"
            message += f"    Con: {appt_info['doctor_name']}\n\n"

        message += "📱 Responde con el número\n"
        message += "❌ O escribe 'cancelar' para salir"

        return (message, session)

    except Exception as e:
        logger.error(f"Error in reagendamiento start: {str(e)}")
        return ("Error al procesar tu solicitud. Intenta de nuevo.", session)


def handle_reagendamiento_appointment_selection(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    db: Session
) -> Tuple[str, WhatsAppSession, bool]:
    """
    Phase 2: User selects appointment to reschedule - show available dates.

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

        # Update session with appointment to reschedule
        session = set_appointment_to_reschedule(session, appointment_id, db)
        session = set_phase(session, "REAGENDAMIENTO_DATE", db)

        # Generate available dates (next 7 days)
        dates_data = []
        today = datetime.now().date()

        for i in range(1, 8):
            date = today + timedelta(days=i)
            day_name = _get_spanish_day_name(date)
            dates_data.append({
                "date": date.strftime("%d/%m"),
                "day_name": day_name,
                "full_date": date.strftime("%Y-%m-%d")
            })

        # Update session
        session = update_session(session, db, available_times=dates_data)

        # Format message
        message = "¿Qué día te viene mejor para la nueva cita?\n\n"

        for idx, date_info in enumerate(dates_data, 1):
            message += f"{idx}️⃣  {date_info['date']} ({date_info['day_name']})\n"

        message += "\n📱 Responde con el número"

        return (message, session, True)

    except Exception as e:
        logger.error(f"Error in appointment selection: {str(e)}")
        return ("Error al procesar tu selección. Intenta de nuevo.", session, False)


def handle_reagendamiento_date_selection(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    db: Session
) -> Tuple[str, WhatsAppSession, bool]:
    """
    Phase 3: User selects new date - show available times.

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

        # Get available dates from session
        available_dates = session.available_times or []
        if not available_dates or selection < 1 or selection > len(available_dates):
            return ("❌ Fecha inválida. Intenta de nuevo.", session, False)

        # Get selected date
        selected_date_full = available_dates[selection - 1].get("full_date")
        selected_date_display = available_dates[selection - 1].get("date")

        # Get original appointment to know the doctor
        appointment = db.query(Cita).filter(
            Cita.id == session.appointment_to_reschedule_id
        ).first()

        if not appointment:
            return ("Cita no encontrada. Intenta de nuevo.", session, False)

        # Get available time slots for the selected date
        available_slots = get_available_slots(
            appointment.doctor_id,
            selected_date_full,
            db
        )

        if not available_slots:
            return ("❌ No hay horarios disponibles ese día. Elige otra fecha.", session, False)

        # Update session
        session = set_selected_date(session, selected_date_full, db)
        session = update_session(session, db, available_times=available_slots)
        session = set_phase(session, "REAGENDAMIENTO_TIME", db)

        # Format message
        message = f"📅 Perfecto, {selected_date_display}\n\n"
        message += "¿Qué hora prefieres?\n\n"

        for idx, time_slot in enumerate(available_slots, 1):
            message += f"{idx}️⃣  {time_slot}\n"

        message += "\n📱 Responde con el número"

        return (message, session, True)

    except Exception as e:
        logger.error(f"Error in date selection: {str(e)}")
        return ("Error al procesar tu selección. Intenta de nuevo.", session, False)


def handle_reagendamiento_time_selection(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> Tuple[str, WhatsAppSession, bool]:
    """
    Phase 4: User selects new time - update appointment.

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
        # Parse selection
        try:
            selection = int(user_message.strip())
        except ValueError:
            return ("Por favor, responde con un número válido.", session, False)

        # Get available times from session
        available_times = session.available_times or []
        if not available_times or selection < 1 or selection > len(available_times):
            return ("❌ Hora inválida. Intenta de nuevo.", session, False)

        selected_time = available_times[selection - 1]

        # Get appointment to update
        appointment = db.query(Cita).filter(
            Cita.id == session.appointment_to_reschedule_id
        ).first()

        if not appointment:
            return ("Cita no encontrada. Intenta de nuevo.", session, False)

        # Validate new availability
        is_available, reason = validate_appointment_availability(
            doctor_id=appointment.doctor_id,
            date=session.selected_date,
            time=selected_time,
            duration="30 min",
            db=db,
            exclude_appointment_id=appointment.id  # Exclude current appointment
        )

        if not is_available:
            return (f"❌ {reason or 'Ese horario no está disponible'}. Intenta de nuevo.", session, False)

        # Update appointment
        appointment.date = session.selected_date
        appointment.time = selected_time
        db.commit()

        # Notify doctor
        doctor = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
        patient = db.query(Paciente).filter(Paciente.id == appointment.patient_id).first()
        if doctor and patient:
            notify_appointment_created(db, appointment, doctor, patient)
        date_display = datetime.strptime(session.selected_date, "%Y-%m-%d").strftime("%d/%m/%Y")

        message = "✅ ¡Cita reagendada exitosamente!\n\n"
        message += f"👨‍⚕️  Doctor: {doctor.name if doctor else 'Tu doctor'}\n"
        message += f"📅 Fecha: {date_display}\n"
        message += f"⏰ Hora: {selected_time}\n\n"
        message += "⏬ Recuerda llegar con 10 minutos de anticipación.\n\n"
        message += "📝 Escribe:\n"
        message += "  • 'reagendar' - para cambiar tu cita\n"
        message += "  • 'cancelar' - para eliminar tu cita\n"
        message += "  • 'agendar' - para reservar otra cita"

        # Clear session after success
        clear_session(caller_id, empresa_id, db)

        return (message, session, True)

    except Exception as e:
        logger.error(f"Error in time selection: {str(e)}")
        return ("Error al actualizar tu cita. Intenta de nuevo.", session, False)


def handle_reagendamiento_flow(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> Tuple[str, WhatsAppSession]:
    """
    Main handler for the complete rescheduling flow.

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

    if current_phase == "REAGENDAMIENTO_SELECT":
        message, session, _ = handle_reagendamiento_appointment_selection(
            session, user_message, empresa_id, db
        )
        return (message, session)

    elif current_phase == "REAGENDAMIENTO_DATE":
        message, session, _ = handle_reagendamiento_date_selection(
            session, user_message, empresa_id, db
        )
        return (message, session)

    elif current_phase == "REAGENDAMIENTO_TIME":
        message, session, _ = handle_reagendamiento_time_selection(
            session, user_message, empresa_id, caller_id, db
        )
        return (message, session)

    else:
        # Invalid phase, start over
        message, session = handle_reagendamiento_start(
            session, empresa_id, caller_id, db
        )
        return (message, session)


def _get_spanish_day_name(date) -> str:
    """Get Spanish day name from date."""
    spanish_days = {
        0: "Lunes",
        1: "Martes",
        2: "Miércoles",
        3: "Jueves",
        4: "Viernes",
        5: "Sábado",
        6: "Domingo"
    }
    return spanish_days.get(date.weekday(), "Día")
