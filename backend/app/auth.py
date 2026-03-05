"""
Authentication module with JWT
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Security scheme
security = HTTPBearer()

class TokenData:
    """Token data model"""
    def __init__(self, user_id: int = None, email: str = None, role: str = None, empresa_id: int = None, doctor_id: int = None):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.empresa_id = empresa_id  # NEW: Clinic/Enterprise ID
        self.doctor_id = doctor_id    # NEW: Doctor ID (for role-based filtering)

def hash_password(password: str) -> str:
    """Hash password using PBKDF2"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + settings.ACCESS_TOKEN_EXPIRE_DELTA

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt

def decode_token(token: str) -> TokenData:
    """Decode and validate JWT token"""
    try:
        logger.debug("[AUTH] Decoding token")
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        sub = payload.get("sub")
        if sub is None:
            logger.warning("[AUTH] Token payload missing sub claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No autorizado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id: int = int(sub)
        email: str = payload.get("email")
        role: str = payload.get("role")
        empresa_id: int = payload.get("empresa_id")
        doctor_id: int = payload.get("doctor_id")

        logger.debug("[AUTH] Token decoded successfully - user_id: %s", user_id)

        token_data = TokenData(user_id=user_id, email=email, role=role, empresa_id=empresa_id, doctor_id=doctor_id)

    except (JWTError, ValueError):
        logger.warning("[AUTH] Token validation failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token_data

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Get current authenticated user from token"""
    token = credentials.credentials
    return decode_token(token)

def require_role(required_role: str):
    """Dependency to require specific role"""
    async def role_checker(current_user: TokenData = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sin permisos para esta acción"
            )
        return current_user
    return role_checker

def require_doctor_or_admin(required_doctor_id: int):
    """Dependency to allow admin or the specific doctor to access"""
    async def doctor_or_admin_checker(current_user: TokenData = Depends(get_current_user)):
        # Admin can access everything
        if current_user.role == "Administrador":
            return current_user
        # Doctor can only access their own data
        if current_user.role == "Doctor" and current_user.doctor_id == required_doctor_id:
            return current_user
        # Otherwise, forbidden
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin permisos para esta acción"
        )
    return doctor_or_admin_checker
