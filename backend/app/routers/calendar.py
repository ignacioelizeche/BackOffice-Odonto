"""
Calendar router - Endpoints for Google Calendar integration
Callback endpoints for N8N to notify backend about calendar operations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Doctor, Cita
from app.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])


class DoctorCalendarCreatedRequest(BaseModel):
    """Request body when N8N callback about calendar creation"""
    doctor_id: int
    calendar_id: str
    calendar_email: str


class DoctorCalendarErrorRequest(BaseModel):
    """Request body when N8N callback about calendar creation error"""
    doctor_id: int
    error_message: str


class AppointmentCalendarUpdatedRequest(BaseModel):
    """Request body when N8N callback about appointment calendar update/create"""
    appointment_id: int
    google_calendar_event_id: str
    success: bool
    error: Optional[str] = None


class AppointmentCalendarDeletedRequest(BaseModel):
    """Request body when N8N callback about appointment calendar deletion"""
    appointment_id: int
    google_calendar_event_id: str
    success: bool
    error: Optional[str] = None


@router.post("/doctor-calendar-created")
def doctor_calendar_created(
    request: DoctorCalendarCreatedRequest,
    db: Session = Depends(get_db)
):
    """
    Callback endpoint for N8N to notify backend that doctor's calendar was created

    Called by N8N workflow after successfully creating a Google Calendar for a doctor
    """
    try:
        # Get the doctor
        doctor = db.query(Doctor).filter(Doctor.id == request.doctor_id).first()

        if not doctor:
            logger.warning(f"Doctor not found: {request.doctor_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )

        # Update doctor with calendar information
        doctor.google_calendar_id = request.calendar_id
        doctor.google_calendar_email = request.calendar_email
        doctor.calendar_sync_enabled = True

        db.commit()
        db.refresh(doctor)

        logger.info(
            f"Successfully saved calendar for doctor {doctor.id}: "
            f"calendar_id={request.calendar_id}"
        )

        return {
            "success": True,
            "message": f"Calendar saved for doctor {doctor.name}",
            "doctor_id": doctor.id,
            "calendar_id": request.calendar_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving doctor calendar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save calendar information"
        )


@router.post("/doctor-calendar-error")
def doctor_calendar_error(
    request: DoctorCalendarErrorRequest,
    db: Session = Depends(get_db)
):
    """
    Callback endpoint for N8N to notify backend about calendar creation errors

    Called by N8N workflow if it fails to create a Google Calendar
    """
    try:
        doctor = db.query(Doctor).filter(Doctor.id == request.doctor_id).first()

        if not doctor:
            logger.warning(f"Doctor not found: {request.doctor_id}")
            return {"success": False, "message": "Doctor not found"}

        # Log the error
        logger.error(
            f"N8N failed to create calendar for doctor {doctor.id} ({doctor.name}): "
            f"{request.error_message}"
        )

        # Optionally: mark doctor as having calendar sync disabled
        doctor.calendar_sync_enabled = False
        db.commit()

        return {
            "success": False,
            "message": f"Calendar creation failed for doctor {doctor.name}",
            "error": request.error_message
        }

    except Exception as e:
        logger.error(f"Error handling calendar creation error callback: {str(e)}")
        return {"success": False, "error": str(e)}


@router.post("/appointment-calendar-updated")
def appointment_calendar_updated(
    request: AppointmentCalendarUpdatedRequest,
    db: Session = Depends(get_db)
):
    """
    Callback endpoint for N8N to notify backend about appointment calendar update/create

    Called by N8N workflow after successfully creating or updating a Google Calendar event for an appointment
    """
    try:
        # Get the appointment
        appointment = db.query(Cita).filter(Cita.id == request.appointment_id).first()

        if not appointment:
            logger.warning(f"Appointment not found: {request.appointment_id}")
            return {"success": False, "message": "Appointment not found"}

        if request.success:
            # Update appointment with calendar event ID
            appointment.google_calendar_event_id = request.google_calendar_event_id
            db.commit()
            db.refresh(appointment)

            logger.info(
                f"Successfully saved calendar event for appointment {appointment.id}: "
                f"event_id={request.google_calendar_event_id}"
            )

            return {
                "success": True,
                "message": f"Calendar event saved for appointment {appointment.id}",
                "appointment_id": appointment.id,
                "google_calendar_event_id": request.google_calendar_event_id
            }
        else:
            # Log the error but don't fail the appointment
            logger.error(
                f"N8N failed to update calendar for appointment {appointment.id}: "
                f"{request.error or 'Unknown error'}"
            )

            return {
                "success": False,
                "message": f"Calendar update failed for appointment {appointment.id}",
                "error": request.error,
                "appointment_id": appointment.id
            }

    except Exception as e:
        logger.error(f"Error handling appointment calendar update callback: {str(e)}")
        return {"success": False, "error": str(e)}


@router.post("/appointment-calendar-deleted")
def appointment_calendar_deleted(
    request: AppointmentCalendarDeletedRequest,
    db: Session = Depends(get_db)
):
    """
    Callback endpoint for N8N to notify backend about appointment calendar deletion

    Called by N8N workflow after attempting to delete a Google Calendar event for an appointment
    """
    try:
        # Get the appointment (if it still exists)
        appointment = db.query(Cita).filter(Cita.id == request.appointment_id).first()

        if request.success:
            if appointment:
                # Clear the calendar event ID since it's been deleted
                appointment.google_calendar_event_id = None
                db.commit()
                db.refresh(appointment)

            logger.info(
                f"Successfully deleted calendar event for appointment {request.appointment_id}: "
                f"event_id={request.google_calendar_event_id}"
            )

            return {
                "success": True,
                "message": f"Calendar event deleted for appointment {request.appointment_id}",
                "appointment_id": request.appointment_id,
                "google_calendar_event_id": request.google_calendar_event_id
            }
        else:
            # Log the error
            logger.error(
                f"N8N failed to delete calendar event for appointment {request.appointment_id}: "
                f"{request.error or 'Unknown error'}"
            )

            return {
                "success": False,
                "message": f"Calendar deletion failed for appointment {request.appointment_id}",
                "error": request.error,
                "appointment_id": request.appointment_id
            }

    except Exception as e:
        logger.error(f"Error handling appointment calendar deletion callback: {str(e)}")
        return {"success": False, "error": str(e)}


@router.get("/doctor/{doctor_id}/status")
def get_doctor_calendar_status(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get calendar sync status for a doctor
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )

    if doctor.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return {
        "doctor_id": doctor.id,
        "doctor_name": doctor.name,
        "calendar_configured": bool(doctor.google_calendar_id),
        "calendar_id": doctor.google_calendar_id,
        "calendar_email": doctor.google_calendar_email,
        "sync_enabled": doctor.calendar_sync_enabled
    }


# CORS preflight handlers
@router.options("/doctor-calendar-created")
def options_calendar_created():
    """Handle CORS preflight"""
    return {}


@router.options("/doctor-calendar-error")
def options_calendar_error():
    """Handle CORS preflight"""
    return {}


@router.options("/appointment-calendar-updated")
def options_appointment_updated():
    """Handle CORS preflight"""
    return {}


@router.options("/appointment-calendar-deleted")
def options_appointment_deleted():
    """Handle CORS preflight"""
    return {}


@router.options("/doctor/{doctor_id}/status")
def options_doctor_status(doctor_id: int):
    """Handle CORS preflight"""
    return {}