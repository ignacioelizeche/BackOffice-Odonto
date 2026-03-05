"""
Doctors router - Endpoints for doctor management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Doctor, HorarioDoctor, Usuario
from app.schemas import (
    DoctorResponse, DoctorsListResponse, UpdateScheduleRequest,
    UpdateScheduleResponse, WorkDayBase, DoctorCreate, UpdateDoctorStatusRequest,
    UpdateDoctorStatusResponse
)
from app.auth import get_current_user, hash_password, require_doctor_or_admin
from app.utils.password import generate_random_password
from app.utils.email_service import email_service

router = APIRouter(prefix="/doctores", tags=["Doctores"])

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
        print(f"  [{i}] {hs.day}: {hs.startTime}-{hs.endTime}")

    return DoctorResponse.from_orm(doctor)

@router.post("", response_model=DoctorResponse)
def create_doctor(
    doctor_data: DoctorCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new doctor and corresponding user account - Assigned to current empresa
    Sends welcome email with login credentials
    """
    # Check if doctor with same email or license already exists in the same enterprise
    existing_doctor = db.query(Doctor).filter(
        ((Doctor.email == doctor_data.email) | (Doctor.licenseNumber == doctor_data.licenseNumber)) &
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
        licenseNumber=doctor_data.licenseNumber,
        yearsExperience=doctor_data.yearsExperience,
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
                startTime=day_data.startTime,
                endTime=day_data.endTime,
                breakStart=day_data.breakStart,
                breakEnd=day_data.breakEnd,
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
        print(f"[WARNING] Failed to send welcome email to {doctor_data.email}")

    return DoctorResponse.from_orm(new_doctor)

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
            startTime=day_data.startTime,
            endTime=day_data.endTime,
            breakStart=day_data.breakStart,
            breakEnd=day_data.breakEnd,
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
