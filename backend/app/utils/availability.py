"""
Appointment availability utilities
"""

from datetime import datetime, timedelta, time, date
from typing import List, Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import Cita, HorarioDoctor, AppointmentStatusEnum, DoctorCustomAvailability, Doctor


def parse_duration_to_minutes(duration_str: str) -> int:
    """
    Convert duration string (e.g., "60 min", "1.5 h") to minutes

    Args:
        duration_str: Duration in format "XX min" or "X.X h"

    Returns:
        Duration in minutes as integer
    """
    if not duration_str:
        return 0

    duration_str = duration_str.strip().lower()

    if "min" in duration_str:
        return int(duration_str.replace("min", "").strip())
    elif "h" in duration_str:
        hours = float(duration_str.replace("h", "").strip())
        return int(hours * 60)

    return 0


def time_to_minutes(time_str: str) -> int:
    """
    Convert time string (HH:MM) to minutes from midnight

    Args:
        time_str: Time in HH:MM format

    Returns:
        Minutes from midnight
    """
    if not time_str or ":" not in time_str:
        return 0

    parts = time_str.split(":")
    hours = int(parts[0])
    minutes = int(parts[1])

    return hours * 60 + minutes


def minutes_to_time(minutes: int) -> str:
    """
    Convert minutes from midnight to HH:MM format

    Args:
        minutes: Minutes from midnight

    Returns:
        Time in HH:MM format
    """
    hours = minutes // 60
    mins = minutes % 60

    return f"{hours:02d}:{mins:02d}"


def get_date_name(date_str: str) -> str:
    """
    Get day name from date string (YYYY-MM-DD)

    Args:
        date_str: Date in YYYY-MM-DD format

    Returns:
        Day name (Lunes, Martes, etc.)
    """
    day_names = {
        0: "Lunes",
        1: "Martes",
        2: "Miercoles",
        3: "Jueves",
        4: "Viernes",
        5: "Sabado",
        6: "Domingo"
    }

    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        return day_names[date_obj.weekday()]
    except:
        return ""


def get_custom_availability_for_date(
    doctor_id: int,
    date_str: str,
    db: Session
) -> Optional[DoctorCustomAvailability]:
    """
    Get doctor's custom availability for a specific date

    Args:
        doctor_id: Doctor ID
        date_str: Date in YYYY-MM-DD format
        db: Database session

    Returns:
        DoctorCustomAvailability object or None if no custom availability set
    """
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    except:
        return None

    custom_avail = db.query(DoctorCustomAvailability).filter(
        (DoctorCustomAvailability.doctor_id == doctor_id) &
        (DoctorCustomAvailability.date == date_obj)
    ).first()

    return custom_avail


