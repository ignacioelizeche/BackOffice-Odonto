"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field, field_validator, field_serializer, model_validator, model_serializer
from typing import Optional, List
from datetime import datetime, date
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
    email: Optional[EmailStr] = None
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
    email: Optional[str] = None
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
    preferredSlotDuration: Optional[int] = Field(None, alias="preferred_slot_duration")
    minimumSlotDuration: Optional[int] = Field(None, alias="minimum_slot_duration")
    schedule: Optional[List[ScheduleSlot]] = None
    workSchedule: Optional[List[WorkDayBase]] = Field(None, alias="work_schedule")
    monthlyStats: Optional[dict] = Field(None, alias="monthly_stats")
    empresa_id: Optional[int] = None

    class Config:
        from_attributes = True
        populate_by_name = True

    @model_serializer(mode='wrap', when_used='json')
    def serialize_model(self, serializer, info):
        """Custom serializer to output with camelCase field names instead of snake_case aliases"""
        data = serializer(self)
        # Map snake_case keys back to camelCase field names for JSON output
        if isinstance(data, dict):
            keys_to_rename = {
                'license_number': 'licenseNumber',
                'patients_today': 'patientsToday',
                'patients_total': 'patientsTotal',
                'review_count': 'reviewCount',
                'years_experience': 'yearsExperience',
                'preferred_slot_duration': 'preferredSlotDuration',
                'minimum_slot_duration': 'minimumSlotDuration',
                'monthly_stats': 'monthlyStats',
                'work_schedule': 'workSchedule',
            }
            for old_key, new_key in keys_to_rename.items():
                if old_key in data:
                    data[new_key] = data.pop(old_key)
        return data

    @model_validator(mode='before')
    @classmethod
    def handle_work_schedule(cls, data):
        """Convert work_schedule (snake_case) from ORM to workSchedule (camelCase)"""
        # Handle ORM objects
        if hasattr(data, 'work_schedule') and not isinstance(data, dict):
            work_schedule = getattr(data, 'work_schedule', None)
            if work_schedule:
                result = []
                for item in work_schedule:
                    work_day = {
                        'day': getattr(item, 'day', None),
                        'active': getattr(item, 'active', True),
                        'startTime': getattr(item, 'start_time', ''),
                        'endTime': getattr(item, 'end_time', ''),
                        'breakStart': getattr(item, 'break_start', ''),
                        'breakEnd': getattr(item, 'break_end', ''),
                    }
                    result.append(work_day)
                # Convert ORM object to dict for Pydantic processing
                data_dict = {}
                field_mapping = {
                    'id': 'id',
                    'name': 'name',
                    'initials': 'initials',
                    'email': 'email',
                    'phone': 'phone',
                    'specialty': 'specialty',
                    'license_number': 'licenseNumber',
                    'status': 'status',
                    'patients_today': 'patientsToday',
                    'patients_total': 'patientsTotal',
                    'rating': 'rating',
                    'review_count': 'reviewCount',
                    'years_experience': 'yearsExperience',
                    'preferred_slot_duration': 'preferredSlotDuration',
                    'minimum_slot_duration': 'minimumSlotDuration',
                    'monthly_stats': 'monthlyStats',
                    'empresa_id': 'empresa_id',
                }
                for db_key, schema_key in field_mapping.items():
                    if hasattr(data, db_key):
                        data_dict[schema_key] = getattr(data, db_key)
                data_dict['workSchedule'] = result if result else None
                return data_dict
        # Handle dict objects
        elif isinstance(data, dict):
            if 'work_schedule' in data and 'workSchedule' not in data:
                work_schedule = data.pop('work_schedule', None)
                if work_schedule:
                    result = []
                    for item in work_schedule:
                        if hasattr(item, '__dict__'):
                            work_day = {
                                'day': getattr(item, 'day', None),
                                'active': getattr(item, 'active', True),
                                'startTime': getattr(item, 'start_time', ''),
                                'endTime': getattr(item, 'end_time', ''),
                                'breakStart': getattr(item, 'break_start', ''),
                                'breakEnd': getattr(item, 'break_end', ''),
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
    rfc: Optional[str] = None
    phone: str
    email: str
    website: Optional[str] = None
    license_number: Optional[str] = Field(None, alias="licenseNumber")
    address: str
    specialties: List[str]
    logo_url: Optional[str] = Field(None, alias="logoUrl")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }

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
    password: Optional[str] = Field(default=None, min_length=8)

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

# ============= DOCTOR CUSTOM AVAILABILITY =============
from datetime import time

class CustomAvailabilityBase(BaseModel):
    date: str  # YYYY-MM-DD format
    available: bool = True
    start_time: Optional[str] = Field(None, alias="startTime")  # HH:MM format
    end_time: Optional[str] = Field(None, alias="endTime")  # HH:MM format
    break_start: Optional[str] = Field(None, alias="breakStart")  # HH:MM format
    break_end: Optional[str] = Field(None, alias="breakEnd")  # HH:MM format
    notes: Optional[str] = None

    class Config:
        populate_by_name = True

    @field_validator('date', mode='before')
    @classmethod
    def convert_date_to_string(cls, v):
        """Convert datetime.date objects to ISO format strings"""
        if isinstance(v, date):
            return v.isoformat()
        return v

    @field_validator('start_time', 'end_time', 'break_start', 'break_end', mode='before')
    @classmethod
    def convert_time_to_string(cls, v):
        """Convert datetime.time objects to HH:MM format strings"""
        if isinstance(v, time):
            return v.isoformat(timespec='minutes')
        return v

class CustomAvailabilityCreate(CustomAvailabilityBase):
    pass

class CustomAvailabilityUpdate(CustomAvailabilityBase):
    date: Optional[str] = None  # Date comes from URL path

class CustomAvailabilityResponse(CustomAvailabilityBase):
    id: int

    class Config:
        from_attributes = True

class CustomAvailabilityListResponse(BaseModel):
    data: List[CustomAvailabilityResponse]

class UpdateDoctorSlotDurationRequest(BaseModel):
    preferred_slot_duration: int = Field(ge=5, le=180, description="Preferred slot duration in minutes", alias="preferredSlotDuration")
    minimum_slot_duration: int = Field(ge=5, le=180, description="Minimum slot duration in minutes", alias="minimumSlotDuration")

    class Config:
        populate_by_name = True

    @field_validator('preferred_slot_duration', 'minimum_slot_duration')
    @classmethod
    def validate_duration(cls, v):
        # Allow any duration from 5 to 180 minutes
        if v < 5 or v > 180:
            raise ValueError('Slot duration must be between 5 and 180 minutes')
        return v

    @model_validator(mode='after')
    def validate_min_vs_preferred(self):
        if self.minimum_slot_duration > self.preferred_slot_duration:
            raise ValueError('Minimum slot duration cannot be greater than preferred slot duration')
        return self

class UpdateDoctorSlotDurationResponse(BaseModel):
    id: int
    preferred_slot_duration: int
    minimum_slot_duration: int
    message: str = "Intervalos de cita actualizados exitosamente"
