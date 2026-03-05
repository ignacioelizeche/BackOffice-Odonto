"""
Dashboard router - Endpoints for dashboard statistics
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models import Cita, Paciente, Doctor, RegistroDental, Notificacion
from app.schemas import DashboardStatsResponse, WeeklyChartResponse, RecentActivityResponse
from app.auth import get_current_user
from sqlalchemy import func, desc

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def get_relative_time(datetime_obj: datetime) -> str:
    """Calculate relative time string from a datetime"""
    # Ensure both datetimes are in UTC for comparison
    if datetime_obj.tzinfo is None:
        # If naive, assume UTC
        datetime_obj = datetime_obj.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    diff = now - datetime_obj

    minutes = diff.total_seconds() / 60
    hours = minutes / 60
    days = hours / 24

    if minutes < 1:
        return "Hace un momento"
    elif minutes < 60:
        return f"Hace {int(minutes)} min" if int(minutes) != 1 else "Hace 1 min"
    elif hours < 24:
        return f"Hace {int(hours)} horas" if int(hours) != 1 else "Hace 1 hora"
    else:
        return f"Hace {int(days)} días" if int(days) != 1 else "Hace 1 día"

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get dashboard statistics - Filtered by empresa_id
    If current user is a Doctor, show only their statistics
    """
    today = datetime.now().strftime("%Y-%m-%d")

    # Base query filter
    base_filter = [Cita.empresa_id == current_user.empresa_id]
    patient_base_filter = [Paciente.empresa_id == current_user.empresa_id]

    # If doctor, only show their data
    if current_user.role == "Doctor" and current_user.doctor_id:
        base_filter.append(Cita.doctor_id == current_user.doctor_id)
        # For patients, need to join with citas to filter by doctor
        patient_base_filter = [
            Paciente.empresa_id == current_user.empresa_id,
            Paciente.id.in_(
                db.query(Cita.patient_id).filter(Cita.doctor_id == current_user.doctor_id)
            )
        ]

    # Count today's appointments
    today_appointments = db.query(Cita).filter(
        (Cita.date == today),
        *base_filter
    ).count()

    # Count active patients
    active_patients = db.query(Paciente).filter(
        (Paciente.status == "activo"),
        *patient_base_filter
    ).count()

    # Calculate monthly revenue (sum of completed appointments this month)
    now = datetime.now()
    first_day_of_month = now.replace(day=1).strftime("%Y-%m-%d")
    last_day_of_month = (now.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    last_day_of_month = last_day_of_month.strftime("%Y-%m-%d")

    monthly_revenue = db.query(func.sum(Cita.cost)).filter(
        (Cita.date >= first_day_of_month),
        (Cita.date <= last_day_of_month),
        (Cita.status == "completada"),
        *base_filter
    ).scalar() or 0.0

    # Calculate return rate (patients with more than one visit)
    returning_patients = db.query(func.count(Paciente.id)).filter(
        (Paciente.totalVisits > 1),
        *patient_base_filter
    ).scalar() or 0

    return_rate = int((returning_patients / max(active_patients, 1)) * 100) if active_patients > 0 else 0

    # Weekly chart data (last 7 days)
    weekly_data = {"labels": [], "scheduled": [], "completed": []}
    for i in range(6, -1, -1):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        day_name = (datetime.now() - timedelta(days=i)).strftime("%a")

        scheduled_count = db.query(Cita).filter(
            (Cita.date == date),
            *base_filter
        ).count()

        completed_count = db.query(Cita).filter(
            (Cita.date == date),
            (Cita.status == "completada"),
            *base_filter
        ).count()

        weekly_data["labels"].append(day_name)
        weekly_data["scheduled"].append(scheduled_count)
        weekly_data["completed"].append(completed_count)

    # Recent activity - Get last 5 notifications from notificaciones table
    recent_activity = []

    # Base filter for notifications
    notif_filter = [Notificacion.empresa_id == current_user.empresa_id]

    # If doctor, only show their notifications
    if current_user.role == "Doctor" and current_user.doctor_id:
        notif_filter.append(Notificacion.doctor_id == current_user.doctor_id)

    # Get the last 5 notifications ordered by creation date
    recent_notifs = db.query(Notificacion).filter(
        *notif_filter
    ).order_by(desc(Notificacion.created_at)).limit(5).all()

    for notif in recent_notifs:
        recent_activity.append(RecentActivityResponse(
            type=notif.type,
            message=notif.message,
            time=get_relative_time(notif.created_at)
        ))

    return DashboardStatsResponse(
        todayAppointments=today_appointments,
        activePatients=active_patients,
        monthlyRevenue=float(monthly_revenue),
        returnRate=return_rate,
        weeklyChart=WeeklyChartResponse(**weekly_data),
        recentActivity=recent_activity
    )
