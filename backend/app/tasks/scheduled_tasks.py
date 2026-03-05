"""
Scheduled tasks using APScheduler
Handles background jobs like appointment reminders
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Cita, Doctor, AppointmentStatusEnum, Notificacion
from app.services.notification_service import notify_appointment_reminder
import logging

logger = logging.getLogger(__name__)


def check_upcoming_appointments():
    """
    Check for appointments in the next 30 minutes and send reminders
    Runs every 5 minutes
    """
    db = SessionLocal()
    try:
        now = datetime.now()
        thirty_min_later = now + timedelta(minutes=30)

        current_date = now.strftime("%Y-%m-%d")
        current_time = now.strftime("%H:%M")
        thirty_min_time = thirty_min_later.strftime("%H:%M")

        # Find appointments in the next 30 minutes
        upcoming_appointments = db.query(Cita).filter(
            Cita.date == current_date,
            Cita.time >= current_time,
            Cita.time <= thirty_min_time,
            Cita.status != AppointmentStatusEnum.cancelada,
            Cita.status != AppointmentStatusEnum.completada
        ).all()

        if upcoming_appointments:
            logger.info(f"[Scheduler] Found {len(upcoming_appointments)} upcoming appointments")

        for cita in upcoming_appointments:
            # Check if reminder already exists for this appointment
            existing_notification = db.query(Notificacion).filter(
                Notificacion.appointment_id == cita.id,
                Notificacion.type == "appointment_reminder_30m"
            ).first()

            if not existing_notification:
                # Get doctor information
                doctor = db.query(Doctor).filter(Doctor.id == cita.doctor_id).first()
                if doctor:
                    try:
                        notify_appointment_reminder(db, cita, doctor)
                        logger.info(f"[Scheduler] Created reminder notification for appointment {cita.id}")
                    except Exception as e:
                        logger.error(f"[Scheduler] Error creating reminder for appointment {cita.id}: {e}")
                else:
                    logger.warning(f"[Scheduler] Doctor not found for appointment {cita.id}")
            else:
                logger.debug(f"[Scheduler] Reminder already exists for appointment {cita.id}")

    except Exception as e:
        logger.error(f"[Scheduler] Error in check_upcoming_appointments: {e}")
    finally:
        db.close()


def init_scheduler(app=None):
    """
    Initialize the background scheduler
    Should be called on application startup

    Args:
        app: FastAPI application (optional, for reference)
    """
    try:
        scheduler = BackgroundScheduler()

        # Add job to check upcoming appointments every 5 minutes
        scheduler.add_job(
            check_upcoming_appointments,
            trigger=IntervalTrigger(minutes=5),
            id='check_upcoming_appointments',
            name='Check for upcoming appointments and send reminders',
            replace_existing=True,
            max_instances=1  # Ensure only one instance runs at a time
        )

        scheduler.start()
        logger.info("[Scheduler] Scheduler initialized and started successfully")
        return scheduler

    except Exception as e:
        logger.error(f"[Scheduler] Error initializing scheduler: {e}")
        raise


def shutdown_scheduler():
    """
    Shutdown the background scheduler
    Should be called on application shutdown
    """
    try:
        # APScheduler will be shut down via the FastAPI shutdown event handlers
        logger.info("[Scheduler] Scheduler shutdown event triggered")
    except Exception as e:
        logger.error(f"[Scheduler] Error shutting down scheduler: {e}")
