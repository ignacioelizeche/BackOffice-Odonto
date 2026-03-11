"""
Patients router - Endpoints for patient management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from app.database import get_db
from app.models import Paciente, Diente, RegistroDental, Adjunto, Cita, Doctor
from app.schemas import (
    PatientCreate, PatientUpdate, PatientResponse, PatientsListResponse,
    PatientCreateResponse, PatientUpdateResponse, PatientDeleteResponse,
    DentalRecordRequest, DentalRecordResponse, PaginationResponse,
    ErrorResponse
)
from app.auth import get_current_user
from app.config import settings
from app.services.notification_service import notify_new_patient_assigned
from werkzeug.utils import secure_filename
from uuid import uuid4
import os
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pacientes", tags=["Pacientes"])

# CORS preflight handlers
@router.options("")
def options_patients():
    """Handle CORS preflight for patients list"""
    return {}

@router.options("/{patient_id}")
def options_patient_detail(patient_id: int):
    """Handle CORS preflight for patient detail"""
    return {}

@router.options("/{patient_id}/teeth")
def options_patient_teeth(patient_id: int):
    """Handle CORS preflight for patient teeth"""
    return {}

@router.options("/{patient_id}/dental-records")
def options_patient_records(patient_id: int):
    """Handle CORS preflight for patient dental records"""
    return {}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

def get_initials(name: str) -> str:
    """Calculate initials from full name"""
    parts = name.split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper()


def build_patient_response(patient: Paciente, include_teeth: bool = False) -> PatientResponse:
    """Build a resilient patient response from ORM data with legacy null handling."""
    name = patient.name or "Paciente"
    initials = patient.initials or get_initials(name)
    age = patient.age if patient.age is not None else 0
    gender = patient.gender or "Masculino"
    last_visit = patient.last_visit or datetime.now().strftime("%Y-%m-%d")
    doctor = patient.doctor or "Sin asignar"
    status = patient.status or "nuevo"
    total_visits = patient.total_visits if patient.total_visits is not None else 0
    balance = patient.balance if patient.balance is not None else 0.0

    teeth_data = None
    if include_teeth:
        teeth_data = []
        for tooth in patient.teeth or []:
            records = []
            for record in tooth.records or []:
                records.append({
                    "id": record.id,
                    "date": record.date,
                    "treatment": record.treatment,
                    "doctor": record.doctor,
                    "notes": record.notes,
                    "cost": record.cost,
                    "attachments": [
                        {
                            "id": a.id,
                            "name": a.name,
                            "size": a.size,
                            "type": a.type,
                            "download_url": a.download_url,
                        }
                        for a in (record.attachments or [])
                    ]
                })

            teeth_data.append({
                "number": tooth.number,
                "name": tooth.name,
                "status": tooth.status.value if hasattr(tooth.status, "value") else tooth.status,
                "records": records,
            })

    return PatientResponse(
        id=patient.id,
        name=name,
        initials=initials,
        email=patient.email,
        phone=patient.phone or "",
        age=age,
        gender=gender,
        lastVisit=last_visit,
        nextAppt=patient.next_appt,
        doctor=doctor,
        status=status,
        treatments=[],
        totalVisits=total_visits,
        balance=balance,
        teeth=teeth_data,
        empresa_id=patient.empresa_id,
    )

@router.get("", response_model=PatientsListResponse)
def list_patients(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    doctor: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get list of patients with optional filters - Filtered by empresa_id
    If current user is a Doctor, only show patients with appointments assigned to that doctor
    """
    # Start with enterprise-filtered query
    query = db.query(Paciente).filter(Paciente.empresa_id == current_user.empresa_id)

    # If user is a doctor, filter to only show their assigned patients (by doctor name)
    if current_user.role == "Doctor" and current_user.doctor_id:
        # Get the doctor's name from the Doctor record
        doctor_record = db.query(Doctor).filter(Doctor.id == current_user.doctor_id).first()
        if doctor_record:
            # Filter by the doctor's name in the Paciente.doctor field
            query = query.filter(Paciente.doctor == doctor_record.name)

    if search:
        search_filters = [Paciente.name.ilike(f"%{search}%")]
        # Only search by email if email is not null
        search_filters.append(Paciente.email.ilike(f"%{search}%"))
        query = query.filter(
            (search_filters[0]) | (search_filters[1])
        )

    if status:
        query = query.filter(Paciente.status == status)

    if doctor:
        query = query.filter(Paciente.doctor == doctor)

    total = query.count()
    offset = (page - 1) * limit

    patients = query.offset(offset).limit(limit).all()

    return PatientsListResponse(
        data=[build_patient_response(p) for p in patients],
        pagination=PaginationResponse(
            page=page,
            limit=limit,
            total=total,
            totalPages=(total + limit - 1) // limit
        )
    )

