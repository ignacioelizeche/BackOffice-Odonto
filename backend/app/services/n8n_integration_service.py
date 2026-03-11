"""
N8N Integration Service
Handles communication with N8N workflows for calendar and other automated tasks
"""

import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class N8NIntegrationService:
    """Service to trigger N8N workflows"""

    @staticmethod
    async def trigger_create_doctor_calendar(
        doctor_id: int,
        doctor_name: str,
        doctor_email: str,
        empresa_id: int,
        callback_url: str
    ) -> dict:
        """
        Triggers N8N workflow to create a Google Calendar for a new doctor

        Args:
            doctor_id: ID of the newly created doctor
            doctor_name: Name of the doctor
            doctor_email: Email of the doctor
            empresa_id: ID of the enterprise
            callback_url: Backend callback URL for N8N to send calendar ID

        Returns:
            Response from N8N workflow

        Raises:
            Exception if N8N webhook is not configured or request fails
        """
        webhook_url = settings.N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL

        if not webhook_url:
            error_msg = "N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL not configured"
            logger.error(error_msg)
            raise Exception(error_msg)

        payload = {
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "doctor_email": doctor_email,
            "empresa_id": empresa_id,
            "webhook_url": callback_url
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()

                logger.info(f"Successfully triggered N8N calendar creation for doctor {doctor_id}")
                return response.json()

        except httpx.HTTPError as e:
            error_msg = f"Failed to trigger N8N calendar creation: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error triggering N8N workflow: {str(e)}"
            logger.error(error_msg)
            raise


# Singleton instance
n8n_service = N8NIntegrationService()
