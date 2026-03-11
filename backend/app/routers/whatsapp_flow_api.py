"""
WhatsApp Flow API for N8N Integration
Provides endpoints that N8N can call to handle appointment workflows
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Doctor, Cita, AppointmentStatusEnum, Paciente, PatientStatusEnum, Diente
from app.utils.availability import get_available_slots, validate_appointment_availability
from app.services.notification_service import (
    notify_appointment_created, notify_appointment_cancelled
)
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp-flow", tags=["WhatsApp Flow"])


def _create_default_teeth_for_patient(patient_id: int, empresa_id: int, db: Session) -> None:
    """Create the default 32 FDI teeth for a new patient."""
    fdi_tooth_numbers = [
        18, 17, 16, 15, 14, 13, 12, 11,
        21, 22, 23, 24, 25, 26, 27, 28,
        48, 47, 46, 45, 44, 43, 42, 41,
        31, 32, 33, 34, 35, 36, 37, 38,
    ]

    for tooth_number in fdi_tooth_numbers:
        db.add(Diente(
            patient_id=patient_id,
            number=tooth_number,
            name=f"Diente {tooth_number}",
            status="sano",
            empresa_id=empresa_id,
        ))


# ============= REQUEST SCHEMAS =============
class GetDoctorsRequest(BaseModel):
    empresa_id: int


class GetAvailableDatesRequest(BaseModel):
    empresa_id: int
    doctor_id: int


class GetAvailableTimesRequest(BaseModel):
    empresa_id: int
    doctor_id: int
    date: str  # YYYY-MM-DD


class CreateAppointmentRequest(BaseModel):
    empresa_id: int
    caller_id: str  # WhatsApp phone
    doctor_id: int
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    patient_name: Optional[str] = None


class GetPatientAppointmentsRequest(BaseModel):
    empresa_id: int
    caller_id: str
    status: Optional[str] = None  # "pendiente", "confirmada", etc


class RescheduleAppointmentRequest(BaseModel):
    empresa_id: int
    appointment_id: int
    new_date: str
    new_time: str


class CancelAppointmentRequest(BaseModel):
    empresa_id: int
    appointment_id: int


# ============= RESPONSE SCHEMAS =============
class DoctorInfo(BaseModel):
    id: int
    name: str
    specialty: str


class DoctorsResponse(BaseModel):
    success: bool
    doctors: List[DoctorInfo]
    message: str


class AvailableDateInfo(BaseModel):
    date: str  # YYYY-MM-DD
    display: str  # DD/MM (Lunes)


class AvailableDatesResponse(BaseModel):
    success: bool
    dates: List[AvailableDateInfo]
    message: str


class AvailableTimesResponse(BaseModel):
    success: bool
    times: List[str]
    message: str


class AppointmentInfo(BaseModel):
    id: int
    doctor_id: int
    doctor_name: str
    date: str
    time: str
    status: str


class PatientAppointmentsResponse(BaseModel):
    success: bool
    appointments: List[AppointmentInfo]
    message: str


class CreateAppointmentResponse(BaseModel):
    success: bool
    appointment_id: Optional[int] = None
    message: str


# ============= ENDPOINTS =============

@router.get("/doctors", response_model=DoctorsResponse)
def get_doctors(
    empresa_id: int,
    db: Session = Depends(get_db)
):
    """
    Get list of active doctors for the company.

    Called by N8N during agendamiento phase 1.
    """
    try:
        doctors = db.query(Doctor).filter(
            Doctor.empresa_id == empresa_id
        ).all()

        if not doctors:
            return DoctorsResponse(
                success=False,
                doctors=[],
                message="No hay doctores disponibles"
            )

        doctors_list = [
            DoctorInfo(
                id=doc.id,
                name=doc.name,
                specialty=doc.specialty or "Odontología General"
            )
            for doc in doctors
        ]

        return DoctorsResponse(
            success=True,
            doctors=doctors_list,
            message="Doctores disponibles"
        )

    except Exception as e:
        logger.error(f"Error getting doctors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/available-dates", response_model=AvailableDatesResponse)
def get_available_dates(
    request: GetAvailableDatesRequest,
    db: Session = Depends(get_db)
):
    """
    Get available dates for a doctor (next 7 days).

    Called by N8N during agendamiento phase 2.
    """
    try:
        doctor = db.query(Doctor).filter(
            (Doctor.id == request.doctor_id) &
            (Doctor.empresa_id == request.empresa_id)
        ).first()

        if not doctor:
            return AvailableDatesResponse(
                success=False,
                dates=[],
                message="Doctor no encontrado"
            )

        # Generate next 7 days
        dates_list = []
        today = datetime.now().date()

        for i in range(1, 8):
            date = today + timedelta(days=i)
            day_name = _get_spanish_day_name(date)
            dates_list.append(
                AvailableDateInfo(
                    date=date.strftime("%Y-%m-%d"),
                    display=f"{date.strftime('%d/%m')} ({day_name})"
                )
            )

        return AvailableDatesResponse(
            success=True,
            dates=dates_list,
            message="Fechas disponibles"
        )

    except Exception as e:
        logger.error(f"Error getting available dates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/available-times", response_model=AvailableTimesResponse)
def get_available_times(
    request: GetAvailableTimesRequest,
    db: Session = Depends(get_db)
):
    """
    Get available time slots for a doctor on a specific date.

    Called by N8N during agendamiento phase 3.
    """
    try:
        doctor = db.query(Doctor).filter(
            (Doctor.id == request.doctor_id) &
            (Doctor.empresa_id == request.empresa_id)
        ).first()

        if not doctor:
            return AvailableTimesResponse(
                success=False,
                times=[],
                message="Doctor no encontrado"
            )

        # Get available slots
        available_slots = get_available_slots(
            request.doctor_id,
            request.date,
            db
        )

        if not available_slots:
            return AvailableTimesResponse(
                success=False,
                times=[],
                message="No hay horarios disponibles para esa fecha"
            )

        return AvailableTimesResponse(
            success=True,
            times=available_slots,
            message="Horarios disponibles"
        )

    except Exception as e:
        logger.error(f"Error getting available times: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-appointment", response_model=CreateAppointmentResponse)
def create_appointment(
    request: CreateAppointmentRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new appointment.

    Called by N8N during agendamiento phase 4.
    """
    try:
        # Validate availability
        is_available, reason = validate_appointment_availability(
            doctor_id=request.doctor_id,
            date=request.date,
            time=request.time,
            duration="30 min",
            db=db
        )

        if not is_available:
            return CreateAppointmentResponse(
                success=False,
                message=reason or "Ese horario no está disponible"
            )

        # Get or create patient
        patient = db.query(Paciente).filter(
            (Paciente.empresa_id == request.empresa_id) &
            ((Paciente.phone == request.caller_id) | (Paciente.whatsapp_phone == request.caller_id))
        ).first()

        if not patient:
            patient = Paciente(
                empresa_id=request.empresa_id,
                name=request.patient_name or f"Cliente {request.caller_id[-4:]}",
                phone=request.caller_id,
                whatsapp_phone=request.caller_id,
                status=PatientStatusEnum.nuevo,
                last_whatsapp_contact=datetime.now()
            )
            db.add(patient)
            db.flush()

            _create_default_teeth_for_patient(patient.id, request.empresa_id, db)

            db.commit()
            db.refresh(patient)

        # Create appointment
        appointment = Cita(
            empresa_id=request.empresa_id,
            patient_id=patient.id,
            doctor_id=request.doctor_id,
            date=request.date,
            time=request.time,
            duration="30 min",
            status=AppointmentStatusEnum.pendiente,
            treatment="Consulta General",
            cost=0.0
        )

        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        # Notify doctor
        notify_appointment_created(
            appointment=appointment,
            db=db,
            doctor_id=request.doctor_id,
            empresa_id=request.empresa_id
        )

        return CreateAppointmentResponse(
            success=True,
            appointment_id=appointment.id,
            message=f"Cita creada exitosamente (ID: {appointment.id})"
        )

    except Exception as e:
        logger.error(f"Error creating appointment: {str(e)}")
        db.rollback()
        return CreateAppointmentResponse(
            success=False,
            message=f"Error al crear cita: {str(e)}"
        )