def get_doctor_slot_duration(doctor_id: int, db: Session) -> int:
    """
    Get doctor's preferred slot duration

    Args:
        doctor_id: Doctor ID
        db: Database session

    Returns:
        Slot duration in minutes (defaults to 30 if not set)
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if doctor and doctor.preferred_slot_duration:
        return doctor.preferred_slot_duration
    return 30  # default


def get_doctor_schedule_for_date(
    doctor_id: int,
    date_str: str,
    db: Session
) -> Optional[Dict[str, Any]]:
    """
    Get doctor's schedule for a specific date
    Checks custom availability first, falls back to weekly pattern

    Args:
        doctor_id: Doctor ID
        date_str: Date in YYYY-MM-DD format
        db: Database session

    Returns:
        Dict with schedule info or None if doctor doesn't work that day
        Format: {
            'active': bool,
            'start_time': str,
            'end_time': str,
            'break_start': str or None,
            'break_end': str or None,
            'is_custom': bool
        }
    """
    # First, check for custom availability for this specific date
    custom_avail = get_custom_availability_for_date(doctor_id, date_str, db)

    if custom_avail:
        # Custom availability found - use it
        if not custom_avail.available:
            return None  # Doctor explicitly not available this day

        return {
            'active': True,
            'start_time': custom_avail.start_time.strftime('%H:%M') if custom_avail.start_time else None,
            'end_time': custom_avail.end_time.strftime('%H:%M') if custom_avail.end_time else None,
            'break_start': custom_avail.break_start.strftime('%H:%M') if custom_avail.break_start else None,
            'break_end': custom_avail.break_end.strftime('%H:%M') if custom_avail.break_end else None,
            'is_custom': True
        }

    # No custom availability - fall back to weekly pattern
    day_name = get_date_name(date_str)

    if not day_name:
        return None

    schedule = db.query(HorarioDoctor).filter(
        (HorarioDoctor.doctor_id == doctor_id) &
        (HorarioDoctor.day == day_name)
    ).first()

    if not schedule or not schedule.active:
        return None

    return {
        'active': schedule.active,
        'start_time': schedule.start_time,
        'end_time': schedule.end_time,
        'break_start': schedule.break_start,
        'break_end': schedule.break_end,
        'is_custom': False
    }


def generate_time_slots(
    start_time: str,
    end_time: str,
    break_start: Optional[str] = None,
    break_end: Optional[str] = None,
    slot_duration: int = 30
) -> List[str]:
    """
    Generate time slots within work hours, excluding break time

    Args:
        start_time: Start time in HH:MM format
        end_time: End time in HH:MM format
        break_start: Break start time in HH:MM format (optional)
        break_end: Break end time in HH:MM format (optional)
        slot_duration: Duration of each slot in minutes (default: 30)

    Returns:
        List of time slots in HH:MM format
    """
    slots = []

    start_minutes = time_to_minutes(start_time)
    end_minutes = time_to_minutes(end_time)
    break_start_minutes = time_to_minutes(break_start) if break_start else None
    break_end_minutes = time_to_minutes(break_end) if break_end else None

    current_minutes = start_minutes

    while current_minutes < end_minutes:
        # Check if this time is during break
        if break_start_minutes and break_end_minutes:
            if current_minutes >= break_start_minutes and current_minutes < break_end_minutes:
                current_minutes += slot_duration
                continue

        slots.append(minutes_to_time(current_minutes))
        current_minutes += slot_duration

    return slots


def get_occupied_blocks(
    doctor_id: int,
    date_str: str,
    db: Session,
    exclude_appointment_id: Optional[int] = None
) -> List[Tuple[int, int]]:
    """
    Get occupied time blocks (as minutes from midnight) for a doctor on a date

    Args:
        doctor_id: Doctor ID
        date_str: Date in YYYY-MM-DD format
        db: Database session
        exclude_appointment_id: Optional appointment ID to exclude (for rescheduling)

    Returns:
        List of tuples (start_minutes, end_minutes) for occupied blocks
    """
    # Get all non-cancelled appointments for this doctor on this date
    query = db.query(Cita).filter(
        (Cita.doctor_id == doctor_id) &
        (Cita.date == date_str) &
        (Cita.status != AppointmentStatusEnum.cancelada)
    )

    if exclude_appointment_id is not None:
        query = query.filter(Cita.id != exclude_appointment_id)

    appointments = query.all()

    occupied_blocks = []

    for appointment in appointments:
        start_minutes = time_to_minutes(appointment.time)
        duration_minutes = parse_duration_to_minutes(appointment.duration)
        end_minutes = start_minutes + duration_minutes

        occupied_blocks.append((start_minutes, end_minutes))

    return occupied_blocks


def is_time_available(
    start_time: str,
    duration_minutes: int,
    occupied_blocks: List[Tuple[int, int]]
) -> bool:
    """
    Check if a time slot + duration is available (no conflicts with occupied blocks)

    Args:
        start_time: Start time in HH:MM format
        duration_minutes: Duration in minutes
        occupied_blocks: List of (start_minutes, end_minutes) tuples

    Returns:
        True if available, False otherwise
    """
    start_minutes = time_to_minutes(start_time)
    end_minutes = start_minutes + duration_minutes

    for block_start, block_end in occupied_blocks:
        # Check for any overlap
        if (start_minutes < block_end) and (end_minutes > block_start):
            return False

    return True


def is_time_within_schedule(start_time: str, duration_minutes: int, schedule: Dict[str, Any]) -> bool:
    """
    Check if a time + duration fits within the doctor's schedule

    Args:
        start_time: Start time in HH:MM format
        duration_minutes: Duration in minutes
        schedule: Schedule dict from get_doctor_schedule_for_date

    Returns:
        True if fits within schedule, False otherwise
    """
    if not schedule or not schedule.get('active'):
        return False

    start_minutes = time_to_minutes(start_time)
    end_minutes = start_minutes + duration_minutes

    schedule_start = time_to_minutes(schedule['start_time'])
    schedule_end = time_to_minutes(schedule['end_time'])

    # Basic check: appointment must be within schedule hours
    if start_minutes < schedule_start or end_minutes > schedule_end:
        return False

    # Check if appointment overlaps with break
    if schedule.get('break_start') and schedule.get('break_end'):
        break_start = time_to_minutes(schedule['break_start'])
        break_end = time_to_minutes(schedule['break_end'])

        # Appointment overlaps with break if it starts before break ends and ends after break starts
        if start_minutes < break_end and end_minutes > break_start:
            return False

    return True


def get_available_slots(
    doctor_id: int,
    date_str: str,
    db: Session,
    slot_duration: Optional[int] = None
) -> List[str]:
    """
    Get all available time slots for a doctor on a specific date
    Uses doctor's preferred slot duration if not specified

    Main orchestration function that combines all availability checks

    Args:
        doctor_id: Doctor ID
        date_str: Date in YYYY-MM-DD format
        db: Database session
        slot_duration: Duration of each slot in minutes (uses doctor's preference if not specified)

    Returns:
        List of available time slots in HH:MM format
    """
    # Get doctor's schedule for this day (custom or weekly pattern)
    schedule = get_doctor_schedule_for_date(doctor_id, date_str, db)

    if not schedule or not schedule['active']:
        return []

    # Use doctor's preferred slot duration if not specified
    if slot_duration is None:
        slot_duration = get_doctor_slot_duration(doctor_id, db)

    # Generate all possible slots for this day
    all_slots = generate_time_slots(
        schedule['start_time'],
        schedule['end_time'],
        schedule.get('break_start'),
        schedule.get('break_end'),
        slot_duration
    )

    # Get occupied blocks
    occupied_blocks = get_occupied_blocks(doctor_id, date_str, db)

    # Filter available slots (those that don't conflict with occupied blocks)
    available_slots = []
    for slot in all_slots:
        if is_time_available(slot, slot_duration, occupied_blocks):
            available_slots.append(slot)

    return available_slots


def validate_appointment_availability(
    doctor_id: int,
    date: str,
    time: str,
    duration: str,
    db: Session,
    exclude_appointment_id: Optional[int] = None
) -> Tuple[bool, Optional[str]]:
    """
    Comprehensive validation for appointment availability
    Considers custom availability and doctor-specific constraints

    Args:
        doctor_id: Doctor ID
        date: Date in YYYY-MM-DD format
        time: Start time in HH:MM format
        duration: Duration string (e.g., "60 min")
        db: Database session
        exclude_appointment_id: Optional appointment ID to exclude (for rescheduling)

    Returns:
        Tuple (is_available: bool, error_message: Optional[str])
    """
    # Check if date is not in the past
    try:
        appointment_date = datetime.strptime(date, "%Y-%m-%d").date()
        today = datetime.now().date()

        if appointment_date < today:
            return False, "No se pueden agendar citas en fechas pasadas"
    except:
        return False, "Fecha inválida"

    # Check if doctor has schedule for this day (custom or weekly)
    schedule = get_doctor_schedule_for_date(doctor_id, date, db)

    if not schedule:
        return False, "Doctor no tiene horario asignado para este día"

    if not schedule['active']:
        return False, "Doctor no atiende este día"

    # Convert duration
    duration_minutes = parse_duration_to_minutes(duration)

    # Check if time is within schedule
    if not is_time_within_schedule(time, duration_minutes, schedule):
        return False, "Hora fuera del horario del doctor o conflicto con descanso"

    # Check if time is available (no conflicts with existing appointments)
    occupied_blocks = get_occupied_blocks(doctor_id, date, db, exclude_appointment_id)

    if not is_time_available(time, duration_minutes, occupied_blocks):
        return False, "Ese horario no está disponible"

    return True, None
