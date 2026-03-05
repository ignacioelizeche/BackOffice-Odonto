"""
Authentication router
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from app.database import get_db
from app.models import Usuario, RoleEnum, Empresa
from app.auth import verify_password, create_access_token, hash_password, require_role
from app.config import settings
from app.limiter import limiter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str = Field(..., min_length=8, description="Contraseña (mínimo 8 caracteres)")
    role: str = Field(default="Recepcionista", description="Rol del usuario")
    clinic_name: str = Field(None, description="Nombre de la clínica (crea nueva empresa si se proporciona)")


class RegisterResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(request: Request, credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Endpoint de login - retorna JWT token con empresa_id
    """
    # Buscar usuario por email
    user = db.query(Usuario).filter(Usuario.email == credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar que el usuario tiene asignada una empresa
    if not user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario no tiene asignada una empresa",
        )

    # Verificar contraseña
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Crear token JWT con empresa_id y doctor_id (si es doctor)
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value if user.role else None,
        "empresa_id": user.empresa_id
    }

    # Agregar doctor_id al token si el usuario es doctor
    if user.role and user.role.value == "Doctor" and user.doctor_id:
        token_data["doctor_id"] = user.doctor_id

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value if user.role else None,
            "empresa_id": user.empresa_id,
            "doctor_id": user.doctor_id if user.doctor_id else None
        }
    }


@router.post("/register", response_model=RegisterResponse)
def register(
    body: RegisterRequest,
    db: Session = Depends(get_db),
    _admin = Depends(require_role("Administrador"))
):
    """
    Endpoint de registro de nuevo usuario
    Si clinic_name es proporcionado: crea nueva empresa y asigna usuario a ella
    Si no: asigna usuario a empresa "default"
    """
    # Validar que el rol sea válido
    valid_roles = {role.value for role in RoleEnum}
    if body.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido. Roles válidos: {', '.join(sorted(valid_roles))}"
        )

    # Verificar si el usuario ya existe
    existing_user = db.query(Usuario).filter(Usuario.email == body.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario ya existe"
        )

    # Determinar empresa: crear nueva o usar default
    if body.clinic_name:
        # Crear nueva empresa con el nombre de la clínica
        new_empresa = Empresa(
            name=body.clinic_name,
            rfc=f"RFC-{int(datetime.now().timestamp())}",  # Temporary RFC
            status="activa"
        )
        db.add(new_empresa)
        db.flush()  # Flush to get the ID without committing
        empresa_id = new_empresa.id
    else:
        # Usar empresa "default"
        default_empresa = db.query(Empresa).filter(Empresa.name == "default").first()
        if not default_empresa:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Empresa default no existe. Ejecuta las migraciones."
            )
        empresa_id = default_empresa.id

    # Crear nuevo usuario asignado a la empresa
    hashed_password = hash_password(body.password)

    new_user = Usuario(
        empresa_id=empresa_id,
        email=body.email,
        name=body.name,
        hashed_password=hashed_password,
        role=RoleEnum(body.role),
        initials=body.name[:2].upper()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "role": new_user.role.value
    }


@router.get("/me")
def get_current_user(token: str = None):
    """
    Endpoint para verificar el usuario actual
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado"
        )
    return {"message": "OK"}
