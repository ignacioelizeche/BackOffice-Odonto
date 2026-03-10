"""
Appointment Scheduler Service -  Multi-turn conversation handler for scheduling
Manages the flow: select doctor -> select date -> select time -> create appointment
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import Tuple, Optional, List, Dict, Any
from app.models import WhatsAppSession, Doctor, Cita, AppointmentStatusEnum
from app.utils.availability import (
    get_available_slots, validate_appointment_availability, get_date_name
)
from app.services.whatsapp_session_service import (
    get_session, update_session, set_phase, set_selected_doctor,
    set_selected_date, set_selected_time, set_available_doctors,
    set_available_times, set_patient_info, get_or_create_patient,
    clear_session
)
from app.services.notification_service import notify_appointment_created
import calendar

logger = logging.getLogger(__name__)


def handle_agendamiento_start(
    session: WhatsAppSession,
    empresa_id: int,
    db: Session
) -> Tuple[str, WhatsAppSession]:
    """
    Phase 1: Start appointment scheduling flow - show list of doctors.

    Args:
        session: WhatsAppSession object
        empresa_id: Company ID
        db: Database session

    Returns:
        Tuple of (message, updated_session)
    """
    try:
        # Get all active doctors for the company
        doctors = db.query(Doctor).filter(
            Doctor.empresa_id == empresa_id
        ).all()

        if not doctors:
            return ("No hay doctores disponibles en este momento. 😢", session)

        # Prepare doctor data for display
        doctors_data = [
            {
                "id": doctor.id,
                "name": doctor.name,
                "specialty": doctor.specialty or "Odontología General"
            }
            for doctor in doctors
        ]

        # Update session
        session = set_available_doctors(session, doctors_data, db)
        session = set_phase(session, "AGENDAMIENTO_DOCTOR", db)

        # Format message
        message = "¡Hola! 👋 Bienvenido a AgilDent\n\n"
        message += "Elige un doctor:\n"

        for idx, doctor_info in enumerate(doctors_data, 1):
            message += f"{idx}️⃣  {doctor_info['name']} - {doctor_info['specialty']}\n"

        message += "\n📱 Responde con el número (1, 2, 3...)\n"
        message += "❌ O escribe 'cancelar' para salir"

        return (message, session)

    except Exception as e:
        logger.error(f"Error in agendamiento start: {str(e)}")
        return ("Error al procesar tu solicitud. Intenta de nuevo.", session)


def handle_agendamiento_doctor_selection(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    db: Session
) -> Tuple[str, WhatsAppSession, bool]:
    """
    Phase 2: User selects a doctor - show available dates.

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

        # Get available doctors from session
        available_doctors = session.available_doctors or []
        if not available_doctors or selection < 1 or selection > len(available_doctors):
            return ("❌ Selección inválida. Intenta de nuevo.", session, False)

        # Get selected doctor
        doctor_id = available_doctors[selection - 1].get("id")
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()

        if not doctor:
            return ("Doctor no encontrado. Intenta de nuevo.", session, False)

        # Update session
        session = set_selected_doctor(session, doctor_id, db)
        session = set_phase(session, "AGENDAMIENTO_DATE", db)

        # Generate available dates (next 7 days)
        dates_data = []
        today = datetime.now().date()

        for i in range(1, 8):  # Next 7 days
            date = today + timedelta(days=i)
            day_name = _get_spanish_day_name(date)
            dates_data.append({
                "date": date.strftime("%d/%m"),
                "day_name": day_name,
                "full_date": date.strftime("%Y-%m-%d")
            })

        # Update session with available dates
        session = update_session(
            session, db,
            available_times=dates_data
        )

        # Format message
        message = f"✅ Excelente, con {doctor.name}\n\n"
        message += "¿Qué día te viene bien?\n\n"

        for idx, date_info in enumerate(dates_data, 1):
            message += f"{idx}️⃣  {date_info['date']} ({date_info['day_name']})\n"

        message += "\n📱 Responde con el número\n"
        message += "⬅️  O escribe 'atrás' para cambiar doctor"

        return (message, session, True)

    except Exception as e:
        logger.error(f"Error in doctor selection: {str(e)}")
        return ("Error al procesar tu selección. Intenta de nuevo.", session, False)


