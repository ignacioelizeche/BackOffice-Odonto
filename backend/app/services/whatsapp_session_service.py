"""
WhatsApp Session Service - Manage conversation state
Handles creation, retrieval, and cleanup of WhatsApp sessions
"""

import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from app.models import WhatsAppSession, Paciente
from app.config import settings

logger = logging.getLogger(__name__)

SESSION_EXPIRE_HOURS = settings.WHATSAPP_SESSION_EXPIRE_HOURS


def get_or_create_session(
    caller_id: str,
    empresa_id: int,
    db: Session,
    session_type: str = "idle"
) -> WhatsAppSession:
    """
    Get existing session or create a new one.

    Args:
        caller_id: WhatsApp phone number
        empresa_id: Company ID
        db: Database session
        session_type: Type of session (idle, agendamiento, etc)

    Returns:
        WhatsAppSession object
    """
    try:
        # Try to get existing session
        session = db.query(WhatsAppSession).filter(
            (WhatsAppSession.empresa_id == empresa_id) &
            (WhatsAppSession.caller_id == caller_id)
        ).first()

        if session:
            # Update last_message_at and extend expiration
            session.last_message_at = datetime.now(timezone.utc)
            session.expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRE_HOURS)
            db.commit()
            return session

        # Create new session
        expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRE_HOURS)
        session = WhatsAppSession(
            empresa_id=empresa_id,
            caller_id=caller_id,
            current_phase=session_type,
            expires_at=expires_at
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    except IntegrityError:
        # Unique constraint violation - session already exists
        db.rollback()
        return db.query(WhatsAppSession).filter(
            (WhatsAppSession.empresa_id == empresa_id) &
            (WhatsAppSession.caller_id == caller_id)
        ).first()
    except Exception as e:
        logger.error(f"Error getting or creating session: {str(e)}")
        db.rollback()
        raise


def get_session(
    caller_id: str,
    empresa_id: int,
    db: Session
) -> Optional[WhatsAppSession]:
    """
    Get an existing session if it exists and is not expired.

    Args:
        caller_id: WhatsApp phone number
        empresa_id: Company ID
        db: Database session

    Returns:
        WhatsAppSession if exists, None otherwise
    """
    try:
        session = db.query(WhatsAppSession).filter(
            (WhatsAppSession.empresa_id == empresa_id) &
            (WhatsAppSession.caller_id == caller_id) &
            (WhatsAppSession.expires_at > datetime.now(timezone.utc))
        ).first()
        return session
    except Exception as e:
        logger.error(f"Error getting session: {str(e)}")
        return None


def update_session(
    session: WhatsAppSession,
    db: Session,
    **kwargs
) -> WhatsAppSession:
    """
    Update session fields and extend expiration.

    Args:
        session: WhatsAppSession object to update
        db: Database session
        **kwargs: Fields to update

    Returns:
        Updated WhatsAppSession
    """
    try:
        # Update fields
        for field, value in kwargs.items():
            if hasattr(session, field):
                setattr(session, field, value)

        # Update timestamps
        session.last_message_at = datetime.now(timezone.utc)
        session.updated_at = datetime.now(timezone.utc)
        session.expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRE_HOURS)

        db.commit()
        db.refresh(session)
        return session

    except Exception as e:
        logger.error(f"Error updating session: {str(e)}")
        db.rollback()
        raise


def set_phase(
    session: WhatsAppSession,
    phase: str,
    db: Session
) -> WhatsAppSession:
    """
    Set the current phase of the conversation.

    Args:
        session: WhatsAppSession object
        phase: Phase name
        db: Database session

    Returns:
        Updated WhatsAppSession
    """
    return update_session(session, db, current_phase=phase)


def set_selected_doctor(
    session: WhatsAppSession,
    doctor_id: int,
    db: Session
) -> WhatsAppSession:
    """
    Set the selected doctor.

    Args:
        session: WhatsAppSession object
        doctor_id: Doctor ID
        db: Database session

    Returns:
        Updated WhatsAppSession
    """
    return update_session(session, db, selected_doctor_id=doctor_id)


def set_selected_date(
    session: WhatsAppSession,
    date: str,
    db: Session
) -> WhatsAppSession:
    """
    Set the selected date.

    Args:
        session: WhatsAppSession object
        date: Date string (YYYY-MM-DD)
        db: Database session

    Returns:
        Updated WhatsAppSession
    """
    return update_session(session, db, selected_date=date)


def set_selected_time(
    session: WhatsAppSession,
    time: str,
    db: Session
) -> WhatsAppSession:
    """
    Set the selected time.

    Args:
        session: WhatsAppSession object
        time: Time string (HH:MM)
        db: Database session

    Returns:
        Updated WhatsAppSession
    """
    return update_session(session, db, selected_time=time)


def set_available_doctors(
    session: WhatsAppSession,
    doctors: List[dict],
    db: Session
) -> WhatsAppSession:
    """
    Set available doctors list.

    Args:
        session: WhatsAppSession object
        doctors: List of doctor dictionaries
        db: Database session

    Returns:
        Updated WhatsAppSession
    """
    return update_session(session, db, available_doctors=doctors)


