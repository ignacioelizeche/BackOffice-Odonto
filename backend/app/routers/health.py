"""
Health check endpoints for monitoring and deployment
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from app.database import get_db
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint for load balancers and monitoring.
    Returns 200 if database is accessible, 503 otherwise.
    """
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "healthy"
        status_code = 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        db_status = f"unhealthy: {str(e)}"
        status_code = 503

    return {
        "status": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "backoffice-api"
    }, status_code


@router.get("/health/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """
    Readiness check - indicates if the service is ready to handle traffic.
    """
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return {
            "status": "not_ready",
            "error": str(e)
        }, 503


@router.get("/health/live")
async def liveness_check():
    """
    Liveness check - simple endpoint to verify service is running.
    """
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
