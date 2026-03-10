"""
WhatsApp Service - Integration with Evolution API
Handles sending and receiving WhatsApp messages
"""

import httpx
import logging
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

# Evolution API endpoints
EVOLUTION_BASE_URL = settings.EVOLUTION_API_BASE
EVOLUTION_API_KEY = settings.EVOLUTION_API_KEY
EVOLUTION_INSTANCE_NAME = settings.EVOLUTION_INSTANCE_NAME


async def send_whatsapp_message(
    caller_id: str,
    message: str,
    instance: str = EVOLUTION_INSTANCE_NAME,
    media_url: Optional[str] = None
) -> bool:
    """
    Send a WhatsApp message via Evolution API.

    Args:
        caller_id: WhatsApp phone number (e.g., "5491123456789")
        message: Message text
        instance: Evolution instance name
        media_url: Optional URL to media file

    Returns:
        True if message sent successfully, False otherwise
    """
    try:
        url = f"{EVOLUTION_BASE_URL}/message/sendText/{instance}"

        headers = {
            "apikey": EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }

        payload = {
            "number": caller_id,
            "text": message
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()

            if response.status_code in [200, 201]:
                logger.info(f"WhatsApp message sent to {caller_id}")
                return True
            else:
                logger.error(f"Failed to send message: {response.text}")
                return False

    except Exception as e:
        logger.error(f"Error sending WhatsApp message to {caller_id}: {str(e)}")
        return False


async def send_formatted_response(
    caller_id: str,
    response_type: str,
    data: Dict[str, Any],
    instance: str = EVOLUTION_INSTANCE_NAME
) -> bool:
    """
    Send a formatted response based on type.

    Args:
        caller_id: WhatsApp phone number
        response_type: Type of response (doctors_list, times_list, confirmation, etc)
        data: Data to format
        instance: Evolution instance name

    Returns:
        True if sent successfully, False otherwise
    """
    try:
        if response_type == "doctors_list":
            message = _format_doctors_list(data)
        elif response_type == "dates_list":
            message = _format_dates_list(data)
        elif response_type == "times_list":
            message = _format_times_list(data)
        elif response_type == "appointments_list":
            message = _format_appointments_list(data)
        elif response_type == "confirmation":
            message = _format_confirmation(data)
        elif response_type == "error":
            message = _format_error(data)
        else:
            message = data.get("message", "Mensaje no reconocido")

        return await send_whatsapp_message(caller_id, message, instance)

    except Exception as e:
        logger.error(f"Error formatting response {response_type}: {str(e)}")
        return False


def _format_doctors_list(data: Dict[str, Any]) -> str:
    """Format list of doctors for selection."""
    doctors = data.get("doctors", [])

    message = "¡Hola! 👋 Bienvenido a AgilDent\n\n"
    message += "Elige un doctor:\n"

    for idx, doctor in enumerate(doctors, 1):
        name = doctor.get("name", "Dr. Desconocido")
        specialty = doctor.get("specialty", "General")
        message += f"{idx}️⃣  {name} - {specialty}\n"

    message += "\nResponde con el número (1, 2, 3...) o escribe 'cancelar' para salir"
    return message


def _format_dates_list(data: Dict[str, Any]) -> str:
    """Format list of available dates."""
    dates = data.get("dates", [])
    doctor_name = data.get("doctor_name", "Tu doctor")

    message = f"✅ Excelente, con {doctor_name}\n\n"
    message += "¿Qué día te viene bien?\n\n"

    for idx, date_info in enumerate(dates, 1):
        date_str = date_info.get("date", "")
        day_name = date_info.get("day_name", "")
        message += f"{idx}️⃣  {date_str} ({day_name})\n"

    message += "\nResponde con el número o escribe 'atrás' para cambiar doctor"
    return message


def _format_times_list(data: Dict[str, Any]) -> str:
    """Format list of available times."""
    times = data.get("times", [])
    selected_date = data.get("selected_date", "")

    message = f"📅 Perfecto, {selected_date}\n\n"
    message += "¿Qué hora prefieres?\n\n"

    for idx, time in enumerate(times, 1):
        message += f"{idx}️⃣  {time}\n"

    message += "\nResponde con el número o escribe 'atrás' para cambiar fecha"
    return message


def _format_appointments_list(data: Dict[str, Any]) -> str:
    """Format list of appointments for rescheduling/cancellation."""
    appointments = data.get("appointments", [])
    action = data.get("action", "reagendar")  # reagendar or cancelar

    if not appointments:
        return f"No tienes citas para {action}. 😢\n\nEscribe 'agendar' para reservar una nueva."

    message = f"Tus citas para {action}:\n\n"

    for idx, appt in enumerate(appointments, 1):
        date = appt.get("date", "")
        time = appt.get("time", "")
        doctor = appt.get("doctor_name", "Dr. Desconocido")
        message += f"{idx}️⃣  {date} a las {time}\n   Con: {doctor}\n\n"

    message += "Responde con el número o escribe 'cancelar' para volver"
    return message


def _format_confirmation(data: Dict[str, Any]) -> str:
    """Format appointment confirmation."""
    appointment_id = data.get("appointment_id", "")
    doctor_name = data.get("doctor_name", "Tu doctor")
    date = data.get("date", "")
    time = data.get("time", "")

    message = "✅ ¡Cita agendada exitosamente!\n\n"
    message += f"📋 Confirmación #{appointment_id}\n"
    message += f"👨‍⚕️  Doctor: {doctor_name}\n"
    message += f"📅 Fecha: {date}\n"
    message += f"⏰ Hora: {time}\n\n"
    message += "Recuerda llegar con 10 minutos de anticipación.\n"
    message += "Si necesitas reagendar o cancelar, escribe 'reagendar' o 'cancelar'"

    return message


def _format_error(data: Dict[str, Any]) -> str:
    """Format error message."""
    error_code = data.get("error_code", "unknown")

    error_messages = {
        "date_in_past": "❌ La fecha que seleccionaste ya pasó. Elige una fecha futura.",
        "date_unavailable": "❌ El doctor no atiende ese día. Elige otra fecha.",
        "time_unavailable": "❌ Esa hora no está disponible. Elige otro horario.",
        "invalid_input": "❌ No entendí tu respuesta. Por favor, responde con un número.",
        "session_expired": "⏱️  Tu sesión expiró. Escribe 'agendar' para comenzar de nuevo.",
        "appointment_not_found": "❌ No encontramos esa cita. Intenta de nuevo.",
    }

    return error_messages.get(error_code, "❌ Ocurrió un error. Por favor, intenta de nuevo.")


def parse_selection(response: str) -> Optional[int]:
    """
    Parse user selection response.

    Args:
        response: User's text response

    Returns:
        Selected number or None if invalid
    """
    try:
        # Remove spaces and convert to int
        selection = int(response.strip())
        if selection > 0:
            return selection
    except (ValueError, AttributeError):
        pass

    return None


def is_cancellation_request(message: str) -> bool:
    """Check if user wants to cancel."""
    cancel_keywords = ["cancelar", "exit", "quit", "no", "salir"]
    return message.lower().strip() in cancel_keywords or message.lower().strip() == "0"


def is_back_request(message: str) -> bool:
    """Check if user wants to go back."""
    back_keywords = ["atrás", "atras", "back", "anterior"]
    return message.lower().strip() in back_keywords


def is_scheduling_intent(message: str) -> bool:
    """Check if user wants to schedule an appointment."""
    scheduling_keywords = ["agendar", "agende", "schedule", "quiero agendar", "quisiera agendar"]
    return any(keyword in message.lower() for keyword in scheduling_keywords)


def is_rescheduling_intent(message: str) -> bool:
    """Check if user wants to reschedule."""
    rescheduling_keywords = ["reagendar", "reagende", "reschedule", "cambiar cita", "cambiar fecha"]
    return any(keyword in message.lower() for keyword in rescheduling_keywords)


def is_cancellation_intent(message: str) -> bool:
    """Check if user wants to cancel an appointment."""
    cancellation_keywords = ["cancelar cita", "cancel appointment", "quitar cita", "eliminar cita"]
    return any(keyword in message.lower() for keyword in cancellation_keywords)