@router.post("/patient-appointments", response_model=PatientAppointmentsResponse)
def get_patient_appointments(
    request: GetPatientAppointmentsRequest,
    db: Session = Depends(get_db)
):
    """
    Get patient's appointments (for rescheduling/cancellation).

    Called by N8N during reagendamiento/cancelacion phase 1.
    """
    try:
        patient = db.query(Paciente).filter(
            (Paciente.empresa_id == request.empresa_id) &
            ((Paciente.phone == request.caller_id) | (Paciente.whatsapp_phone == request.caller_id))
        ).first()

        if not patient:
            return PatientAppointmentsResponse(
                success=False,
                appointments=[],
                message="Paciente no encontrado"
            )

        # Get appointments
        query = db.query(Cita).filter(
            (Cita.patient_id == patient.id) &
            (Cita.empresa_id == request.empresa_id)
        )

        if request.status:
            query = query.filter(Cita.status == request.status)
        else:
            # Default: show pending and confirmed
            query = query.filter(
                Cita.status.in_([
                    AppointmentStatusEnum.pendiente,
                    AppointmentStatusEnum.confirmada
                ])
            )

        appointments = query.all()

        if not appointments:
            return PatientAppointmentsResponse(
                success=False,
                appointments=[],
                message="No hay citas disponibles"
            )

        appointments_list = []
        for appt in appointments:
            doctor = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
            appointments_list.append(
                AppointmentInfo(
                    id=appt.id,
                    doctor_id=appt.doctor_id,
                    doctor_name=doctor.name if doctor else "Tu doctor",
                    date=appt.date,
                    time=appt.time,
                    status=appt.status.value
                )
            )

        return PatientAppointmentsResponse(
            success=True,
            appointments=appointments_list,
            message="Citas encontradas"
        )

    except Exception as e:
        logger.error(f"Error getting patient appointments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reschedule-appointment", response_model=CreateAppointmentResponse)
