"""
WhatsApp Webhook Router - Receives and processes WhatsApp messages
Main entry point for incoming WhatsApp messages from Evolution API
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import WhatsAppSession
from app.services import whatsapp_service, whatsapp_session_service
from app.services.appointment_scheduler_service import (
    handle_agendamiento_start, handle_agendamiento_flow
)
from app.services.appointment_rescheduler_service import (
    handle_reagendamiento_start, handle_reagendamiento_flow
)
from app.services.appointment_canceller_service import (
    handle_cancelacion_start, handle_cancelacion_flow
)
from pydantic import BaseModel
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

# ============= SCHEMAS =============
class WhatsAppMessageData(BaseModel):
    serverUrl: Optional[str] = None
    from_: str = None
    id: str
    body: Optional[str] = None
    timestamp: int
    type: str

    class Config:
        populate_by_name = True


class WhatsAppIncoming(BaseModel):
    instance: str
    data: Dict[str, Any]


# ============= WEBHOOK ENDPOINT =============
@router.post("/webhook")
async def receive_whatsapp_message(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Receive incoming WhatsApp message from Evolution API.

    Expected payload structure:
    {
        "instance": "instance_name",
        "data": {
            "from": "5491123456789",
            "body": "agendar",
            "id": "message_id",
            "timestamp": 1234567890,
            "type": "chat"
        }
    }
    """
    try:
        # Get raw JSON from request
        payload = await request.json()

        instance = payload.get("instance", "default")
        data = payload.get("data", {})

        # Extract WhatsApp message details
        caller_id = data.get("from")
        message_text = data.get("body", "").strip()
        message_id = data.get("id")
        message_type = data.get("type", "chat")

        # Only process text messages
        if message_type != "chat" or not message_text:
            return {"status": "ignored", "reason": "non-text message"}

        logger.info(f"Received WhatsApp message from {caller_id}: {message_text[:50]}")

        # Extract empresa_id from instance or config
        # TODO: Map instance to empresa_id if multiple enterprises
        empresa_id = 1  # Default to first enterprise for now

        # Get or create session
        session = whatsapp_session_service.get_or_create_session(
            caller_id=caller_id,
            empresa_id=empresa_id,
            db=db,
            session_type="idle"
        )

        # Process message based on intent or phase
        response_message, updated_session = _process_message(
            session=session,
            message_text=message_text,
            empresa_id=empresa_id,
            caller_id=caller_id,
            db=db
        )

        # Send response via WhatsApp
        await whatsapp_service.send_whatsapp_message(
            caller_id=caller_id,
            message=response_message,
            instance=instance
        )

        logger.info(f"Response sent to {caller_id}")

        return {
            "status": "success",
            "message_id": message_id,
            "response": response_message
        }

    except Exception as e:
        logger.error(f"Error processing WhatsApp message: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}


# ============= MESSAGE PROCESSING LOGIC =============
def _process_message(
    session: WhatsAppSession,
    message_text: str,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> tuple:
    """
    Process incoming message and route to appropriate handler.

    Args:
        session: WhatsAppSession object
        message_text: User's message
        empresa_id: Company ID
        caller_id: WhatsApp caller ID
        db: Database session

    Returns:
        Tuple of (response_message, updated_session)
    """
    # Check for cancellation/exit intent
    if whatsapp_service.is_cancellation_request(message_text):
        whatsapp_session_service.clear_session(caller_id, empresa_id, db)
        return (
            "❌ Conversación cancelada.\n\n"
            "Escribe lo que quieras cuando necesites ayuda. 👋",
            session
        )

    # Check for back/previous intent
    if whatsapp_service.is_back_request(message_text):
        # Go back one phase
        return _handle_back_navigation(session, empresa_id, caller_id, db)

    # Check for scheduling intent
    if whatsapp_service.is_scheduling_intent(message_text):
        session = whatsapp_session_service.set_phase(
            session, "AGENDAMIENTO_DOCTOR", db
        )
        return handle_agendamiento_start(session, empresa_id, db)

    # Check for rescheduling intent
    if whatsapp_service.is_rescheduling_intent(message_text):
        session = whatsapp_session_service.set_phase(
            session, "REAGENDAMIENTO_SELECT", db
        )
        return handle_reagendamiento_start(session, empresa_id, caller_id, db)

    # Check for cancellation intent
    if whatsapp_service.is_cancellation_intent(message_text):
        session = whatsapp_session_service.set_phase(
            session, "CANCELACION_SELECT", db
        )
        return handle_cancelacion_start(session, empresa_id, caller_id, db)

    # Process based on current phase
    current_phase = session.current_phase

    if current_phase in ["AGENDAMIENTO_DOCTOR", "AGENDAMIENTO_DATE", "AGENDAMIENTO_TIME"]:
        return handle_agendamiento_flow(
            session=session,
            user_message=message_text,
            empresa_id=empresa_id,
            caller_id=caller_id,
            db=db
        )

    elif current_phase in ["REAGENDAMIENTO_SELECT", "REAGENDAMIENTO_DATE", "REAGENDAMIENTO_TIME"]:
        return handle_reagendamiento_flow(
            session=session,
            user_message=message_text,
            empresa_id=empresa_id,
            caller_id=caller_id,
            db=db
        )

    elif current_phase in ["CANCELACION_SELECT", "CANCELACION_CONFIRM"]:
        return handle_cancelacion_flow(
            session=session,
            user_message=message_text,
            empresa_id=empresa_id,
            caller_id=caller_id,
            db=db
        )

    else:
        # Idle state - show main menu
        return _show_main_menu(session, empresa_id, db)


def _show_main_menu(session: WhatsAppSession, empresa_id: int, db: Session) -> tuple:
    """Show main menu with available options."""
    message = "👋 ¡Bienvenido a AgilDent!\n\n"
    message += "¿Qué deseas hacer?\n\n"
    message += "📝 Escribe:\n"
    message += "  • 'agendar' - Reservar una cita\n"
    message += "  • 'reagendar' - Cambiar tu cita\n"
    message += "  •'cancelar' - Eliminar tu cita\n\n"
    message += "También puedes escribir lo que necesites y te ayudaremos 😊"

    return (message, session)


def _handle_back_navigation(
    session: WhatsAppSession,
    empresa_id: int,
    caller_id: str,
    db: Session
) -> tuple:
    """Handle 'back' navigation in conversation flow."""
    current_phase = session.current_phase

    # Map current phase to previous phase
    previous_phases = {
        "AGENDAMIENTO_DATE": "AGENDAMIENTO_DOCTOR",
        "AGENDAMIENTO_TIME": "AGENDAMIENTO_DATE",
        "REAGENDAMIENTO_DATE": "REAGENDAMIENTO_SELECT",
        "REAGENDAMIENTO_TIME": "REAGENDAMIENTO_DATE",
    }

    if current_phase in previous_phases:
        previous_phase = previous_phases[current_phase]
        session = whatsapp_session_service.set_phase(session, previous_phase, db)

        # Re-generate the message for the previous phase
        if previous_phase == "AGENDAMIENTO_DOCTOR":
            return handle_agendamiento_start(session, empresa_id, db)
        elif previous_phase == "AGENDAMIENTO_DATE":
            # Show dates for selected doctor again
            from datetime import datetime, timedelta
            dates_data = []
            today = datetime.now().date()
            for i in range(1, 8):
                date = today + timedelta(days=i)
                day_name = _get_spanish_day_name(date)
                dates_data.append({
                    "date": date.strftime("%d/%m"),
                    "day_name": day_name,
                    "full_date": date.strftime("%Y-%m-%d")
                })
            session = whatsapp_session_service.update_session(
                session, db, available_times=dates_data
            )
            # Return dates message
            doctor_id = session.selected_doctor_id
            from app.models import Doctor
            doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
            message = f"✅ Excelente, con {doctor.name if doctor else 'Tu doctor'}\n\n"
            message += "¿Qué día te viene bien?\n\n"
            for idx, date_info in enumerate(dates_data, 1):
                message += f"{idx}️⃣  {date_info['date']} ({date_info['day_name']})\n"
            message += "\n📱 Responde con el número"
            return (message, session)
        elif previous_phase == "REAGENDAMIENTO_SELECT":
            return handle_reagendamiento_start(session, empresa_id, caller_id, db)

    # If can't go back, show main menu
    return _show_main_menu(session, empresa_id, db)


def _get_spanish_day_name(date) -> str:
    """Get Spanish day name from date."""
    spanish_days = {
        0: "Lunes",
        1: "Martes",
        2: "Miércoles",
        3: "Jueves",
        4: "Viernes",
        5: "Sábado",
        6: "Domingo"
    }
    return spanish_days.get(date.weekday(), "Día")


# ============= CORS PREFLIGHT =============
@router.options("/webhook")
def options_webhook():
    """Handle CORS preflight for webhook"""
    return {}
