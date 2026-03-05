"""
Notifications router - Endpoints for notification management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models import Notificacion
from app.schemas import NotificacionResponse, NotificacionesListResponse
from app.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


# CORS preflight handlers for all notificaciones endpoints
@router.options("")
def options_notifications():
    """Handle CORS preflight for notifications list"""
    return {}


@router.options("/{notification_id}")
def options_notification_detail(notification_id: int):
    """Handle CORS preflight for notification detail"""
    return {}


@router.options("/{notification_id}/read")
def options_notification_read(notification_id: int):
    """Handle CORS preflight for mark as read"""
    return {}


@router.options("/mark-all-read")
def options_mark_all_read():
    """Handle CORS preflight for mark all as read"""
    return {}



@router.get("", response_model=NotificacionesListResponse)
def get_notifications(
    limit: int = Query(10, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get notifications for the current user
    - Doctors see only their notifications
    - Admins see all notifications in their enterprise

    Query params:
        limit: Number of notifications to return (max 100)
        skip: Number of notifications to skip (for pagination)
    """
    query = db.query(Notificacion).filter(
        Notificacion.empresa_id == current_user.empresa_id
    )

    # If user is a doctor, filter to only their notifications
    if current_user.role == "Doctor" and current_user.doctor_id:
        query = query.filter(
            Notificacion.doctor_id == current_user.doctor_id
        )

    # Count unread notifications (before applying limit/skip)
    total_unread = query.filter(Notificacion.read == False).count()

    # Get notifications ordered by most recent first
    notifications = query.order_by(
        Notificacion.created_at.desc()
    ).offset(skip).limit(limit).all()

    return NotificacionesListResponse(
        data=[NotificacionResponse.from_orm(n) for n in notifications],
        unread_count=total_unread
    )


@router.get("/{notification_id}", response_model=NotificacionResponse)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get a specific notification by ID
    User can only access their own notifications
    """
    notification = db.query(Notificacion).filter(
        Notificacion.id == notification_id,
        Notificacion.empresa_id == current_user.empresa_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada"
        )

    # Check if user is authorized to view this notification
    if current_user.role == "Doctor":
        if notification.doctor_id != current_user.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para acceder a esta notificación"
            )

    return NotificacionResponse.from_orm(notification)


@router.put("/{notification_id}/read", response_model=NotificacionResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Mark a notification as read
    User can only mark their own notifications
    """
    notification = db.query(Notificacion).filter(
        Notificacion.id == notification_id,
        Notificacion.empresa_id == current_user.empresa_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada"
        )

    # Check authorization
    if current_user.role == "Doctor":
        if notification.doctor_id != current_user.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para marcar esta notificación"
            )

    # Mark as read
    notification.read = True
    notification.read_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(notification)

    logger.info(f"[Notification] Marked notification {notification_id} as read")

    return NotificacionResponse.from_orm(notification)


@router.put("/mark-all-read")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Mark all notifications as read for the current user
    - Doctors mark only their notifications
    - Admins mark all notifications in their enterprise
    """
    query = db.query(Notificacion).filter(
        Notificacion.empresa_id == current_user.empresa_id,
        Notificacion.read == False
    )

    # If user is a doctor, filter to only their notifications
    if current_user.role == "Doctor" and current_user.doctor_id:
        query = query.filter(
            Notificacion.doctor_id == current_user.doctor_id
        )

    # Update all
    count = query.update({
        Notificacion.read: True,
        Notificacion.read_at: datetime.now(timezone.utc)
    }, synchronize_session=False)

    db.commit()

    logger.info(f"[Notification] Marked {count} notifications as read for user {current_user.id}")

    return {
        "message": f"Marked {count} notifications as read",
        "count": count
    }


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete a notification
    User can only delete their own notifications
    """
    notification = db.query(Notificacion).filter(
        Notificacion.id == notification_id,
        Notificacion.empresa_id == current_user.empresa_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada"
        )

    # Check authorization
    if current_user.role == "Doctor":
        if notification.doctor_id != current_user.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar esta notificación"
            )

    db.delete(notification)
    db.commit()

    logger.info(f"[Notification] Deleted notification {notification_id}")

    return {
        "message": "Notificación eliminada exitosamente"
    }
