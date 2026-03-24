"""
Doctors router - Endpoints for doctor management
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Doctor, HorarioDoctor, Usuario, DoctorCustomAvailability
from app.schemas import (
    DoctorResponse, DoctorsListResponse, UpdateScheduleRequest,
    UpdateScheduleResponse, WorkDayBase, DoctorCreate, UpdateDoctorStatusRequest,
    UpdateDoctorStatusResponse, CustomAvailabilityCreate, CustomAvailabilityUpdate,
    CustomAvailabilityResponse, CustomAvailabilityListResponse,
    UpdateDoctorSlotDurationRequest, UpdateDoctorSlotDurationResponse
)
from app.auth import get_current_user, hash_password, require_doctor_or_admin
from app.utils.password import generate_random_password
from app.utils.email_service import email_service
from app.services.n8n_integration_service import n8n_service
from app.config import settings
import logging
import asyncio
from datetime import datetime, date

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/doctores", tags=["Doctores"])

# CORS preflight handlers
@router.options("")
def options_doctors():
    """Handle CORS preflight for doctors list"""
    return {}

@router.options("/{doctor_id}")
def options_doctor_detail(doctor_id: int):
    """Handle CORS preflight for doctor detail"""
    return {}

@router.options("/{doctor_id}/schedule")
def options_doctor_schedule(doctor_id: int):
    """Handle CORS preflight for doctor schedule"""
    return {}

@router.options("/{doctor_id}/status")
def options_doctor_status(doctor_id: int):
    """Handle CORS preflight for doctor status"""
    return {}

@router.options("/{doctor_id}/availability/custom")
def options_doctor_custom_availability(doctor_id: int):
    """Handle CORS preflight for doctor custom availability"""
    return {}

@router.options("/{doctor_id}/availability/custom/{date}")
def options_doctor_custom_availability_date(doctor_id: int, date: str):
    """Handle CORS preflight for doctor custom availability by date"""
    return {}

@router.options("/{doctor_id}/slot-duration")
def options_doctor_slot_duration(doctor_id: int):
    """Handle CORS preflight for doctor slot duration"""
    return {}


@router.get("", response_model=DoctorsListResponse)
def list_doctors(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get list of doctors - Filtered by empresa_id
    If current user is a Doctor, return only their own profile
    """
    query = db.query(Doctor).filter(Doctor.empresa_id == current_user.empresa_id)

    # If user is a doctor, only show their own profile
    if current_user.role == "Doctor" and current_user.doctor_id:
        query = query.filter(Doctor.id == current_user.doctor_id)

    doctors = query.all()
    return DoctorsListResponse(data=[DoctorResponse.from_orm(d) for d in doctors])

