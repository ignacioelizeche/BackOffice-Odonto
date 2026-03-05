"""
Configuration router - Endpoints for clinic configuration
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import (
    ConfiguracionClinica, ConfiguracionHorario, ConfiguracionSeguridad,
    ConfiguracionFacturacion, ConfiguracionNotificaciones, Usuario, RoleEnum
)
from app.schemas import (
    ClinicConfigResponse, ClinicConfigUpdate, ConfigResponseMessage,
    ScheduleConfigResponse, SecurityConfigResponse, PasswordChangeRequest,
    BillingConfigResponse, BillingConfigUpdate, NotificationsConfigResponse,
    NotificationsConfigUpdate, UserResponse, UsersListResponse, UserCreate,
    UserCreateResponse, UserUpdate, UserUpdateResponse, UserDeleteResponse
)
from app.auth import get_current_user, hash_password, verify_password, require_role

router = APIRouter(prefix="/configuracion", tags=["Configuración"])

# ============= CLINIC CONFIG =============
@router.get("/clinica", response_model=ClinicConfigResponse)
def get_clinic_config(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Get clinic configuration - Only admins can view"""
    config = db.query(ConfiguracionClinica).filter(
        ConfiguracionClinica.empresa_id == current_user.empresa_id
    ).first()
    if not config:
        # Return default config
        return ClinicConfigResponse(
            name="DentalCare Pro",
            rfc="DCP-210415-AB3",
            phone="+52 55 1234 5678",
            email="contacto@dentalcarepro.com",
            licenseNumber="LS-2021-CDMX-04521",
            address="Av. Insurgentes Sur 1234, Col. Del Valle...",
            specialties=["Odontologia General", "Cirugia Oral", "Ortodoncia", "Endodoncia"]
        )
    return ClinicConfigResponse.from_orm(config)