def set_available_times(
    session: WhatsAppSession,
    times: List[str],
    db: Session
) -> WhatsAppSession:
    """
    Set available times list.

    Args:
        session: WhatsAppSession object
        times: List of time strings
        db: Database session

    Returns:
        Updated WhatsAppSession
    """
    return update_session(session, db, available_times=times)


def set_appointment_to_reschedule(
    session: WhatsAppSession,
    appointment_id: int,
    db: Session
) -> WhatsAppSession:
    """
    Set the appointment to reschedule.

    Args:
        session: WhatsAppSession object
        appointment_id: Appointment ID
        db: Database session

    Returns:
        Updated WhatsAppSession
    """
    return update_session(session, db, appointment_to_reschedule_id=appointment_id)


def set_appointment_to_cancel(
    session: WhatsAppSession,
    appointment_id: int,
    db: Session
) -> WhatsAppSession:
    """
    Set the appointment to cancel.

    Args:
        session: WhatsAppSession object
        appointment_id: Appointment ID
        db: Database session

    Returns:
        Updated WhatsAppSession
    """
    return update_session(session, db, appointment_to_cancel_id=appointment_id)


def set_patient_info(
    session: WhatsAppSession,
    patient_id: Optional[int] = None,
    patient_name: Optional[str] = None,
    patient_phone: Optional[str] = None,
    db: Session = None
) -> WhatsAppSession:
    """
    Set patient information.

    Args:
        session: WhatsAppSession object
        patient_id: Patient ID
        patient_name: Patient name
        patient_phone: Patient phone
        db: Database session

    Returns:
        Updated WhatsAppSession
    """
    kwargs = {}
    if patient_id is not None:
        kwargs['patient_id'] = patient_id
    if patient_name is not None:
        kwargs['patient_name'] = patient_name
    if patient_phone is not None:
        kwargs['patient_phone'] = patient_phone

    return update_session(session, db, **kwargs)


def clear_session(
    caller_id: str,
    empresa_id: int,
    db: Session
) -> bool:
    """
    Delete a session.

    Args:
        caller_id: WhatsApp phone number
        empresa_id: Company ID
        db: Database session

    Returns:
        True if deleted, False otherwise
    """
    try:
        session = db.query(WhatsAppSession).filter(
            (WhatsAppSession.empresa_id == empresa_id) &
            (WhatsAppSession.caller_id == caller_id)
        ).first()

        if session:
            db.delete(session)
            db.commit()
            return True

        return False

    except Exception as e:
        logger.error(f"Error clearing session: {str(e)}")
        db.rollback()
        return False


def cleanup_expired_sessions(db: Session) -> int:
    """
    Delete all expired sessions.

    Args:
        db: Database session

    Returns:
        Number of sessions deleted
    """
    try:
        now = datetime.now(timezone.utc)
        expired_sessions = db.query(WhatsAppSession).filter(
            WhatsAppSession.expires_at <= now
        ).all()

        count = len(expired_sessions)

        if count > 0:
            db.query(WhatsAppSession).filter(
                WhatsAppSession.expires_at <= now
            ).delete()
            db.commit()
            logger.info(f"Cleaned up {count} expired WhatsApp sessions")

        return count

    except Exception as e:
        logger.error(f"Error cleaning up expired sessions: {str(e)}")
        db.rollback()
        return 0


def get_patient_by_whatsapp(
    caller_id: str,
    empresa_id: int,
    db: Session
) -> Optional[Paciente]:
    """
    Get patient by WhatsApp number.

    Args:
        caller_id: WhatsApp phone number
        empresa_id: Company ID
        db: Database session

    Returns:
        Paciente object if found, None otherwise
    """
    try:
        patient = db.query(Paciente).filter(
            (Paciente.empresa_id == empresa_id) &
            ((Paciente.whatsapp_phone == caller_id) | (Paciente.phone == caller_id))
        ).first()
        return patient
    except Exception as e:
        logger.error(f"Error getting patient by WhatsApp: {str(e)}")
        return None


def get_or_create_patient(
    caller_id: str,
    empresa_id: int,
    patient_name: Optional[str] = None,
    db: Session = None
) -> Paciente:
    """
    Get existing patient or create a new one.

    Args:
        caller_id: WhatsApp phone number
        empresa_id: Company ID
        patient_name: Patient name (if creating new)
        db: Database session

    Returns:
        Paciente object
    """
    try:
        # Try to find existing patient
        patient = get_patient_by_whatsapp(caller_id, empresa_id, db)

        if patient:
            # Update last WhatsApp contact
            patient.last_whatsapp_contact = datetime.now(timezone.utc)
            db.commit()
            return patient

        # Create new patient
        from app.models import PatientStatusEnum
        patient = Paciente(
            empresa_id=empresa_id,
            name=patient_name or f"Cliente {caller_id[-4:]}",
            phone=caller_id,
            whatsapp_phone=caller_id,
            status=PatientStatusEnum.nuevo,
            last_whatsapp_contact=datetime.now(timezone.utc)
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient

    except Exception as e:
        logger.error(f"Error getting or creating patient: {str(e)}")
        db.rollback()
        raise