@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get doctor detail with schedule, appointments and statistics
    If user is a Doctor, can only access own profile
    """
    # Check if doctor is within current user's enterprise
    # If user is a doctor and trying to access different doctor, deny
    if current_user.role == "Doctor":
        if current_user.doctor_id != doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para acceder a este doctor",
                headers={"X-Error-Code": "FORBIDDEN"}
            )

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado",
            headers={"X-Error-Code": "DOCTOR_NOT_FOUND"}
        )

    # Verify doctor belongs to current user's enterprise
    if doctor.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este doctor",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # Ensure relationships are loaded
    doctor.work_schedule  # Trigger lazy load

    # Debug: Log what we're returning
    print(f"[DEBUG] Doctor {doctor.id} - work_schedule count: {len(doctor.work_schedule)}")
    for i, hs in enumerate(doctor.work_schedule):
        print(f"  [{i}] {hs.day}: {hs.start_time}-{hs.end_time}")

    return DoctorResponse.from_orm(doctor)

@router.post("", response_model=DoctorResponse)
def create_doctor(
    doctor_data: DoctorCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new doctor and corresponding user account - Assigned to current empresa
    Sends welcome email with login credentials
    Triggers N8N workflow to create Google Calendar for the doctor
    """
    # Check if doctor with same email or license already exists in the same enterprise
    existing_doctor = db.query(Doctor).filter(
        ((Doctor.email == doctor_data.email) | (Doctor.license_number == doctor_data.licenseNumber)) &
        (Doctor.empresa_id == current_user.empresa_id)
    ).first()

    if existing_doctor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un doctor con ese email o número de licencia ya existe"
        )

    # Check if user with same email already exists
    existing_user = db.query(Usuario).filter(Usuario.email == doctor_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta de usuario con ese email"
        )

    # Create initials from name
    initials = "".join([word[0].upper() for word in doctor_data.name.split()[:2]])

    # Create new doctor
    new_doctor = Doctor(
        name=doctor_data.name,
        initials=initials,
        email=doctor_data.email,
        phone=doctor_data.phone,
        specialty=doctor_data.specialty,
        license_number=doctor_data.licenseNumber,
        years_experience=doctor_data.yearsExperience,
        empresa_id=current_user.empresa_id
    )

    db.add(new_doctor)
    db.flush()  # Flush to get the doctor ID

    # Generate random password
    random_password = generate_random_password()

    # Create corresponding usuario (user account) with role "Doctor"
    new_user = Usuario(
        name=doctor_data.name,
        initials=initials,
        email=doctor_data.email,
        hashed_password=hash_password(random_password),
        role="Doctor",
        empresa_id=current_user.empresa_id,
        doctor_id=new_doctor.id  # NEW: Link usuario to doctor
    )
    db.add(new_user)

    # Add work schedule if provided
    if doctor_data.workSchedule:
        for day_data in doctor_data.workSchedule:
            horario = HorarioDoctor(
                doctor_id=new_doctor.id,
                day=day_data.day,
                active=day_data.active,
                start_time=day_data.startTime,
                end_time=day_data.endTime,
                break_start=day_data.breakStart,
                break_end=day_data.breakEnd,
                empresa_id=current_user.empresa_id
            )
            db.add(horario)

    db.commit()
    db.refresh(new_doctor)

    # Send welcome email with credentials
    email_sent = email_service.send_doctor_welcome_email(
        doctor_email=doctor_data.email,
        doctor_name=doctor_data.name,
        password=random_password
    )

    if not email_sent:
        # Log warning but don't fail the request - user is created but email failed
        logger.warning(f"Failed to send welcome email to {doctor_data.email}")

    # Trigger N8N workflow to create Google Calendar for this doctor (in background)
    logger.info(f"[CALENDAR] N8N URL configured: {bool(settings.N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL)}")
    logger.info(f"[CALENDAR] N8N URL value: {settings.N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL}")

    if settings.N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL:
        callback_url = f"{settings.BACKEND_URL}/api/calendar/doctor-calendar-created"
        logger.info(f"[CALENDAR] Triggering N8N webhook for doctor {new_doctor.id}")
        logger.info(f"[CALENDAR] Webhook URL: {settings.N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL}")
        logger.info(f"[CALENDAR] Callback URL: {callback_url}")
        background_tasks.add_task(
            _trigger_calendar_creation,
            new_doctor.id,
            new_doctor.name,
            new_doctor.email,
            random_password,
            current_user.empresa_id,
            callback_url
        )
        logger.info(f"[CALENDAR] Queued N8N calendar creation for doctor {new_doctor.id}")
    else:
        logger.warning("[CALENDAR] N8N webhook URL not configured - skipping calendar creation")
        logger.warning(f"[CALENDAR] Set N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL in environment variables")

    return DoctorResponse.from_orm(new_doctor)


def _trigger_calendar_creation(
    doctor_id: int,
    doctor_name: str,
    doctor_email: str,
    doctor_password: str,
    empresa_id: int,
    callback_url: str
):
    """Background task to trigger N8N calendar creation"""
    try:
        asyncio.run(
            n8n_service.trigger_create_doctor_calendar(
                doctor_id=doctor_id,
                doctor_name=doctor_name,
                doctor_email=doctor_email,
                doctor_password=doctor_password,
                empresa_id=empresa_id,
                callback_url=callback_url
            )
        )
    except Exception as e:
        logger.error(f"Failed to trigger N8N calendar creation for doctor {doctor_id}: {str(e)}")

@router.put("/{doctor_id}/horario", response_model=UpdateScheduleResponse)
def update_doctor_schedule(
    doctor_id: int,
    schedule_data: UpdateScheduleRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update doctor work schedule - Verified by empresa_id
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado",
            headers={"X-Error-Code": "DOCTOR_NOT_FOUND"}
        )

    # Verify doctor belongs to current user's enterprise
    if doctor.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este doctor",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # Delete existing schedule
    db.query(HorarioDoctor).filter(HorarioDoctor.doctor_id == doctor_id).delete()

    # Add new schedule
    for day_data in schedule_data.workSchedule:
        horario = HorarioDoctor(
            doctor_id=doctor_id,
            day=day_data.day,
            active=day_data.active,
            start_time=day_data.startTime,
            end_time=day_data.endTime,
            break_start=day_data.breakStart,
            break_end=day_data.breakEnd,
            empresa_id=current_user.empresa_id
        )
        db.add(horario)

    db.commit()

    return UpdateScheduleResponse(id=doctor_id)

