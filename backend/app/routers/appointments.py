"""
Appointments router - Endpoints for appointment management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import logging
from app.database import get_db
from app.models import Cita, Paciente, Doctor, AppointmentStatusEnum, HorarioDoctor
from app.schemas import (
    AppointmentCreate, AppointmentUpdate, AppointmentResponse,
    AppointmentsListResponse, AppointmentCreateResponse, AppointmentUpdateResponse,
    AppointmentStatusUpdateRequest, AppointmentStatusUpdateResponse,
    AppointmentDeleteResponse, PaginationResponse,
    DoctorAvailabilityResponse, AvailableSlotResponse,
    ValidateAvailabilityRequest, ValidateAvailabilityResponse
)
from app.auth import get_current_user
from app.utils.availability import (
    get_available_slots, get_date_name, validate_appointment_availability,
    get_doctor_schedule_for_date
)
from app.services.notification_service import (
    notify_appointment_created,
    notify_appointment_started,
    notify_appointment_completed,
    notify_appointment_cancelled
)
from app.services.n8n_integration_service import n8n_service

router = APIRouter(prefix="/citas", tags=["Citas"])
logger = logging.getLogger(__name__)


async def sync_appointment_to_calendar(
    appointment_id: int,
    doctor_id: int,
    patient_name: str,
    appointment_date,
    appointment_time,
    status: str,
    google_calendar_event_id: str = None,
    empresa_id: int = None,
    action: str = "update"
):
    """
    Background task to sync appointment changes to Google Calendar via N8N

    Args:
        appointment_id: ID of the appointment
        doctor_id: ID of the doctor
        patient_name: Name of the patient
        appointment_date: Date of the appointment
        appointment_time: Time of the appointment
        status: Status of the appointment
        google_calendar_event_id: Existing Google Calendar event ID (if any)
        empresa_id: ID of the enterprise
        action: 'update' for create/update, 'delete' for deletion
    """
    try:
        if action == "delete":
            # For deletions, we need the google_calendar_event_id
            if google_calendar_event_id:
                await n8n_service.trigger_delete_appointment(
                    appointment_id=appointment_id,
                    google_calendar_event_id=google_calendar_event_id,
                    doctor_id=doctor_id,
                    empresa_id=empresa_id
                )
        else:
            # For updates/creates
            await n8n_service.trigger_update_appointment(
                appointment_id=appointment_id,
                doctor_id=doctor_id,
                patient_name=patient_name,
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                status=status,
                google_calendar_event_id=google_calendar_event_id,
                empresa_id=empresa_id
            )

    except Exception as e:
        # Log error but don't fail the appointment operation
        logger.error(f"Failed to sync appointment {appointment_id} to calendar: {str(e)}")


# CORS preflight handlers
@router.options("")
def options_appointments():
    """Handle CORS preflight for appointments list"""
    return {}

@router.options("/{appointment_id}")
def options_appointment_detail(appointment_id: int):
    """Handle CORS preflight for appointment detail"""
    return {}

@router.options("/disponibilidad/{doctor_id}")
def options_availability(doctor_id: int):
    """Handle CORS preflight for availability"""
    return {}

@router.options("/{appointment_id}/status")
def options_appointment_status(appointment_id: int):
    """Handle CORS preflight for appointment status"""
    return {}

# ============= AVAILABILITY ENDPOINTS =============

@router.get("/disponibilidad/{doctor_id}", response_model=DoctorAvailabilityResponse)
def get_doctor_availability(
    doctor_id: int,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get available time slots for a doctor on a specific date - Verified by empresa_id
    """
    # Verify doctor exists and belongs to current user's enterprise
    doctor = db.query(Doctor).filter(
        (Doctor.id == doctor_id) &
        (Doctor.empresa_id == current_user.empresa_id)
    ).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado"
        )

    # Get available slots (now uses doctor's preferred slot duration)
    available_slots_list = get_available_slots(doctor_id, date, db)

    # Get doctor's schedule for this day (includes custom availability)
    schedule = get_doctor_schedule_for_date(doctor_id, date, db)

    # Convert to response objects
    available_slots_response = [
        AvailableSlotResponse(time=slot, available=True)
        for slot in available_slots_list
    ]

    # Get day name
    day_name = get_date_name(date)

    # Convert schedule to WorkDayBase format if available
    schedule_response = None
    if schedule and schedule['active']:
        schedule_response = {
            "day": day_name,
            "active": schedule['active'],
            "startTime": schedule['start_time'] or "",
            "endTime": schedule['end_time'] or "",
            "breakStart": schedule.get('break_start') or "",
            "breakEnd": schedule.get('break_end') or "",
            "isCustom": schedule.get('is_custom', False)  # Indicate if custom schedule
        }

    return DoctorAvailabilityResponse(
        date=date,
        day=day_name,
        availableSlots=available_slots_response,
        doctorSchedule=schedule_response
    )


