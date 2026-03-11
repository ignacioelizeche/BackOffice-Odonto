"""
Google Calendar Service
Handles all interactions with Google Calendar API using service account credentials
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from google.auth.service_account import Credentials
from google.oauth2.credentials import Credentials as OAuth2Credentials
from googleapiclient.discovery import build
from app.config import settings
from sqlalchemy.orm import Session
from app.models import Doctor, Cita

logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/calendar']
TIMEZONE = 'America/Argentina/Buenos_Aires'


class GoogleCalendarService:
    """Service for Google Calendar API operations"""

    def __init__(self):
        """Initialize the service with Google credentials"""
        self.service = None
        self._initialize_service()

    def _initialize_service(self):
        """Initialize Google Calendar service with service account credentials"""
        try:
            if not settings.GOOGLE_SERVICE_ACCOUNT_JSON or settings.GOOGLE_SERVICE_ACCOUNT_JSON == "{}":
                logger.warning("Google service account credentials not configured")
                return

            creds_dict = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
            credentials = Credentials.from_service_account_info(
                creds_dict,
                scopes=SCOPES
            )
            self.service = build('calendar', 'v3', credentials=credentials)
            logger.info("Google Calendar service initialized successfully")
        except json.JSONDecodeError:
            logger.error("Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON")
        except Exception as e:
            logger.error(f"Failed to initialize Google Calendar service: {str(e)}")

    def create_event(
        self,
        calendar_id: str,
        title: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        attendee_email: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Create an event in a doctor's Google Calendar

        Args:
            calendar_id: Google Calendar ID
            title: Event title
            description: Event description
            start_time: Event start time (datetime)
            end_time: Event end time (datetime)
            attendee_email: Optional attendee email

        Returns:
            Event data including event_id, or None if failed
        """
        if not self.service or not calendar_id:
            logger.error("Calendar service not initialized or calendar_id missing")
            return None

        try:
            event = {
                'summary': title,
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': TIMEZONE,
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': TIMEZONE,
                },
                'showMeAs': 'opaque',  # Mark as busy
            }

            if attendee_email:
                event['attendees'] = [{'email': attendee_email}]

            result = self.service.events().insert(
                calendarId=calendar_id,
                body=event,
                sendUpdates='eventCreators'
            ).execute()

            logger.info(f"Created calendar event: {result.get('id')} in calendar {calendar_id}")
            return result

        except Exception as e:
            logger.error(f"Failed to create calendar event: {str(e)}")
            return None

    def update_event(
        self,
        calendar_id: str,
        event_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update an event in a doctor's Google Calendar

        Args:
            calendar_id: Google Calendar ID
            event_id: Event ID to update
            title: New event title
            description: New event description
            start_time: New start time
            end_time: New end time

        Returns:
            Updated event data, or None if failed
        """
        if not self.service or not calendar_id or not event_id:
            logger.error("Missing required parameters for update")
            return None

        try:
            # Get existing event
            event = self.service.events().get(
                calendarId=calendar_id,
                eventId=event_id
            ).execute()

            # Update fields
            if title:
                event['summary'] = title
            if description:
                event['description'] = description
            if start_time:
                event['start'] = {
                    'dateTime': start_time.isoformat(),
                    'timeZone': TIMEZONE,
                }
            if end_time:
                event['end'] = {
                    'dateTime': end_time.isoformat(),
                    'timeZone': TIMEZONE,
                }

            result = self.service.events().update(
                calendarId=calendar_id,
                eventId=event_id,
                body=event,
                sendUpdates='eventCreators'
            ).execute()

            logger.info(f"Updated calendar event: {event_id} in calendar {calendar_id}")
            return result

        except Exception as e:
            logger.error(f"Failed to update calendar event: {str(e)}")
            return None

    def delete_event(
        self,
        calendar_id: str,
        event_id: str
    ) -> bool:
        """
        Delete an event from a doctor's Google Calendar

        Args:
            calendar_id: Google Calendar ID
            event_id: Event ID to delete

        Returns:
            True if successful, False otherwise
        """
        if not self.service or not calendar_id or not event_id:
            logger.error("Missing required parameters for deletion")
            return False

        try:
            self.service.events().delete(
                calendarId=calendar_id,
                eventId=event_id,
                sendUpdates='eventCreators'
            ).execute()

            logger.info(f"Deleted calendar event: {event_id} from calendar {calendar_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete calendar event: {str(e)}")
            return False

    def get_event(
        self,
        calendar_id: str,
        event_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get details of a specific event

        Args:
            calendar_id: Google Calendar ID
            event_id: Event ID to retrieve

        Returns:
            Event data, or None if failed
        """
        if not self.service or not calendar_id or not event_id:
            logger.error("Missing required parameters for retrieval")
            return None

        try:
            event = self.service.events().get(
                calendarId=calendar_id,
                eventId=event_id
            ).execute()

            return event

        except Exception as e:
            logger.error(f"Failed to get calendar event: {str(e)}")
            return None

    def get_calendar_changes(
        self,
        calendar_id: str,
        sync_token: Optional[str] = None,
        max_results: int = 100
    ) -> Optional[Dict[str, Any]]:
        """
        Get changes from a doctor's calendar since last sync

        Args:
            calendar_id: Google Calendar ID
            sync_token: Token from previous sync for incremental updates
            max_results: Maximum number of results (default: 100)

        Returns:
            Dictionary with events and nextSyncToken, or None if failed
        """
        if not self.service or not calendar_id:
            logger.error("Calendar service not initialized or calendar_id missing")
            return None

        try:
            params = {
                'calendarId': calendar_id,
                'maxResults': max_results,
                'showDeleted': True,  # Include deleted events
            }

            if sync_token:
                params['syncToken'] = sync_token
            else:
                # If no sync token, get events from last 24 hours
                now = datetime.utcnow()
                yesterday = now - timedelta(days=1)
                params['timeMin'] = yesterday.isoformat() + 'Z'

            result = self.service.events().list(**params).execute()

            logger.info(f"Retrieved {len(result.get('items', []))} events from calendar {calendar_id}")
            return result

        except Exception as e:
            logger.error(f"Failed to get calendar changes: {str(e)}")
            return None

    def list_calendars(self) -> Optional[List[Dict[str, Any]]]:
        """
        List all calendars accessible with the service account

        Returns:
            List of calendar data, or None if failed
        """
        if not self.service:
            logger.error("Calendar service not initialized")
            return None

        try:
            result = self.service.calendarList().list(maxResults=250).execute()
            calendars = result.get('items', [])
            logger.info(f"Retrieved {len(calendars)} calendars")
            return calendars

        except Exception as e:
            logger.error(f"Failed to list calendars: {str(e)}")
            return None


# Singleton instance
google_calendar_service = GoogleCalendarService()
