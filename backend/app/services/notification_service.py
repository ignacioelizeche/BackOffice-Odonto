"""
Notification service for creating and managing notifications
"""

from sqlalchemy.orm import Session
from app.models import Notificacion, ConfiguracionNotificaciones
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    empresa_id: int,
    type: str,
    title: str,
    message: str,
    user_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    appointment_id: Optional[int] = None,
    send_email: bool = True
) -> Notificacion:
    """
    Create a notification in the database
    If send_email=True and the notification type is enabled in configuration, sends email

    Args:
        db: Database session
        empresa_id: Company ID (multi-tenant)
        type: Notification type (e.g., 'appointment_scheduled')
        title: Short notification title
        message: Full notification message
        user_id: Optional user ID for recipients
        doctor_id: Optional doctor ID (for doctor-specific notifications)
        patient_id: Optional patient ID (for context)
        appointment_id: Optional appointment ID (for context)
        send_email: Whether to send email if configured

    Returns:
        Created Notificacion object
    """
    notification = Notificacion(
        empresa_id=empresa_id,
        user_id=user_id,
        doctor_id=doctor_id,
        patient_id=patient_id,
        appointment_id=appointment_id,
        type=type,
        title=title,
        message=message,
        read=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    logger.info(
        f"[Notification] Created {type} notification for "
        f"doctor_id={doctor_id}, user_id={user_id}, equation_id={appointment_id}"
    )

    # TODO: If send_email=True, check configuration and send email
    # This will be integrated with the email service later

    return notification


def notify_appointment_created(
    db: Session,
    cita,  # Cita model
    doctor,  # Doctor model
    paciente  # Paciente model
) -> Optional[Notificacion]:
    """
    Trigger: when a new appointment is created
    Notifies the doctor about the new appointment

    Args:
        db: Database session
        cita: Appointment object
        doctor: Doctor object
        paciente: Patient object

    Returns:
        Created notification or None if failed
    """
    try:
        notification = create_notification(
            db=db,
            empresa_id=doctor.empresa_id,
            type="appointment_scheduled",
            title="Nueva cita agendada",
            message=f"Nueva cita con {paciente.name} el {cita.date} a las {cita.time}",
            doctor_id=doctor.id,
            appointment_id=cita.id,
            user_id=None,
            send_email=True
        )
        return notification
    except Exception as e:
        logger.error(f"Error creating appointment notification: {e}")
        return None


def notify_new_patient_assigned(
    db: Session,
    paciente,  # Paciente model
    doctor  # Doctor model
) -> Optional[Notificacion]:
    """
    Trigger: when a new patient is assigned to a doctor
    Notifies the doctor about the new patient

    Args:
        db: Database session
        paciente: Patient object
        doctor: Doctor object

    Returns:
        Created notification or None if failed
    """
    try:
        notification = create_notification(
            db=db,
            empresa_id=doctor.empresa_id,
            type="new_patient_assigned",
            title="Nuevo paciente asignado",
            message=f"Nuevo paciente: {paciente.name} ({paciente.email})",
            doctor_id=doctor.id,
            patient_id=paciente.id,
            send_email=True
        )
        return notification
    except Exception as e:
        logger.error(f"Error creating new patient notification: {e}")
        return None


def notify_appointment_reminder(
    db: Session,
    cita,  # Cita model
    doctor  # Doctor model
) -> Optional[Notificacion]:
    """
    Trigger: 30 minutes before appointment
    Reminds the doctor about upcoming appointment

    Args:
        db: Database session
        cita: Appointment object
        doctor: Doctor object

    Returns:
        Created notification or None if failed
    """
    try:
        # Check if reminder already exists for this appointment
        existing = db.query(Notificacion).filter(
            Notificacion.appointment_id == cita.id,
            Notificacion.type == "appointment_reminder_30m"
        ).first()

        if existing:
            logger.info(f"Reminder already exists for appointment {cita.id}")
            return existing

        notification = create_notification(
            db=db,
            empresa_id=doctor.empresa_id,
            type="appointment_reminder_30m",
            title="Recordatorio de cita",
            message=f"Tienes una cita en 30 minutos con {cita.paciente.name if cita.paciente else 'Paciente'}",
            doctor_id=doctor.id,
            appointment_id=cita.id,
            send_email=True
        )
        return notification
    except Exception as e:
        logger.error(f"Error creating appointment reminder notification: {e}")
        return None


def notify_appointment_started(
    db: Session,
    cita,  # Cita model
    doctor  # Doctor model
) -> Optional[Notificacion]:
    """
    Trigger: when appointment status changes to 'confirmada'
    Notifies the doctor that the appointment is now active

    Args:
        db: Database session
        cita: Appointment object
        doctor: Doctor model object

    Returns:
        Created notification or None if failed
    """
    try:
        notification = create_notification(
            db=db,
            empresa_id=doctor.empresa_id,
            type="appointment_started",
            title="Cita iniciada",
            message=f"Cita iniciada con {cita.paciente.name if cita.paciente else 'Paciente'}",
            doctor_id=doctor.id,
            appointment_id=cita.id,
            send_email=False  # Don't send email for started appointments
        )
        return notification
    except Exception as e:
        logger.error(f"Error creating appointment started notification: {e}")
        return None


def notify_appointment_completed(
    db: Session,
    cita,  # Cita model
    doctor  # Doctor model
) -> Optional[Notificacion]:
    """
    Trigger: when appointment status changes to 'completada'
    Notifies the doctor that the appointment is completed

    Args:
        db: Database session
        cita: Appointment object
        doctor: Doctor model object

    Returns:
        Created notification or None if failed
    """
    try:
        notification = create_notification(
            db=db,
            empresa_id=doctor.empresa_id,
            type="appointment_completed",
            title="Cita completada",
            message=f"Cita completada con {cita.paciente.name if cita.paciente else 'Paciente'}",
            doctor_id=doctor.id,
            appointment_id=cita.id,
            send_email=False  # Don't send email
        )
        return notification
    except Exception as e:
        logger.error(f"Error creating appointment completed notification: {e}")
        return None


def notify_appointment_cancelled(
    db: Session,
    cita,  # Cita model
    doctor  # Doctor model
) -> Optional[Notificacion]:
    """
    Trigger: when appointment status changes to 'cancelada'
    Notifies the doctor that the appointment is cancelled

    Args:
        db: Database session
        cita: Appointment object
        doctor: Doctor model object

    Returns:
        Created notification or None if failed
    """
    try:
        notification = create_notification(
            db=db,
            empresa_id=doctor.empresa_id,
            type="appointment_cancelled",
            title="Cita cancelada",
            message=f"Cita cancelada con {cita.paciente.name if cita.paciente else 'Paciente'} el {cita.date}",
            doctor_id=doctor.id,
            appointment_id=cita.id,
            send_email=False  # Don't send email
        )
        return notification
    except Exception as e:
        logger.error(f"Error creating appointment cancelled notification: {e}")
        return None