def handle_agendamiento_date_selection(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    db: Session
) -> Tuple[str, WhatsAppSession, bool]:
    """
    Phase 3: User selects a date - show available times for that date.

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

        # Get available time slots for the selected date and doctor
        doctor_id = session.selected_doctor_id
        available_slots = get_available_slots(doctor_id, selected_date_full, db)

        if not available_slots:
            return ("❌ No hay horarios disponibles para ese día. Elige otra fecha.", session, False)

        # Update session
        session = set_selected_date(session, selected_date_full, db)
        session = set_available_times(session, available_slots, db)
        session = set_phase(session, "AGENDAMIENTO_TIME", db)

        # Format message
        message = f"📅 Perfecto, {selected_date_display}\n\n"
        message += "¿Qué hora prefieres?\n\n"

        for idx, time_slot in enumerate(available_slots, 1):
            message += f"{idx}️⃣  {time_slot}\n"

        message += "\n📱 Responde con el número\n"
        message += "⬅️  O escribe 'atrás' para cambiar fecha"

        return (message, session, True)

    except Exception as e:
        logger.error(f"Error in date selection: {str(e)}")
        return ("Error al procesar tu selección. Intenta de nuevo.", session, False)


def handle_agendamiento_time_selection(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> Tuple[str, WhatsAppSession, bool]:
    """
    Phase 4: User selects a time - create appointment.

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

        # Validate availability one more time
        doctor_id = session.selected_doctor_id
        date_str = session.selected_date

        is_available, reason = validate_appointment_availability(
            doctor_id=doctor_id,
            date=date_str,
            time=selected_time,
            duration="30 min",
            db=db
        )

        if not is_available:
            return (f"❌ {reason or 'Ese horario no está disponible'}. Intenta de nuevo.", session, False)

        # Get or create patient
        patient = get_or_create_patient(
            caller_id=caller_id,
            empresa_id=empresa_id,
            db=db
        )

        # Create appointment
        appointment = Cita(
            empresa_id=empresa_id,
            patient_id=patient.id,
            doctor_id=doctor_id,
            date=date_str,
            time=selected_time,
            duration="30 min",
            status=AppointmentStatusEnum.pendiente,
            treatment="Consulta General",
            cost=0.0
        )

        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        # Update patient last WhatsApp contact
        patient.last_whatsapp_contact = datetime.now()
        db.commit()

        # Notify doctor
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if doctor:
            notify_appointment_created(
                appointment=appointment,
                db=db,
                doctor_id=doctor_id,
                empresa_id=empresa_id
            )

        # Update session
        session = set_selected_time(session, selected_time, db)
        session = set_patient_info(session, patient_id=patient.id, db=db)
        session = set_phase(session, "AGENDAMIENTO_COMPLETADO", db)

        # Format confirmation message
        date_display = datetime.strptime(date_str, "%Y-%m-%d").strftime("%d/%m/%Y")
        message = "✅ ¡Cita agendada exitosamente!\n\n"
        message += f"📋 ID: #{appointment.id}\n"
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
        return ("Error al crear tu cita. Intenta de nuevo.", session, False)


def handle_agendamiento_flow(
    session: WhatsAppSession,
    user_message: str,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> Tuple[str, WhatsAppSession]:
    """
    Main handler for the complete agendamiento flow.

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

    if current_phase == "AGENDAMIENTO_DOCTOR":
        message, session = handle_agendamiento_doctor_selection(
            session, user_message, empresa_id, db
        )
        return (message, session)

    elif current_phase == "AGENDAMIENTO_DATE":
        message, session, _ = handle_agendamiento_date_selection(
            session, user_message, empresa_id, db
        )
        return (message, session)

    elif current_phase == "AGENDAMIENTO_TIME":
        message, session, _ = handle_agendamiento_time_selection(
            session, user_message, empresa_id, caller_id, db
        )
        return (message, session)

    else:
        # Invalid phase
        message, session = handle_agendamiento_start(session, empresa_id, db)
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