@router.post("/validar-disponibilidad", response_model=ValidateAvailabilityResponse)
def validate_availability(
    request: ValidateAvailabilityRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Validate if a specific time slot is available for a doctor - Verified by empresa_id
    """
    # Verify doctor exists and belongs to current user's enterprise
    doctor = db.query(Doctor).filter(
        (Doctor.id == request.doctorId) &
        (Doctor.empresa_id == current_user.empresa_id)
    ).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado"
        )

    # Validate availability
    is_available, error_message = validate_appointment_availability(
        request.doctorId,
        request.date,
        request.time,
        request.duration,
        db
    )

    return ValidateAvailabilityResponse(
        available=is_available,
        reason=error_message
    )


@router.get("/doctores/{doctor_id}/horario-semana")
def get_doctor_weekly_schedule(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get doctor's complete weekly schedule - Verified by empresa_id
    """
    # Verify doctor exists and belongs to current user's enterprise
    doctor = db.query(Doctor).filter(
        (Doctor.id == doctor_id) &
        (Doctor.empresa_id == current_user.empresa_id)
    ).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado"
        )

    # Get all schedule entries for this doctor
    schedules = db.query(HorarioDoctor).filter(
        HorarioDoctor.doctor_id == doctor_id
    ).all()

    # Convert to response format
    weekly_schedule = []
    for schedule in schedules:
        weekly_schedule.append({
            "day": schedule.day,
            "active": schedule.active,
            "startTime": schedule.start_time,
            "endTime": schedule.end_time,
            "breakStart": schedule.break_start or "",
            "breakEnd": schedule.break_end or ""
        })

    return {"weeklySchedule": weekly_schedule}


@router.get("", response_model=AppointmentsListResponse)
def list_appointments(
    date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    doctor: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get list of appointments with optional filters - Filtered by empresa_id
    If current user is a Doctor, only show their appointments
    """
    query = db.query(Cita).join(Paciente).join(Doctor).filter(
        Cita.empresa_id == current_user.empresa_id
    )

    # If user is a doctor, only show their appointments
    if current_user.role == "Doctor" and current_user.doctor_id:
        query = query.filter(Cita.doctor_id == current_user.doctor_id)

    if date:
        query = query.filter(Cita.date == date)

    if status:
        query = query.filter(Cita.status == status)

    if doctor:
        query = query.filter(Doctor.name.ilike(f"%{doctor}%"))

    if search:
        query = query.filter(
            (Paciente.name.ilike(f"%{search}%")) |
            (Paciente.email.ilike(f"%{search}%"))
        )

    total = query.count()
    offset = (page - 1) * limit

    appointments = query.offset(offset).limit(limit).all()

    # Transform appointments to response format
    response_data = []
    for a in appointments:
        patient_name = a.paciente.name if a.paciente and a.paciente.name else "Paciente"
        patient_initials = a.paciente.initials if a.paciente and a.paciente.initials else "--"
        patient_age = a.paciente.age if a.paciente and a.paciente.age is not None else 0
        patient_phone = a.paciente.phone if a.paciente and a.paciente.phone else ""
        doctor_name = a.doctor.name if a.doctor and a.doctor.name else "Doctor"
        doctor_specialty = a.doctor.specialty if a.doctor and a.doctor.specialty else ""

        response_data.append(
            AppointmentResponse(
                id=a.id,
                patient=patient_name,
                patientInitials=patient_initials,
                patientAge=patient_age,
                patientPhone=patient_phone,
                doctor=doctor_name,
                doctorSpecialty=doctor_specialty,
                treatment=a.treatment,
                date=a.date,
                time=a.time,
                duration=a.duration,
                status=a.status,
                notes=a.notes or "",
                cost=a.cost
            )
        )

    return AppointmentsListResponse(
        data=response_data,
        pagination=PaginationResponse(
            page=page,
            limit=limit,
            total=total,
            totalPages=(total + limit - 1) // limit
        )
    )

@router.post("", response_model=AppointmentCreateResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new appointment - Assigned to current empresa
    If user is a Doctor, appointment must be assigned to them
    """
    # Verify patient exists and belongs to current user's enterprise
    patient = db.query(Paciente).filter(
        (Paciente.id == appointment.patientId) &
        (Paciente.empresa_id == current_user.empresa_id)
    ).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )

    # If user is a doctor, force the appointment to be assigned to them
    doctor_id = appointment.doctorId
    if current_user.role == "Doctor" and current_user.doctor_id:
        if appointment.doctorId != current_user.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Los doctores solo pueden crear citas asignadas a ellos mismos",
                headers={"X-Error-Code": "FORBIDDEN"}
            )
        doctor_id = current_user.doctor_id

    # Verify doctor exists and belongs to current user's enterprise
    doctor = db.query(Doctor).filter(
        (Doctor.id == doctor_id) &
        (Doctor.empresa_id == current_user.empresa_id)
    ).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado"
        )

    # Check doctor availability using robust validation
    is_available, error_message = validate_appointment_availability(
        doctor_id,
        appointment.date,
        appointment.time,
        appointment.duration,
        db
    )

    if not is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
            headers={"X-Error-Code": "DOCTOR_UNAVAILABLE"}
        )

    # Create appointment
    db_appointment = Cita(
        patient_id=appointment.patientId,
        doctor_id=doctor_id,
        treatment=appointment.treatment,
        date=appointment.date,
        time=appointment.time,
        duration=appointment.duration,
        cost=appointment.cost,
        notes=appointment.notes,
        status="pendiente",
        empresa_id=current_user.empresa_id
    )

    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)

    # Trigger: Create notification for appointment creation
    try:
        notify_appointment_created(db, db_appointment, doctor, patient)
    except Exception as e:
        logger.error(f"Error creating appointment notification: {e}")
        # Don't fail the appointment creation if notification fails

    return AppointmentCreateResponse(id=db_appointment.id)

