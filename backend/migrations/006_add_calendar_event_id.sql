-- Migration 006: Add google_calendar_event_id to citas table
-- This column stores the Google Calendar event ID for WhatsApp-created appointments
-- so that cancel/reschedule flows can update/delete the calendar event.

ALTER TABLE citas ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255) DEFAULT NULL;