@router.post("", response_model=PatientCreateResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new patient - Filtered by empresa_id
    If user is a Doctor, patient must be assigned to them
    """
    # First, check if there are any doctors in the system for this enterprise
    doctors_count = db.query(Doctor).filter(
        Doctor.empresa_id == current_user.empresa_id
    ).count()
    
    if doctors_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tienes que crear un doctor para agregar pacientes",
            headers={"X-Error-Code": "NO_DOCTORS_AVAILABLE"}
        )
    
    # Check if email already exists within the same enterprise (only if email is provided)
    if patient.email:
        existing = db.query(Paciente).filter(
            (Paciente.email == patient.email) &
            (Paciente.empresa_id == current_user.empresa_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email ya registrado o datos inválidos",
                headers={"X-Error-Code": "INVALID_DATA"}
            )

    # If user is a doctor, force the patient to be assigned to them
    doctor_name = patient.doctor
    if current_user.role == "Doctor" and current_user.doctor_id:
        # Get the doctor's name from the Doctor record
        doctor = db.query(Doctor).filter(Doctor.id == current_user.doctor_id).first()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El doctor no existe"
            )
        doctor_name = doctor.name
    elif current_user.role == "Doctor" and not current_user.doctor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu cuenta de doctor no está completamente configurada"
        )

    db_patient = Paciente(
        name=patient.name,
        initials=get_initials(patient.name),
        email=patient.email,
        phone=patient.phone,
        age=patient.age,
        gender=patient.gender,
        doctor=doctor_name,
        status="nuevo",
        lastVisit=datetime.now().strftime("%Y-%m-%d"),
        totalVisits=0,
        balance=0.0,
        empresa_id=current_user.empresa_id
    )

    db.add(db_patient)
    db.flush()

    # Create all 32 teeth for the patient (FDI numbering system)
    # Upper right: 18-11, Upper left: 21-28, Lower right: 48-41, Lower left: 31-38
    fdi_tooth_numbers = [18, 17, 16, 15, 14, 13, 12, 11,  # Upper right
                         21, 22, 23, 24, 25, 26, 27, 28,  # Upper left
                         48, 47, 46, 45, 44, 43, 42, 41,  # Lower right
                         31, 32, 33, 34, 35, 36, 37, 38]  # Lower left

    for tooth_number in fdi_tooth_numbers:
        tooth = Diente(
            patient_id=db_patient.id,
            number=tooth_number,
            name=f"Diente {tooth_number}",
            status="sano",
            empresa_id=current_user.empresa_id
        )
        db.add(tooth)

    db.commit()
    db.refresh(db_patient)

    # Trigger: Create notification for new patient assignment
    try:
        # Get the doctor record to send notification
        doctor = db.query(Doctor).filter(Doctor.name == doctor_name).filter(
            Doctor.empresa_id == current_user.empresa_id
        ).first()
        if doctor:
            notify_new_patient_assigned(db, db_patient, doctor)
            logger.info(f"[Notification] Created new patient assigned notification for patient {db_patient.id}")
        else:
            logger.warning(f"[Notification] Doctor not found for new patient: {db_patient.id}")
    except Exception as e:
        logger.error(f"Error creating patient assignment notification: {e}")
        # Don't fail the patient creation if notification fails

    return PatientCreateResponse(**build_patient_response(db_patient).model_dump())

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get complete patient detail including dental chart - Verified by empresa_id
    """
    patient = db.query(Paciente).filter(Paciente.id == patient_id).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado",
            headers={"X-Error-Code": "PATIENT_NOT_FOUND"}
        )

    # Verify patient belongs to current user's enterprise
    if patient.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este paciente",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # Ensure all 32 teeth exist for this patient (FDI numbering system)
    # Upper right: 18-11, Upper left: 21-28, Lower right: 48-41, Lower left: 31-38
    fdi_tooth_numbers = [18, 17, 16, 15, 14, 13, 12, 11,  # Upper right
                         21, 22, 23, 24, 25, 26, 27, 28,  # Upper left
                         48, 47, 46, 45, 44, 43, 42, 41,  # Lower right
                         31, 32, 33, 34, 35, 36, 37, 38]  # Lower left

    existing_teeth = db.query(Diente).filter(Diente.patient_id == patient_id).all()
    existing_numbers = {tooth.number for tooth in existing_teeth}

    for tooth_number in fdi_tooth_numbers:
        if tooth_number not in existing_numbers:
            new_tooth = Diente(
                patient_id=patient_id,
                number=tooth_number,
                name=f"Diente {tooth_number}",
                status="sano",
                empresa_id=current_user.empresa_id
            )
            db.add(new_tooth)

    if len(fdi_tooth_numbers) > len(existing_numbers):
        db.commit()

    # Refresh to get all teeth
    db.refresh(patient)

    return build_patient_response(patient, include_teeth=True)