@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get appointment detail - Verified by empresa_id
    """
    appointment = db.query(Cita).filter(Cita.id == appointment_id).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada",
            headers={"X-Error-Code": "APPOINTMENT_NOT_FOUND"}
        )

    # Verify appointment belongs to current user's enterprise
    if appointment.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a esta cita",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    patient_name = appointment.paciente.name if appointment.paciente and appointment.paciente.name else "Paciente"
    patient_initials = appointment.paciente.initials if appointment.paciente and appointment.paciente.initials else "--"
    patient_age = appointment.paciente.age if appointment.paciente and appointment.paciente.age is not None else 0
    patient_phone = appointment.paciente.phone if appointment.paciente and appointment.paciente.phone else ""
    doctor_name = appointment.doctor.name if appointment.doctor and appointment.doctor.name else "Doctor"
    doctor_specialty = appointment.doctor.specialty if appointment.doctor and appointment.doctor.specialty else ""

    return AppointmentResponse(
        id=appointment.id,
        patient=patient_name,
        patientInitials=patient_initials,
        patientAge=patient_age,
        patientPhone=patient_phone,
        doctor=doctor_name,
        doctorSpecialty=doctor_specialty,
        treatment=appointment.treatment,
        date=appointment.date,
        time=appointment.time,
        duration=appointment.duration,
        status=appointment.status,
        notes=appointment.notes or "",
        cost=appointment.cost
    )

@router.put("/{appointment_id}", response_model=AppointmentUpdateResponse)
def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update an appointment - Verified by empresa_id
    If user is a Doctor, can only update their own appointments
    """
    appointment = db.query(Cita).filter(Cita.id == appointment_id).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada",
            headers={"X-Error-Code": "APPOINTMENT_NOT_FOUND"}
        )

    # Verify appointment belongs to current user's enterprise
    if appointment.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar esta cita",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # If user is a doctor, can only update their own appointments
    if current_user.role == "Doctor" and current_user.doctor_id:
        if appointment.doctor_id != current_user.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Los doctores solo pueden editar sus propias citas",
                headers={"X-Error-Code": "FORBIDDEN"}
            )

    update_data = appointment_data.dict(exclude_unset=True)

    # Handle status enum conversion
    if 'status' in update_data and update_data['status']:
        try:
            update_data['status'] = AppointmentStatusEnum(update_data['status'])
        except (ValueError, KeyError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status inválido: {update_data['status']}"
            )

    for field, value in update_data.items():
        setattr(appointment, field, value)

    db.commit()
    db.refresh(appointment)

    # Get patient name for calendar sync
    patient_name = "Paciente Sin Nombre"
    if appointment.paciente_id:
        patient = db.query(Paciente).filter(Paciente.id == appointment.paciente_id).first()
        if patient:
            patient_name = f"{patient.nombre} {patient.apellido}" if patient.apellido else patient.nombre

    # Sync appointment changes to calendar in background
    background_tasks.add_task(
        sync_appointment_to_calendar,
        appointment_id=appointment.id,
        doctor_id=appointment.doctor_id,
        patient_name=patient_name,
        appointment_date=appointment.fecha,
        appointment_time=appointment.hora,
        status=appointment.status.value if appointment.status else "pendiente",
        google_calendar_event_id=appointment.google_calendar_event_id,
        empresa_id=appointment.empresa_id,
        action="update"
    )

    return AppointmentUpdateResponse(id=appointment.id)

