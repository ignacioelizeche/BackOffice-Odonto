"""
N8N Integration Service
Handles communication with N8N workflows for calendar and other automated tasks
"""

import httpx
import logging
import json
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)


class N8NIntegrationService:
    """Service to trigger N8N workflows"""

    @staticmethod
    async def trigger_create_doctor_calendar(
        doctor_id: int,
        doctor_name: str,
        doctor_email: str,
        doctor_password: str,
        empresa_id: int,
        callback_url: str
    ) -> dict:
        """
        Triggers N8N workflow to create a Google Calendar for a new doctor

        Args:
            doctor_id: ID of the newly created doctor
            doctor_name: Name of the doctor
            doctor_email: Email of the doctor
            doctor_password: Password for the doctor's account
            empresa_id: ID of the enterprise
            callback_url: Backend callback URL for N8N to send calendar ID

        Returns:
            Response from N8N workflow

        Raises:
            Exception if N8N webhook is not configured or request fails
        """
        webhook_url = settings.N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL

        logger.info(f"[N8N] trigger_create_doctor_calendar called for doctor {doctor_id}")
        logger.info(f"[N8N] Webhook URL configured: {bool(webhook_url)}")
        logger.info(f"[N8N] Webhook URL value: {webhook_url}")

        if not webhook_url:
            error_msg = "N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL not configured"
            logger.error(f"[N8N] {error_msg}")
            raise Exception(error_msg)

        payload = {
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "doctor_email": doctor_email,
            "doctor_password": doctor_password,
            "empresa_id": empresa_id,
            "webhook_url": callback_url
        }

        logger.info(f"[N8N] Payload to send: {json.dumps(payload, indent=2)}")

        try:
            logger.info(f"[N8N] Sending POST request to: {webhook_url}")
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    timeout=30.0
                )

                logger.info(f"[N8N] Response status code: {response.status_code}")
                logger.info(f"[N8N] Response body: {response.text}")

                response.raise_for_status()

                logger.info(f"[N8N] Successfully triggered N8N calendar creation for doctor {doctor_id}")
                try:
                    return response.json()
                except:
                    return {"success": True}

        except httpx.HTTPError as e:
            error_msg = f"Failed to trigger N8N calendar creation (HTTP Error): {str(e)}"
            logger.error(f"[N8N] {error_msg}")
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error triggering N8N workflow: {str(e)}"
            logger.error(f"[N8N] {error_msg}")
            raise

    @staticmethod
    async def trigger_update_appointment(
        appointment_id: int,
        doctor_id: int,
        patient_name: str,
        appointment_date: datetime,
        appointment_time: str,
        status: str,
        google_calendar_event_id: str = None,
        empresa_id: int = None
    ) -> dict:
        """
        Triggers N8N workflow to update/create appointment in Google Calendar

        Args:
            appointment_id: ID of the appointment
            doctor_id: ID of the doctor
            patient_name: Name of the patient
            appointment_date: Date of the appointment
            appointment_time: Time of the appointment
            status: Status of the appointment
            google_calendar_event_id: Existing Google Calendar event ID (if any)
            empresa_id: ID of the enterprise

        Returns:
            Response from N8N workflow
        """
        webhook_url = settings.N8N_UPDATE_APPOINTMENT_WEBHOOK_URL

        logger.info(f"[N8N] trigger_update_appointment called for appointment {appointment_id}")

        if not webhook_url:
            logger.warning("[N8N] N8N_UPDATE_APPOINTMENT_WEBHOOK_URL not configured - skipping calendar sync")
            return {"success": True, "skipped": True}

        payload = {
            "appointment_id": appointment_id,
            "doctor_id": doctor_id,
            "patient_name": patient_name,
            "appointment_date": appointment_date.isoformat() if appointment_date else None,
            "appointment_time": appointment_time,
            "status": status,
            "google_calendar_event_id": google_calendar_event_id,
            "empresa_id": empresa_id
        }

        logger.info(f"[N8N] Update appointment payload: {json.dumps(payload, indent=2, default=str)}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    timeout=30.0
                )

                logger.info(f"[N8N] Update appointment response: {response.status_code} - {response.text}")
                response.raise_for_status()

                try:
                    return response.json()
                except:
                    return {"success": True}

        except httpx.HTTPError as e:
            logger.error(f"[N8N] Failed to update appointment in calendar: {str(e)}")
            # Don't raise error - appointment update should succeed even if calendar sync fails
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"[N8N] Unexpected error updating appointment: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def trigger_delete_appointment(
        appointment_id: int,
        google_calendar_event_id: str,
        doctor_id: int = None,
        empresa_id: int = None
    ) -> dict:
        """
        Triggers N8N workflow to delete appointment from Google Calendar

        Args:
            appointment_id: ID of the appointment
            google_calendar_event_id: Google Calendar event ID to delete
            doctor_id: ID of the doctor (optional)
            empresa_id: ID of the enterprise (optional)

        Returns:
            Response from N8N workflow
        """
        webhook_url = settings.N8N_DELETE_APPOINTMENT_WEBHOOK_URL

        logger.info(f"[N8N] trigger_delete_appointment called for appointment {appointment_id}")

        if not webhook_url:
            logger.warning("[N8N] N8N_DELETE_APPOINTMENT_WEBHOOK_URL not configured - skipping calendar sync")
            return {"success": True, "skipped": True}

        if not google_calendar_event_id:
            logger.info(f"[N8N] No google_calendar_event_id for appointment {appointment_id} - skipping delete")
            return {"success": True, "skipped": True}

        payload = {
            "appointment_id": appointment_id,
            "google_calendar_event_id": google_calendar_event_id,
            "doctor_id": doctor_id,
            "empresa_id": empresa_id
        }

        logger.info(f"[N8N] Delete appointment payload: {json.dumps(payload, indent=2)}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    timeout=30.0
                )

                logger.info(f"[N8N] Delete appointment response: {response.status_code} - {response.text}")
                response.raise_for_status()

                try:
                    return response.json()
                except:
                    return {"success": True}

        except httpx.HTTPError as e:
            logger.error(f"[N8N] Failed to delete appointment from calendar: {str(e)}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"[N8N] Unexpected error deleting appointment: {str(e)}")
            return {"success": False, "error": str(e)}


# Singleton instance
n8n_service = N8NIntegrationService()
