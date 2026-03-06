"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field, field_validator, field_serializer, model_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============= ENUMS =============
class Gender(str, Enum):
    masculino = "Masculino"
    femenino = "Femenino"

class PatientStatus(str, Enum):
    activo = "activo"
    inactivo = "inactivo"
    nuevo = "nuevo"

class ToothStatus(str, Enum):
    sano = "sano"
    tratado = "tratado"
    en_tratamiento = "en_tratamiento"
    extraccion = "extraccion"
    pendiente = "pendiente"

class DoctorStatus(str, Enum):
    disponible = "disponible"
    en_consulta = "en-consulta"
    no_disponible = "no-disponible"

class AppointmentStatus(str, Enum):
    pendiente = "pendiente"
    confirmada = "confirmada"
    completada = "completada"
    cancelada = "cancelada"

class Role(str, Enum):
    administrador = "Administrador"
    recepcionista = "Recepcionista"
    doctor = "Doctor"
    asistente = "Asistente"

# ============= PACIENTES =============
class AttachmentBase(BaseModel):
    name: str
    size: str
    type: Optional[str] = None
    downloadUrl: Optional[str] = Field(None, alias="download_url")

class AttachmentResponse(AttachmentBase):
    id: int

    class Config:
        from_attributes = True
        populate_by_name = True

class TreatmentRecordResponse(BaseModel):
    id: int
    date: str
    treatment: str
    doctor: str
    notes: Optional[str] = None
    cost: float
    attachments: Optional[List[AttachmentResponse]] = None

    class Config:
        from_attributes = True

class ToothResponse(BaseModel):
    number: int
    name: str
    status: ToothStatus
    records: List[TreatmentRecordResponse] = []

    class Config:
        from_attributes = True

class PatientCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    age: int
    gender: Gender
    doctor: str

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Gender] = None
    doctor: Optional[str] = None
    status: Optional[PatientStatus] = None

class PatientResponse(BaseModel):
    id: int
    name: str
    initials: str
    email: str
    phone: str
    age: int
    gender: Gender
    lastVisit: str
    nextAppt: Optional[str] = None
    doctor: str
    status: PatientStatus
    treatments: List[str] = []
    totalVisits: int
    balance: float
    teeth: Optional[List[ToothResponse]] = None
    empresa_id: Optional[int] = None

    class Config:
        from_attributes = True

class PaginationResponse(BaseModel):
    page: int
    limit: int
    total: int
    totalPages: int

class PatientsListResponse(BaseModel):
    data: List[PatientResponse]
    pagination: PaginationResponse

class PatientCreateResponse(PatientResponse):
    message: str = "Paciente creado exitosamente"

class PatientUpdateResponse(BaseModel):
    id: int
    message: str = "Paciente actualizado exitosamente"

class PatientDeleteResponse(BaseModel):
    message: str = "Paciente eliminado exitosamente"

class DentalRecordRequest(BaseModel):
    treatment: str
    doctor: str
    notes: Optional[str] = None
    cost: float

class DentalRecordResponse(BaseModel):
    id: int
    toothNumber: int
    date: str
    toothNewStatus: ToothStatus
    attachments: Optional[List[AttachmentResponse]] = None
    message: str = "Registro dental agregado exitosamente"

# ============= DOCTORES =============
class WorkDayBase(BaseModel):
    day: str
    active: bool
    startTime: str
    endTime: str
    breakStart: str
    breakEnd: str

class ScheduleSlot(BaseModel):
    time: str
    patient: Optional[str] = None
    treatment: Optional[str] = None
    status: str  # ocupado, libre, descanso

class DoctorResponse(BaseModel):
    id: int
    name: str
    initials: str
    email: str
    phone: str
    specialty: str
    licenseNumber: str = Field(alias="license_number")
    status: DoctorStatus
    patientsToday: int = Field(alias="patients_today")
    patientsTotal: int = Field(alias="patients_total")
    rating: float
    reviewCount: int = Field(alias="review_count")
    yearsExperience: int = Field(alias="years_experience")
    schedule: Optional[List[ScheduleSlot]] = None
    workSchedule: Optional[List[WorkDayBase]] = Field(None, alias="work_schedule")
    monthlyStats: Optional[dict] = Field(None, alias="monthly_stats")
    empresa_id: Optional[int] = None

    class Config:
        from_attributes = True
        populate_by_name = True

    @model_validator(mode='before')
    @classmethod
    def handle_work_schedule(cls, data):
        """Convert work_schedule (snake_case) from ORM to workSchedule (camelCase)"""
        if isinstance(data, dict):
            # If we got work_schedule from SQLAlchemy ORM, convert it
            if 'work_schedule' in data and 'workSchedule' not in data:
                work_schedule = data.pop('work_schedule', None)
                if work_schedule:
                    result = []
                    for item in work_schedule:
                        if hasattr(item, '__dict__'):
                            # Convert SQLAlchemy object to dict
                            work_day = {
                                'day': getattr(item, 'day', None),
                                'active': getattr(item, 'active', True),
                                'startTime': getattr(item, 'startTime', ''),
                                'endTime': getattr(item, 'endTime', ''),
                                'breakStart': getattr(item, 'breakStart', ''),
                                'breakEnd': getattr(item, 'breakEnd', ''),
                            }
                            result.append(work_day)
                        elif isinstance(item, dict):
                            result.append(item)
                    data['workSchedule'] = result if result else None
        return data

class DoctorCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    specialty: str
    licenseNumber: str
    yearsExperience: int
    workSchedule: Optional[List[WorkDayBase]] = None

class DoctorsListResponse(BaseModel):
    data: List[DoctorResponse]

class UpdateScheduleRequest(BaseModel):
    workSchedule: List[WorkDayBase]

class UpdateScheduleResponse(BaseModel):
    id: int
    message: str = "Horario actualizado exitosamente"

class UpdateDoctorStatusRequest(BaseModel):
    status: DoctorStatus

class UpdateDoctorStatusResponse(BaseModel):
    id: int
    status: DoctorStatus
    message: str = "Estado actualizado exitosamente"

# ============= CITAS =============
class AppointmentBase(BaseModel):
    patientId: Optional[int] = None
    patient: Optional[str] = None
    doctorId: Optional[int] = None
    doctor: Optional[str] = None
    treatment: str
    date: str
    time: str
    duration: str
    cost: float
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    patientId: int
    doctorId: int

class AppointmentUpdate(BaseModel):
    patientId: Optional[int] = None
    doctorId: Optional[int] = None
    treatment: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration: Optional[str] = None
    cost: Optional[float] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    patient: str
    patientInitials: str
    patientAge: int
    patientPhone: str
    doctor: str
    doctorSpecialty: str
    treatment: str
    date: str
    time: str
    duration: str
    status: AppointmentStatus
    notes: str
    cost: float
    empresa_id: Optional[int] = None

    class Config:
        from_attributes = True

class AppointmentsListResponse(BaseModel):
    data: List[AppointmentResponse]
    pagination: PaginationResponse

class AppointmentCreateResponse(BaseModel):
    id: int
    status: str = "pendiente"
    message: str = "Cita creada exitosamente"

class AppointmentUpdateResponse(BaseModel):
    id: int
    message: str = "Cita actualizada exitosamente"

class AppointmentStatusUpdateRequest(BaseModel):
    status: AppointmentStatus

class AppointmentStatusUpdateResponse(BaseModel):
    id: int
    status: str
    message: str = "Estado actualizado exitosamente"

class AppointmentDeleteResponse(BaseModel):
    message: str = "Cita eliminada exitosamente"

# ============= AVAILABILITY =============
class AvailableSlotResponse(BaseModel):
    time: str
    available: bool = True
    reason: Optional[str] = None

class DoctorAvailabilityResponse(BaseModel):
    date: str
    day: str
    availableSlots: List[AvailableSlotResponse]
    doctorSchedule: Optional[WorkDayBase] = None

class ValidateAvailabilityRequest(BaseModel):
    doctorId: int
    date: str
    time: str
    duration: str

class ValidateAvailabilityResponse(BaseModel):
    available: bool
    reason: Optional[str] = None

# ============= HISTORIALES =============
class ClinicalRecordResponse(BaseModel):
    id: int
    patientId: int
    patient: str
    patientInitials: str
    date: str
    doctor: str
    treatment: str
    diagnosis: str
    tooth: str
    notes: str
    cost: float
    status: str
    attachments: Optional[int] = None
    empresa_id: Optional[int] = None

    class Config:
        from_attributes = True

class ClinicalRecordsListResponse(BaseModel):
    data: List[ClinicalRecordResponse]
    pagination: PaginationResponse

# ============= CONFIGURATION =============
class ClinicConfigResponse(BaseModel):
    name: str
    rfc: str
    phone: str
    email: str
    website: Optional[str] = None
    licenseNumber: str = Field(alias="license_number")
    address: str
    specialties: List[str]
    logoUrl: Optional[str] = Field(None, alias="logo_url")

    class Config:
        from_attributes = True
        populate_by_name = True

