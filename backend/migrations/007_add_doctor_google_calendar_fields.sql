-- Migration 007: Add Google Calendar fields to doctores table
-- Stores individual calendar ID and sync settings for each doctor

ALTER TABLE doctores ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE doctores ADD COLUMN IF NOT EXISTS google_calendar_email VARCHAR(255) DEFAULT NULL;
ALTER TABLE doctores ADD COLUMN IF NOT EXISTS calendar_sync_enabled BOOLEAN DEFAULT TRUE;

-- Create index for faster lookups when syncing calendars
CREATE INDEX IF NOT EXISTS idx_doctores_calendar_id ON doctores(google_calendar_id);