@router.put("/{doctor_id}/status", response_model=UpdateDoctorStatusResponse)
def update_doctor_status(
    doctor_id: int,
    status_data: UpdateDoctorStatusRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update doctor status (disponible, en-consulta, no-disponible)
    Doctor can only update their own status, admin can update any doctor
    """
    # Get the doctor
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado",
            headers={"X-Error-Code": "DOCTOR_NOT_FOUND"}
        )

    # Verify doctor belongs to current user's enterprise
    if doctor.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este doctor",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # Check authorization: Doctor can only update their own status
    if current_user.role == "Doctor" and current_user.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes actualizar tu propio estado",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # Update status
    doctor.status = status_data.status
    db.commit()

    return UpdateDoctorStatusResponse(
        id=doctor.id,
        status=doctor.status,
        message="Estado actualizado exitosamente"
    )

# ============= CUSTOM AVAILABILITY ENDPOINTS =============

@router.post("/{doctor_id}/availability/custom", response_model=CustomAvailabilityResponse)
def create_custom_availability(
    doctor_id: int,
    availability_data: CustomAvailabilityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Set custom availability for a doctor on a specific date
    Requires admin role or doctor managing own schedule
    """
    # Check if doctor exists and belongs to current user's enterprise
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado"
        )

    if doctor.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este doctor"
        )

    # Check authorization: Doctor can only manage their own schedule
    if current_user.role == "Doctor" and current_user.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes gestionar tu propio horario"
        )

    # Validate date format
    try:
        date_obj = datetime.strptime(availability_data.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de fecha inválido. Use YYYY-MM-DD"
        )

    # Check if custom availability already exists for this date
    existing = db.query(DoctorCustomAvailability).filter(
        (DoctorCustomAvailability.doctor_id == doctor_id) &
        (DoctorCustomAvailability.date == date_obj)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe disponibilidad personalizada para esta fecha"
        )

    # Parse time fields if provided
    start_time = None
    end_time = None
    break_start = None
    break_end = None

    if availability_data.start_time:
        try:
            start_time = datetime.strptime(availability_data.start_time, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de hora de inicio inválido. Use HH:MM"
            )

    if availability_data.end_time:
        try:
            end_time = datetime.strptime(availability_data.end_time, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de hora de fin inválido. Use HH:MM"
            )

    if availability_data.break_start:
        try:
            break_start = datetime.strptime(availability_data.break_start, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de hora de inicio de descanso inválido. Use HH:MM"
            )

    if availability_data.break_end:
        try:
            break_end = datetime.strptime(availability_data.break_end, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de hora de fin de descanso inválido. Use HH:MM"
            )

    # Create custom availability
    custom_availability = DoctorCustomAvailability(
        doctor_id=doctor_id,
        empresa_id=current_user.empresa_id,
        date=date_obj,
        available=availability_data.available,
        start_time=start_time,
        end_time=end_time,
        break_start=break_start,
        break_end=break_end,
        notes=availability_data.notes
    )

    db.add(custom_availability)
    db.commit()
    db.refresh(custom_availability)

    return CustomAvailabilityResponse.from_orm(custom_availability)

