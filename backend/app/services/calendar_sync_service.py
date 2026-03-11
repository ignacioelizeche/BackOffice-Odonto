"""
Calendar Sync Service
Handles bidirectional synchronization between Google Calendar and the application database
"""

import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Cita, Doctor, AppointmentStatusEnum
from app.services.google_calendar_service import google_calendar_service
from app.database import SessionLocal

logger = logging.getLogger(__name__)


class CalendarSyncService:
    """Service for bidirectional calendar synchronization"""

    @staticmethod
    def sync_doctor_calendar(db: Session, doctor: Doctor) -> dict:
        """
        Sync a doctor's Google Calendar with the application database

        Args:
            db: Database session
            doctor: Doctor object with google_calendar_id

        Returns:
            Dictionary with sync statistics
        """
        if not doctor.google_calendar_id or not doctor.calendar_sync_enabled:
            logger.debug(f"Skipping sync for doctor {doctor.id} - calendar not configured or disabled")
            return {
                "doctor_id": doctor.id,
                "success": False,
                "reason": "Calendar not configured or disabled"
            }

        try:
            logger.info(f"Starting calendar sync for doctor {doctor.id} ({doctor.name})")

            # Get changes from Google Calendar
            calendar_data = google_calendar_service.get_calendar_changes(
                doctor.google_calendar_id,
                sync_token=None
            )

            if not calendar_data:
                logger.error(f"Failed to get calendar data for doctor {doctor.id}")
                return {
                    "doctor_id": doctor.id,
                    "success": False,
                    "reason": "Failed to fetch calendar data"
                }

            events = calendar_data.get('items', [])
            stats = {
                "doctor_id": doctor.id,
                "success": True,
                "events_processed": 0,
                "appointments_cancelled": 0,
                "appointments_updated": 0,
                "errors": []
            }

            for event in events:
                try:
                    CalendarSyncService._process_calendar_event(db, doctor, event, stats)
                except Exception as e:
                    error_msg = f"Error processing event {event.get('id')}: {str(e)}"
                    logger.error(error_msg)
                    stats["errors"].append(error_msg)

            db.commit()
            logger.info(f"Completed sync for doctor {doctor.id}: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Error syncing calendar for doctor {doctor.id}: {str(e)}")
            return {
                "doctor_id": doctor.id,
                "success": False,
                "reason": str(e)
            }

    @staticmethod
    def _process_calendar_event(db: Session, doctor: Doctor, event: dict, stats: dict):
        """
        Process a single Google Calendar event and sync with database

        Logic:
        - If event is deleted in Google Calendar → cancel appointment in app
        - If event is modified in Google Calendar → update appointment in app
        - Create new appointments for untracked events (optional)

        Args:
            db: Database session
            doctor: Doctor object
            event: Google Calendar event data
            stats: Statistics dictionary to update
        """
        event_id = event.get('id')
        event_status = event.get('status')  # 'confirmed' or 'cancelled'

        # Find appointment with this event_id
        appointment = db.query(Cita).filter(
            Cita.google_calendar_event_id == event_id,
            Cita.doctor_id == doctor.id
        ).first()

        if not appointment:
            logger.debug(f"No appointment found for event {event_id}, skipping")
            return

        stats["events_processed"] += 1

        # If event is deleted in Google Calendar
        if event_status == 'cancelled':
            if appointment.status != AppointmentStatusEnum.cancelada:
                appointment.status = AppointmentStatusEnum.cancelada
                logger.info(f"Cancelled appointment {appointment.id} - event deleted in Google Calendar")
                stats["appointments_cancelled"] += 1
            return

        # If event is confirmed/modified in Google Calendar
        if event_status == 'confirmed':
            # Extract event time information
            start = event.get('start', {})
            end = event.get('end', {})

            start_time = start.get('dateTime') or start.get('date')
            end_time = end.get('dateTime') or end.get('date')

            if not start_time or not end_time:
                logger.warning(f"Event {event_id} missing time information")
                return

            # Parse event times (simplified - real implementation should use dateutil.parser)
            try:
                # Extract date and time from ISO format
                if 'T' in start_time:
                    # DateTime format: 2024-03-20T14:30:00-03:00
                    start_date_str = start_time.split('T')[0]
                    start_time_str = start_time.split('T')[1][:5]
                else:
                    # Date only format
                    start_date_str = start_time
                    start_time_str = "00:00"

                # Update appointment if times changed
                if appointment.date != start_date_str or appointment.time != start_time_str:
                    appointment.date = start_date_str
                    appointment.time = start_time_str
                    logger.info(f"Updated appointment {appointment.id} with new date/time from Google Calendar")
                    stats["appointments_updated"] += 1
            except Exception as e:
                logger.error(f"Failed to parse event times: {str(e)}")

    @staticmethod
    def sync_all_doctor_calendars(empresa_id: Optional[int] = None) -> dict:
        """
        Sync calendars for all doctors

        Args:
            empresa_id: Optional - sync only for this empresa

        Returns:
            Dictionary with sync statistics for all doctors
        """
        db = SessionLocal()
        try:
            # Get all doctors with calendar enabled
            query = db.query(Doctor).filter(
                Doctor.calendar_sync_enabled == True,
                Doctor.google_calendar_id.isnot(None)
            )

            if empresa_id:
                query = query.filter(Doctor.empresa_id == empresa_id)

            doctors = query.all()

            results = {
                "timestamp": datetime.utcnow().isoformat(),
                "total_doctors": len(doctors),
                "doctors": []
            }

            for doctor in doctors:
                doctor_stats = CalendarSyncService.sync_doctor_calendar(db, doctor)
                results["doctors"].append(doctor_stats)

            logger.info(f"Completed sync for {len(doctors)} doctors")
            return results

        except Exception as e:
            logger.error(f"Error in sync_all_doctor_calendars: {str(e)}")
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "success": False,
                "error": str(e)
            }
        finally:
            db.close()


# Singleton instance
calendar_sync_service = CalendarSyncService()
