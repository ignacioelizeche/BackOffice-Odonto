"""
Database models using SQLAlchemy
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Table, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base

# Association tables for many-to-many relationships
patient_treatments = Table(
    'patient_treatments',
    Base.metadata,
    Column('patient_id', Integer, ForeignKey('pacientes.id')),
    Column('treatment', String(255))
)

class GenderEnum(str, enum.Enum):
    masculino = "Masculino"
    femenino = "Femenino"

class PatientStatusEnum(str, enum.Enum):
    activo = "activo"
    inactivo = "inactivo"
    nuevo = "nuevo"

class ToothStatusEnum(str, enum.Enum):
    sano = "sano"
    tratado = "tratado"
    en_tratamiento = "en_tratamiento"
    extraccion = "extraccion"
    pendiente = "pendiente"

class DoctorStatusEnum(str, enum.Enum):
    disponible = "disponible"
    en_consulta = "en-consulta"
    no_disponible = "no-disponible"

class AppointmentStatusEnum(str, enum.Enum):
    pendiente = "pendiente"
    confirmada = "confirmada"
    completada = "completada"
    cancelada = "cancelada"

class RoleEnum(str, enum.Enum):
    administrador = "Administrador"
    recepcionista = "Recepcionista"
    doctor = "Doctor"
    asistente = "Asistente"

class NotificationTypeEnum(str, enum.Enum):
    appointment_scheduled = "appointment_scheduled"
    new_patient_assigned = "new_patient_assigned"
    appointment_reminder_30m = "appointment_reminder_30m"
    appointment_started = "appointment_started"
    appointment_completed = "appointment_completed"
    appointment_cancelled = "appointment_cancelled"

# ============= EMPRESA =============
class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    rfc = Column(String(50), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    license_number = Column("license_number", String(255), unique=True, nullable=True)
    address = Column(Text, nullable=True)
    specialties = Column(JSON, default=[])  # Array of specialties
    status = Column(String(50), default="activa")  # activa, inactiva, suspendida
    subscription_plan = Column(String(50), default="free")  # free, basic, premium
    max_users = Column(Integer, default=10)
    max_patients = Column(Integer, default=500)
    logo_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    usuarios = relationship("Usuario", back_populates="empresa")
    pacientes = relationship("Paciente", back_populates="empresa")
    doctores = relationship("Doctor", back_populates="empresa")
    citas = relationship("Cita", back_populates="empresa")

# ============= PACIENTES =============
class Paciente(Base):
    __tablename__ = "pacientes"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    name = Column(String(255), index=True)
    initials = Column(String(2))
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(20))
    age = Column(Integer)
    gender = Column(Enum(GenderEnum))
    last_visit = Column("lastVisit", String(10))  # YYYY-MM-DD
    next_appt = Column("nextAppt", String(10), nullable=True)  # YYYY-MM-DD
    doctor = Column(String(255))
    status = Column(Enum(PatientStatusEnum), default=PatientStatusEnum.nuevo)
    total_visits = Column("totalVisits", Integer, default=0)
    balance = Column(Float, default=0.0)
    whatsapp_phone = Column(String(20), nullable=True)
    last_whatsapp_contact = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    empresa = relationship("Empresa", back_populates="pacientes")
    teeth = relationship("Diente", back_populates="paciente", cascade="all, delete-orphan")
    appointments = relationship("Cita", back_populates="paciente")

class Diente(Base):
    __tablename__ = "dientes"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("pacientes.id"))
    number = Column(Integer)
    name = Column(String(255))
    status = Column(Enum(ToothStatusEnum), default=ToothStatusEnum.sano)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    paciente = relationship("Paciente", back_populates="teeth")
    records = relationship("RegistroDental", back_populates="diente", cascade="all, delete-orphan")

class RegistroDental(Base):
    __tablename__ = "registros_dentales"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    tooth_id = Column(Integer, ForeignKey("dientes.id"))
    date = Column(String(10))  # YYYY-MM-DD
    treatment = Column(String(255))
    doctor = Column(String(255))
    notes = Column(Text, nullable=True)
    cost = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    diente = relationship("Diente", back_populates="records")
    attachments = relationship("Adjunto", back_populates="registro", cascade="all, delete-orphan")

class Adjunto(Base):
    __tablename__ = "adjuntos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    record_id = Column(Integer, ForeignKey("registros_dentales.id"))
    name = Column(String(255))
    size = Column(String(50))
    type = Column(String(50))
    file_path = Column(String(500))
    download_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    registro = relationship("RegistroDental", back_populates="attachments")

# ============= DOCTORES =============
class Doctor(Base):
    __tablename__ = "doctores"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    name = Column(String(255))
    initials = Column(String(2))
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20))
    specialty = Column(String(255))
    license_number = Column("licenseNumber", String(50), unique=True)
    status = Column(Enum(DoctorStatusEnum), default=DoctorStatusEnum.disponible)
    patients_today = Column("patientsToday", Integer, default=0)
    patients_total = Column("patientsTotal", Integer, default=0)
    rating = Column(Float, default=0.0)
    review_count = Column("reviewCount", Integer, default=0)
    years_experience = Column("yearsExperience", Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    empresa = relationship("Empresa", back_populates="doctores")
    usuario = relationship("Usuario", uselist=False, back_populates="doctor", foreign_keys="Usuario.doctor_id")
    appointments = relationship("Cita", back_populates="doctor")
    work_schedule = relationship("HorarioDoctor", back_populates="doctor", cascade="all, delete-orphan")
    monthly_stats = relationship("EstadisticasDoctor", back_populates="doctor", uselist=False)

class HorarioDoctor(Base):
    __tablename__ = "horarios_doctores"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctores.id"))
    day = Column(String(20))
    active = Column(Boolean, default=True)
    start_time = Column("startTime", String(5))  # HH:MM
    end_time = Column("endTime", String(5))    # HH:MM
    break_start = Column("breakStart", String(5), nullable=True)  # HH:MM
    break_end = Column("breakEnd", String(5), nullable=True)    # HH:MM
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    doctor = relationship("Doctor", back_populates="work_schedule")

class EstadisticasDoctor(Base):
    __tablename__ = "estadisticas_doctores"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctores.id"), unique=True)
    completed = Column(Integer, default=0)
    cancelled = Column(Integer, default=0)
    revenue = Column(Float, default=0.0)
    month = Column(Integer)
    year = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    doctor = relationship("Doctor", back_populates="monthly_stats")

# ============= CITAS =============
class Cita(Base):
    __tablename__ = "citas"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("pacientes.id"))
    doctor_id = Column(Integer, ForeignKey("doctores.id"))
    treatment = Column(String(255))
    date = Column(String(10))  # YYYY-MM-DD
    time = Column(String(5))   # HH:MM
    duration = Column(String(20))
    status = Column(Enum(AppointmentStatusEnum), default=AppointmentStatusEnum.pendiente)
    cost = Column(Float)
    notes = Column(Text, nullable=True)
    google_calendar_event_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    empresa = relationship("Empresa", back_populates="citas")
    paciente = relationship("Paciente", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")

# ============= CONFIGURACIÓN =============
class ConfiguracionClinica(Base):
    __tablename__ = "configuracion_clinica"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, unique=True)
    name = Column(String(255))
    rfc = Column(String(50), unique=True)
    phone = Column(String(20))
    email = Column(String(255))
    website = Column(String(255), nullable=True)
    license_number = Column("licenseNumber", String(100))
    address = Column(Text)
    specialties = Column(JSON)  # Array of strings
    logo_url = Column(String(500), nullable=True)  # URL del logo
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ConfiguracionHorario(Base):
    __tablename__ = "configuracion_horario"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, unique=True)
    appointmentDuration = Column(Integer, default=30)  # minutes
    timeBetweenAppointments = Column(Integer, default=15)  # minutes
    maxAppointmentsPerDoctorPerDay = Column(Integer, default=12)
    minAdvanceBookingDays = Column(Integer, default=1)
    workDays = Column(JSON)  # Array of work day objects
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ConfiguracionSeguridad(Base):
    __tablename__ = "configuracion_seguridad"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, unique=True)
    twoFactor = Column(Boolean, default=False)
    autoLogout = Column(Boolean, default=True)
    activityLog = Column(Boolean, default=True)
    dataEncryption = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ConfiguracionFacturacion(Base):
    __tablename__ = "configuracion_facturacion"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, unique=True)
    currency = Column(String(3), default="mxn")
    taxRate = Column(Float, default=16.0)
    invoicePrefix = Column(String(50))
    nextNumber = Column(Integer)
    autoInvoice = Column(Boolean, default=True)
    paymentReminder = Column(Boolean, default=True)
    monthlyRevenue = Column(Float, default=0.0)
    pendingBalance = Column(Float, default=0.0)
    overdueInvoices = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ConfiguracionNotificaciones(Base):
    __tablename__ = "configuracion_notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, unique=True)
    notifications = Column(JSON)  # Array of notification objects
    emailServer = Column(JSON)  # Email configuration
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============= USUARIOS =============
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctores.id"), nullable=True)
    name = Column(String(255))
    initials = Column(String(2))
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    role = Column(Enum(RoleEnum))
    lastAccess = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    empresa = relationship("Empresa", back_populates="usuarios")
    doctor = relationship("Doctor", uselist=False, foreign_keys=[doctor_id])

# ============= NOTIFICACIONES =============
class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)

    # Multi-tenant isolation
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)

    # Recipients (one or both may be set)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctores.id"), nullable=True, index=True)

    # Context information
    patient_id = Column(Integer, ForeignKey("pacientes.id"), nullable=True)
    appointment_id = Column(Integer, ForeignKey("citas.id"), nullable=True, index=True)

    # Content
    type = Column(String, nullable=False)  # Using String instead of Enum for flexibility
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Status tracking
    read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime, nullable=True)

    # Audit
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    empresa = relationship("Empresa")
    usuario = relationship("Usuario")
    doctor = relationship("Doctor")
    paciente = relationship("Paciente")
    cita = relationship("Cita")

# ============= ESTADÍSTICAS =============
class DashboardStats(Base):
    __tablename__ = "dashboard_stats"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, unique=True)
    today_appointments = Column("today_appointments", Integer, default=0)
    active_patients = Column("active_patients", Integer, default=0)
    monthly_revenue = Column("monthly_revenue", Float, default=0.0)
    return_rate = Column("return_rate", Integer, default=0)
    weekly_data = Column("weekly_data", JSON)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
