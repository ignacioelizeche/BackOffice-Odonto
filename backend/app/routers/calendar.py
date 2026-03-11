"""
Calendar router - Endpoints for Google Calendar integration
Callback endpoints for N8N to notify backend about calendar creation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Doctor
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


@router.options("/doctor/{doctor_id}/status")
def options_doctor_status(doctor_id: int):
    """Handle CORS preflight"""
    return {}