def reschedule_appointment(
    request: RescheduleAppointmentRequest,
    db: Session = Depends(get_db)
):
    """
    Reschedule an existing appointment to a new date/time.

    Called by N8N during reagendamiento phase 4.
    """
    try:
        appointment = db.query(Cita).filter(
            (Cita.id == request.appointment_id) &
            (Cita.empresa_id == request.empresa_id)
        ).first()

        if not appointment:
            return CreateAppointmentResponse(
                success=False,
                message="Cita no encontrada"
            )

        # Validate new availability (exclude current appointment)
        is_available, reason = validate_appointment_availability(
            doctor_id=appointment.doctor_id,
            date=request.new_date,
            time=request.new_time,
            duration="30 min",
            db=db,
            exclude_appointment_id=request.appointment_id
        )

        if not is_available:
            return CreateAppointmentResponse(
                success=False,
                message=reason or "Ese horario no está disponible"
            )

        # Update appointment
        appointment.date = request.new_date
        appointment.time = request.new_time
        db.commit()

        # Notify doctor
        notify_appointment_created(
            appointment=appointment,
            db=db,
            doctor_id=appointment.doctor_id,
            empresa_id=request.empresa_id
        )

        return CreateAppointmentResponse(
            success=True,
            appointment_id=appointment.id,
            message="Cita reagendada exitosamente"
        )

    except Exception as e:
        logger.error(f"Error rescheduling appointment: {str(e)}")
        db.rollback()
        return CreateAppointmentResponse(
            success=False,
            message=f"Error al reagendar: {str(e)}"
        )


@router.post("/cancel-appointment", response_model=CreateAppointmentResponse)
def cancel_appointment(
    request: CancelAppointmentRequest,
    db: Session = Depends(get_db)
):
    """
    Cancel an existing appointment.

    Called by N8N during cancelacion phase 3.
    """
    try:
        appointment = db.query(Cita).filter(
            (Cita.id == request.appointment_id) &
            (Cita.empresa_id == request.empresa_id)
        ).first()

        if not appointment:
            return CreateAppointmentResponse(
                success=False,
                message="Cita no encontrada"
            )

        # Update status
        appointment.status = AppointmentStatusEnum.cancelada
        db.commit()

        # Notify doctor
        notify_appointment_cancelled(
            appointment=appointment,
            db=db,
            doctor_id=appointment.doctor_id,
            empresa_id=request.empresa_id
        )

        return CreateAppointmentResponse(
            success=True,
            appointment_id=appointment.id,
            message="Cita cancelada exitosamente"
        )

    except Exception as e:
        logger.error(f"Error cancelling appointment: {str(e)}")
        db.rollback()
        return CreateAppointmentResponse(
            success=False,
            message=f"Error al cancelar: {str(e)}"
        )


# ============= HELPER FUNCTIONS =============
def _get_spanish_day_name(date) -> str:
    """Get Spanish day name from date."""
    spanish_days = {
        0: "Lunes",
        1: "Martes",
        2: "Miércoles",
        3: "Jueves",
        4: "Viernes",
        5: "Sábado",
        6: "Domingo"
    }
    return spanish_days.get(date.weekday(), "Día")