@router.patch("/{appointment_id}/estado", response_model=AppointmentStatusUpdateResponse)
def update_appointment_status(
    appointment_id: int,
    status_data: AppointmentStatusUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Change only the appointment status - Verified by empresa_id
    If user is a Doctor, can only update their own appointments
    """
    appointment = db.query(Cita).filter(Cita.id == appointment_id).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada",
            headers={"X-Error-Code": "APPOINTMENT_NOT_FOUND"}
        )

    # Verify appointment belongs to current user's enterprise
    if appointment.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar esta cita",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # If user is a doctor, can only update their own appointments
    if current_user.role == "Doctor" and current_user.doctor_id:
        if appointment.doctor_id != current_user.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Los doctores solo pueden editar sus propias citas",
                headers={"X-Error-Code": "FORBIDDEN"}
            )

    # Convert status string to enum if needed
    try:
        if isinstance(status_data.status, str):
            appointment.status = AppointmentStatusEnum(status_data.status)
        else:
            appointment.status = status_data.status
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status inválido: {status_data.status}"
        )

    # Update doctor status automatically based on appointment status
    if appointment.doctor_id:
        doctor = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
        if doctor:
            if appointment.status == AppointmentStatusEnum.confirmada:
                # Appointment is confirmed, doctor is in consultation
                doctor.status = "en-consulta"
                # Send notification
                try:
                    notify_appointment_started(db, appointment, doctor)
                except Exception as e:
                    logger.error(f"Error sending appointment started notification: {e}")
            elif appointment.status == AppointmentStatusEnum.completada:
                # Appointment is completed, doctor is available
                doctor.status = "disponible"
                # Send notification
                try:
                    notify_appointment_completed(db, appointment, doctor)
                except Exception as e:
                    logger.error(f"Error sending appointment completed notification: {e}")
            elif appointment.status == AppointmentStatusEnum.cancelada:
                # Appointment is cancelled, doctor is available
                doctor.status = "disponible"
                # Send notification
                try:
                    notify_appointment_cancelled(db, appointment, doctor)
                except Exception as e:
                    logger.error(f"Error sending appointment cancelled notification: {e}")
            # If status is "pendiente", doctor status stays as is

    db.commit()
    db.refresh(appointment)

    # Get patient name for calendar sync
    patient_name = "Paciente Sin Nombre"
    if appointment.paciente_id:
        patient = db.query(Paciente).filter(Paciente.id == appointment.paciente_id).first()
        if patient:
            patient_name = f"{patient.nombre} {patient.apellido}" if patient.apellido else patient.nombre

    # Sync appointment status changes to calendar in background
    background_tasks.add_task(
        sync_appointment_to_calendar,
        appointment_id=appointment.id,
        doctor_id=appointment.doctor_id,
        patient_name=patient_name,
        appointment_date=appointment.fecha,
        appointment_time=appointment.hora,
        status=appointment.status.value if appointment.status else "pendiente",
        google_calendar_event_id=appointment.google_calendar_event_id,
        empresa_id=appointment.empresa_id,
        action="update"
    )

    return AppointmentStatusUpdateResponse(id=appointment.id, status=appointment.status.value)

@router.delete("/{appointment_id}", response_model=AppointmentDeleteResponse)
def delete_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete an appointment - Verified by empresa_id
    If user is a Doctor, can only delete their own appointments
    """
    appointment = db.query(Cita).filter(Cita.id == appointment_id).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada",
            headers={"X-Error-Code": "APPOINTMENT_NOT_FOUND"}
        )

    # Verify appointment belongs to current user's enterprise
    if appointment.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar esta cita",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # If user is a doctor, can only delete their own appointments
    if current_user.role == "Doctor" and current_user.doctor_id:
        if appointment.doctor_id != current_user.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Los doctores solo pueden eliminar sus propias citas",
                headers={"X-Error-Code": "FORBIDDEN"}
            )

    # Store appointment data for calendar sync before deletion
    appointment_data = {
        "id": appointment.id,
        "google_calendar_event_id": appointment.google_calendar_event_id,
        "doctor_id": appointment.doctor_id,
        "empresa_id": appointment.empresa_id
    }

    db.delete(appointment)
    db.commit()

    # Sync appointment deletion to calendar in background (if there was a calendar event)
    if appointment_data["google_calendar_event_id"]:
        background_tasks.add_task(
            sync_appointment_to_calendar,
            appointment_id=appointment_data["id"],
            doctor_id=appointment_data["doctor_id"],
            patient_name="Paciente",  # Not needed for deletion
            appointment_date=None,  # Not needed for deletion
            appointment_time=None,  # Not needed for deletion
            status="",  # Not needed for deletion
            google_calendar_event_id=appointment_data["google_calendar_event_id"],
            empresa_id=appointment_data["empresa_id"],
            action="delete"
        )

    return AppointmentDeleteResponse()