@router.get("/{doctor_id}/availability/custom", response_model=CustomAvailabilityListResponse)
def get_custom_availability(
    doctor_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get doctor's custom availability for a date range
    If no dates provided, returns next 30 days
    """
    # Check if doctor exists and belongs to current user's enterprise
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado"
        )

    if doctor.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este doctor"
        )

    # Check authorization: Doctor can only view their own schedule
    if current_user.role == "Doctor" and current_user.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes ver tu propio horario"
        )

    # Parse date range
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de fecha de inicio inválido. Use YYYY-MM-DD"
            )
    else:
        start_date_obj = date.today()

    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de fecha de fin inválido. Use YYYY-MM-DD"
            )
    else:
        from datetime import timedelta
        end_date_obj = start_date_obj + timedelta(days=30)

    # Query custom availability
    query = db.query(DoctorCustomAvailability).filter(
        (DoctorCustomAvailability.doctor_id == doctor_id) &
        (DoctorCustomAvailability.date >= start_date_obj) &
        (DoctorCustomAvailability.date <= end_date_obj)
    ).order_by(DoctorCustomAvailability.date)

    custom_availabilities = query.all()

    return CustomAvailabilityListResponse(
        data=[CustomAvailabilityResponse.from_orm(ca) for ca in custom_availabilities]
    )

@router.put("/{doctor_id}/availability/custom/{date}", response_model=CustomAvailabilityResponse)
def update_custom_availability(
    doctor_id: int,
    date: str,
    availability_data: CustomAvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update custom availability for a doctor on a specific date
    """
    # Check if doctor exists and belongs to current user's enterprise
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado"
        )

    if doctor.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este doctor"
        )

    # Check authorization
    if current_user.role == "Doctor" and current_user.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes gestionar tu propio horario"
        )

    # Validate date format
    try:
        date_obj = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de fecha inválido. Use YYYY-MM-DD"
        )

    # Find existing custom availability
    custom_availability = db.query(DoctorCustomAvailability).filter(
        (DoctorCustomAvailability.doctor_id == doctor_id) &
        (DoctorCustomAvailability.date == date_obj)
    ).first()

    if not custom_availability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe disponibilidad personalizada para esta fecha"
        )

    # Parse and validate time fields
    if availability_data.start_time:
        try:
            custom_availability.start_time = datetime.strptime(availability_data.start_time, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de hora de inicio inválido. Use HH:MM"
            )

    if availability_data.end_time:
        try:
            custom_availability.end_time = datetime.strptime(availability_data.end_time, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de hora de fin inválido. Use HH:MM"
            )

    if availability_data.break_start:
        try:
            custom_availability.break_start = datetime.strptime(availability_data.break_start, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de hora de inicio de descanso inválido. Use HH:MM"
            )

    if availability_data.break_end:
        try:
            custom_availability.break_end = datetime.strptime(availability_data.break_end, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de hora de fin de descanso inválido. Use HH:MM"
            )

    # Update fields
    custom_availability.available = availability_data.available
    custom_availability.notes = availability_data.notes
    custom_availability.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(custom_availability)

    return CustomAvailabilityResponse.from_orm(custom_availability)

@router.delete("/{doctor_id}/availability/custom/{date}")
def delete_custom_availability(
    doctor_id: int,
    date: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Remove custom availability for a doctor on a specific date
    This will return the doctor to their weekly schedule pattern for this date
    """
    # Check if doctor exists and belongs to current user's enterprise
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado"
        )

    if doctor.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este doctor"
        )

    # Check authorization
    if current_user.role == "Doctor" and current_user.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes gestionar tu propio horario"
        )

    # Validate date format
    try:
        date_obj = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de fecha inválido. Use YYYY-MM-DD"
        )

    # Find and delete custom availability
    custom_availability = db.query(DoctorCustomAvailability).filter(
        (DoctorCustomAvailability.doctor_id == doctor_id) &
        (DoctorCustomAvailability.date == date_obj)
    ).first()

    if not custom_availability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe disponibilidad personalizada para esta fecha"
        )

    db.delete(custom_availability)
    db.commit()

    return {"message": "Disponibilidad personalizada eliminada exitosamente"}

@router.put("/{doctor_id}/slot-duration", response_model=UpdateDoctorSlotDurationResponse)
def update_doctor_slot_duration(
    doctor_id: int,
    duration_data: UpdateDoctorSlotDurationRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update doctor's preferred appointment slot durations
    Allows configuring 10-15 minute intervals instead of global default
    """
    # Check if doctor exists and belongs to current user's enterprise
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado"
        )

    if doctor.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este doctor"
        )

    # Check authorization: Doctor can only update their own settings
    if current_user.role == "Doctor" and current_user.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes actualizar tus propias configuraciones"
        )

    # Update slot duration preferences
    doctor.preferred_slot_duration = duration_data.preferred_slot_duration
    doctor.minimum_slot_duration = duration_data.minimum_slot_duration

    db.commit()

    return UpdateDoctorSlotDurationResponse(
        id=doctor.id,
        preferred_slot_duration=doctor.preferred_slot_duration,
        minimum_slot_duration=doctor.minimum_slot_duration
    )