class ClinicConfigUpdate(BaseModel):
    name: Optional[str] = None
    rfc: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    licenseNumber: Optional[str] = Field(None, alias="license_number")
    address: Optional[str] = None
    specialties: Optional[List[str]] = None
    logoUrl: Optional[str] = Field(None, alias="logo_url")

    class Config:
        populate_by_name = True

class ConfigResponseMessage(BaseModel):
    message: str = "Configuración actualizada exitosamente"

class ScheduleConfigResponse(BaseModel):
    appointmentDuration: int
    timeBetweenAppointments: int
    maxAppointmentsPerDoctorPerDay: int
    minAdvanceBookingDays: int
    workDays: List[WorkDayBase]

    class Config:
        from_attributes = True

class SecurityConfigResponse(BaseModel):
    twoFactor: bool
    autoLogout: bool
    activityLog: bool
    dataEncryption: bool

    class Config:
        from_attributes = True

class PasswordChangeRequest(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str

class BillingConfigResponse(BaseModel):
    currency: str
    taxRate: float
    invoicePrefix: str
    nextNumber: int
    autoInvoice: bool
    paymentReminder: bool
    summary: dict

    class Config:
        from_attributes = True

class BillingConfigUpdate(BaseModel):
    currency: Optional[str] = None
    taxRate: Optional[float] = None
    invoicePrefix: Optional[str] = None
    nextNumber: Optional[int] = None
    autoInvoice: Optional[bool] = None
    paymentReminder: Optional[bool] = None

class NotificationItem(BaseModel):
    id: str
    name: str
    description: str
    enabled: bool
    type: str

class EmailServerConfig(BaseModel):
    smtpServer: str
    smtpPort: int
    senderEmail: str
    senderName: str
    useSSL: bool

class NotificationsConfigResponse(BaseModel):
    notifications: List[NotificationItem]
    emailServer: EmailServerConfig

    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    id: str
    enabled: bool

class NotificationsConfigUpdate(BaseModel):
    notifications: Optional[List[NotificationUpdate]] = None
    emailServer: Optional[EmailServerConfig] = None

# ============= USUARIOS =============
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: Role
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Role] = None

class UserResponse(BaseModel):
    id: int
    name: str
    initials: str
    email: str
    role: Role
    lastAccess: Optional[datetime] = None
    empresa_id: Optional[int] = None

    class Config:
        from_attributes = True

class UsersListResponse(BaseModel):
    data: List[UserResponse]

class UserCreateResponse(UserResponse):
    message: str = "Usuario creado exitosamente"

class UserUpdateResponse(BaseModel):
    message: str = "Usuario actualizado exitosamente"

class UserDeleteResponse(BaseModel):
    message: str = "Usuario eliminado exitosamente"

# ============= DASHBOARD =============
class WeeklyChartResponse(BaseModel):
    labels: List[str]
    scheduled: List[int]
    completed: List[int]

class RecentActivityResponse(BaseModel):
    type: str
    message: str
    time: str

class DashboardStatsResponse(BaseModel):
    todayAppointments: int
    activePatients: int
    monthlyRevenue: float
    returnRate: int
    weeklyChart: WeeklyChartResponse
    recentActivity: List[RecentActivityResponse]
    empresa_id: Optional[int] = None

# ============= ERRORS =============
class ErrorResponse(BaseModel):
    error: str
    code: str

class NotFoundError(ErrorResponse):
    error: str = "Recurso no encontrado"
    code: str = "NOT_FOUND"

class UnauthorizedError(ErrorResponse):
    error: str = "No autorizado"
    code: str = "UNAUTHORIZED"

class ForbiddenError(ErrorResponse):
    error: str = "Sin permisos"
    code: str = "FORBIDDEN"

class BadRequestError(ErrorResponse):
    error: str = "Solicitud inválida"
    code: str = "BAD_REQUEST"

class ConflictError(ErrorResponse):
    error: str = "Conflicto"
    code: str = "CONFLICT"

class ValidationError(ErrorResponse):
    error: str = "Validación fallida"
    code: str = "VALIDATION_ERROR"

class InternalServerError(ErrorResponse):
    error: str = "Error interno del servidor"
    code: str = "INTERNAL_ERROR"

# ============= NOTIFICACIONES =============
class NotificacionResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    read: bool
    created_at: datetime
    patient_id: Optional[int] = None
    appointment_id: Optional[int] = None
    doctor_id: Optional[int] = None

    class Config:
        from_attributes = True

class NotificacionesListResponse(BaseModel):
    data: List[NotificacionResponse]
    unread_count: int

class NotificacionMarkAsRead(BaseModel):
    read: bool = True