@router.put("/{patient_id}", response_model=PatientUpdateResponse)
def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update patient data - Verified by empresa_id
    """
    patient = db.query(Paciente).filter(Paciente.id == patient_id).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado",
            headers={"X-Error-Code": "PATIENT_NOT_FOUND"}
        )

    # Verify patient belongs to current user's enterprise
    if patient.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este paciente",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # Check if new email is unique within the same enterprise
    if patient_data.email and patient_data.email != patient.email:
        existing = db.query(Paciente).filter(
            (Paciente.email == patient_data.email) &
            (Paciente.empresa_id == current_user.empresa_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email ya registrado",
                headers={"X-Error-Code": "EMAIL_EXISTS"}
            )

    update_data = patient_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)

    return PatientUpdateResponse(id=patient.id)

@router.delete("/{patient_id}", response_model=PatientDeleteResponse)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete a patient - Verified by empresa_id
    """
    patient = db.query(Paciente).filter(Paciente.id == patient_id).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado",
            headers={"X-Error-Code": "PATIENT_NOT_FOUND"}
        )

    # Verify patient belongs to current user's enterprise
    if patient.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este paciente",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    db.delete(patient)
    db.commit()

    return PatientDeleteResponse()

@router.post("/{patient_id}/dientes/{tooth_number}/registros", response_model=DentalRecordResponse, status_code=status.HTTP_201_CREATED)
def add_dental_record(
    patient_id: int,
    tooth_number: int,
    treatment: str = Form(...),
    doctor: str = Form(...),
    notes: Optional[str] = Form(None),
    cost: float = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Add a dental record to a specific tooth - Verified by empresa_id
    """
    # Get patient
    patient = db.query(Paciente).filter(Paciente.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado",
            headers={"X-Error-Code": "PATIENT_NOT_FOUND"}
        )

    # Verify patient belongs to current user's enterprise
    if patient.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este paciente",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # Get or create tooth
    tooth = db.query(Diente).filter(
        (Diente.patient_id == patient_id) & (Diente.number == tooth_number)
    ).first()

    if not tooth:
        tooth = Diente(
            patient_id=patient_id,
            number=tooth_number,
            name=f"Diente {tooth_number}",
            empresa_id=current_user.empresa_id
        )
        db.add(tooth)
        db.flush()

    # Create dental record
    record = RegistroDental(
        tooth_id=tooth.id,
        date=datetime.now().strftime("%Y-%m-%d"),
        treatment=treatment,
        doctor=doctor,
        notes=notes,
        cost=cost,
        empresa_id=current_user.empresa_id
    )
    db.add(record)
    db.flush()

    # Handle file uploads
    if files:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        for file in files:
            if file.size and file.size > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Archivo demasiado grande",
                    headers={"X-Error-Code": "FILE_TOO_LARGE"}
                )

            # Validate extension
            original_name = file.filename or ""
            _, ext = os.path.splitext(original_name.lower())
            allowed_exts = {f".{e}" for e in settings.ALLOWED_EXTENSIONS}
            if ext not in allowed_exts:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Extensión de archivo no permitida: {ext}",
                    headers={"X-Error-Code": "INVALID_EXTENSION"}
                )

            # Validate MIME type
            if file.content_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tipo de archivo no permitido: {file.content_type}",
                    headers={"X-Error-Code": "INVALID_MIME_TYPE"}
                )

            # Generate safe UUID-based filename; store original name in DB only
            safe_uuid = uuid4().hex
            stored_filename = f"{record.id}_{safe_uuid}{ext}"
            file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

            with open(file_path, "wb") as f:
                f.write(file.file.read())

            # Get file size in human readable format
            file_size_bytes = os.path.getsize(file_path)
            if file_size_bytes < 1024:
                file_size = f"{file_size_bytes} B"
            elif file_size_bytes < 1024 * 1024:
                file_size = f"{file_size_bytes / 1024:.1f} KB"
            else:
                file_size = f"{file_size_bytes / (1024 * 1024):.1f} MB"

            # Create attachment — original_name stored in DB, UUID name on disk
            attachment = Adjunto(
                record_id=record.id,
                name=secure_filename(original_name) or stored_filename,
                size=file_size,
                type=file.content_type,
                file_path=file_path,
                download_url=f"/api/pacientes/{patient_id}/dientes/{tooth_number}/registros/{record.id}/attachments/{stored_filename}",
                empresa_id=current_user.empresa_id
            )
            db.add(attachment)

    # Update tooth status
    tooth.status = "tratado"

    db.commit()
    db.refresh(record)

    return DentalRecordResponse(
        id=record.id,
        toothNumber=tooth_number,
        date=record.date,
        toothNewStatus="tratado",
        attachments=[
            {
                "id": a.id,
                "name": a.name,
                "size": a.size,
                "type": a.type,
                "downloadUrl": a.download_url,
            }
            for a in record.attachments
        ] if record.attachments else None
    )

@router.get(
    "/{patient_id}/dientes/{tooth_number}/registros/{record_id}/attachments/{filename}",
    response_class=FileResponse
)
def download_attachment(
    patient_id: int,
    tooth_number: int,
    record_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Download an attachment for a dental record - Verified by empresa_id
    """
    # Get attachment with verification of patient ownership
    attachment = db.query(Adjunto).join(RegistroDental).join(Diente).filter(
        RegistroDental.id == record_id,
        Adjunto.name == filename,
        Diente.patient_id == patient_id,
        Diente.number == tooth_number,
        Adjunto.empresa_id == current_user.empresa_id
    ).first()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archivo no encontrado",
            headers={"X-Error-Code": "ATTACHMENT_NOT_FOUND"}
        )

    if not attachment.file_path or not os.path.exists(attachment.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archivo no disponible",
            headers={"X-Error-Code": "FILE_NOT_AVAILABLE"}
        )

    media_type = attachment.type or "application/octet-stream"
    return FileResponse(
        attachment.file_path,
        media_type=media_type,
        filename=attachment.name
    )