@router.put("/clinica", response_model=ConfigResponseMessage)
def update_clinic_config(
    config_data: ClinicConfigUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Update clinic configuration - Only admins can edit"""
    config = db.query(ConfiguracionClinica).filter(
        ConfiguracionClinica.empresa_id == current_user.empresa_id
    ).first()

    if not config:
        config = ConfiguracionClinica(empresa_id=current_user.empresa_id)
        db.add(config)

    update_data = config_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)

    db.commit()
    return ConfigResponseMessage()

# ============= SCHEDULE CONFIG =============
@router.get("/horario", response_model=ScheduleConfigResponse)
def get_schedule_config(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Get schedule configuration - Only admins can view"""
    config = db.query(ConfiguracionHorario).filter(
        ConfiguracionHorario.empresa_id == current_user.empresa_id
    ).first()
    if not config:
        return ScheduleConfigResponse(
            appointmentDuration=30,
            timeBetweenAppointments=15,
            maxAppointmentsPerDoctorPerDay=12,
            minAdvanceBookingDays=1,
            workDays=[]
        )
    return ScheduleConfigResponse.from_orm(config)

@router.put("/horario", response_model=ConfigResponseMessage)
def update_schedule_config(
    config_data,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Update schedule configuration - Only admins can edit"""
    config = db.query(ConfiguracionHorario).filter(
        ConfiguracionHorario.empresa_id == current_user.empresa_id
    ).first()

    if not config:
        config = ConfiguracionHorario(empresa_id=current_user.empresa_id)
        db.add(config)

    config.appointmentDuration = config_data.appointmentDuration
    config.timeBetweenAppointments = config_data.timeBetweenAppointments
    config.maxAppointmentsPerDoctorPerDay = config_data.maxAppointmentsPerDoctorPerDay
    config.minAdvanceBookingDays = config_data.minAdvanceBookingDays
    config.workDays = [w.dict() for w in config_data.workDays]

    db.commit()
    return ConfigResponseMessage()

# ============= SECURITY CONFIG =============
@router.get("/seguridad", response_model=SecurityConfigResponse)
def get_security_config(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Get security configuration - Only admins can view"""
    config = db.query(ConfiguracionSeguridad).filter(
        ConfiguracionSeguridad.empresa_id == current_user.empresa_id
    ).first()
    if not config:
        return SecurityConfigResponse(
            twoFactor=False,
            autoLogout=True,
            activityLog=True,
            dataEncryption=True
        )
    return SecurityConfigResponse.from_orm(config)

@router.put("/seguridad", response_model=ConfigResponseMessage)
def update_security_config(
    config_data,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Update security configuration - Only admins can edit"""
    config = db.query(ConfiguracionSeguridad).filter(
        ConfiguracionSeguridad.empresa_id == current_user.empresa_id
    ).first()

    if not config:
        config = ConfiguracionSeguridad(empresa_id=current_user.empresa_id)
        db.add(config)

    update_data = config_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)

    db.commit()
    return ConfigResponseMessage()

@router.put("/contrasena", response_model=ConfigResponseMessage)
def change_password(
    password_data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Change user password - Any authenticated user can change their own"""
    if password_data.newPassword != password_data.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las contraseñas no coinciden"
        )

    user = db.query(Usuario).filter(Usuario.id == current_user.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    if not verify_password(password_data.currentPassword, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta",
            headers={"X-Error-Code": "INVALID_PASSWORD"}
        )

    user.hashed_password = hash_password(password_data.newPassword)
    db.commit()

    return ConfigResponseMessage(message="Contraseña actualizada exitosamente")

# ============= BILLING CONFIG =============
@router.get("/facturacion", response_model=BillingConfigResponse)
def get_billing_config(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Get billing configuration - Only admins can view"""
    config = db.query(ConfiguracionFacturacion).filter(
        ConfiguracionFacturacion.empresa_id == current_user.empresa_id
    ).first()
    if not config:
        return BillingConfigResponse(
            currency="mxn",
            taxRate=16,
            invoicePrefix="FAC-2026-",
            nextNumber=422,
            autoInvoice=True,
            paymentReminder=True,
            summary={
                "monthlyRevenue": 148520,
                "pendingBalance": 24300,
                "overdueInvoices": 8
            }
        )
    return BillingConfigResponse.from_orm(config)

@router.put("/facturacion", response_model=ConfigResponseMessage)
def update_billing_config(
    config_data: BillingConfigUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Update billing configuration - Only admins can edit"""
    config = db.query(ConfiguracionFacturacion).filter(
        ConfiguracionFacturacion.empresa_id == current_user.empresa_id
    ).first()

    if not config:
        config = ConfiguracionFacturacion(empresa_id=current_user.empresa_id)
        db.add(config)

    update_data = config_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)

    db.commit()
    return ConfigResponseMessage()

# ============= NOTIFICATIONS CONFIG =============
@router.get("/notificaciones", response_model=NotificationsConfigResponse)
def get_notifications_config(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Get notifications configuration - Only admins can view"""
    config = db.query(ConfiguracionNotificaciones).filter(
        ConfiguracionNotificaciones.empresa_id == current_user.empresa_id
    ).first()
    if not config:
        return NotificationsConfigResponse(
            notifications=[],
            emailServer={
                "smtpServer": "smtp.gmail.com",
                "smtpPort": 587,
                "senderEmail": "notificaciones@dentalcarepro.com",
                "senderName": "DentalCare Pro",
                "useSSL": True
            }
        )
    return NotificationsConfigResponse.from_orm(config)

@router.put("/notificaciones", response_model=ConfigResponseMessage)
def update_notifications_config(
    config_data: NotificationsConfigUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Update notifications configuration - Only admins can edit"""
    config = db.query(ConfiguracionNotificaciones).filter(
        ConfiguracionNotificaciones.empresa_id == current_user.empresa_id
    ).first()

    if not config:
        config = ConfiguracionNotificaciones(empresa_id=current_user.empresa_id)
        db.add(config)

    if config_data.notifications:
        config.notifications = [n.dict() for n in config_data.notifications]
    if config_data.emailServer:
        config.emailServer = config_data.emailServer.dict()

    db.commit()
    return ConfigResponseMessage()

# ============= USERS =============
@router.get("/usuarios", response_model=UsersListResponse)
def list_users(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all users - Filtered by empresa_id"""
    users = db.query(Usuario).filter(Usuario.empresa_id == current_user.empresa_id).all()
    return UsersListResponse(data=[UserResponse.from_orm(u) for u in users])

@router.post("/usuarios", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Create a new user - Assigned to current empresa_id"""
    # Check if email already exists
    existing = db.query(Usuario).filter(Usuario.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email ya está registrado",
            headers={"X-Error-Code": "EMAIL_EXISTS"}
        )

    initials = (user_data.name.split()[0][0] + user_data.name.split()[-1][0]).upper()

    db_user = Usuario(
        name=user_data.name,
        initials=initials,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        empresa_id=current_user.empresa_id
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return UserCreateResponse(**UserResponse.from_orm(db_user).dict())

@router.put("/usuarios/{user_id}", response_model=UserUpdateResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Update a user - Verified by empresa_id"""
    user = db.query(Usuario).filter(Usuario.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # Verify user belongs to current user's enterprise
    if user.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este usuario",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    return UserUpdateResponse()

@router.delete("/usuarios/{user_id}", response_model=UserDeleteResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("Administrador"))
):
    """Delete a user - Verified by empresa_id"""
    user = db.query(Usuario).filter(Usuario.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # Verify user belongs to current user's enterprise
    if user.empresa_id != current_user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este usuario",
            headers={"X-Error-Code": "FORBIDDEN"}
        )

    # Check if it's the last admin in the enterprise
    if user.role == "Administrador":
        admin_count = db.query(Usuario).filter(
            (Usuario.role == "Administrador") &
            (Usuario.empresa_id == current_user.empresa_id)
        ).count()
        if admin_count == 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puede eliminar el único administrador",
                headers={"X-Error-Code": "CANNOT_DELETE_LAST_ADMIN"}
            )

    db.delete(user)
    db.commit()

    return UserDeleteResponse()
