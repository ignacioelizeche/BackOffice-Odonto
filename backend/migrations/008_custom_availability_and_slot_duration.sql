-- Migration 008: Custom availability and flexible appointment intervals
-- Adds support for:
-- 1. Doctor-specific date availability (not just weekly patterns)
-- 2. Configurable appointment slot durations per doctor (10-15 minutes instead of global 20+ min)

-- Add slot duration preferences to doctores table
ALTER TABLE doctores ADD COLUMN IF NOT EXISTS preferred_slot_duration INTEGER DEFAULT 30;
ALTER TABLE doctores ADD COLUMN IF NOT EXISTS minimum_slot_duration INTEGER DEFAULT 15;

-- Create table for custom date-specific availability
CREATE TABLE IF NOT EXISTS doctor_custom_availability (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctores(id) ON DELETE CASCADE,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    break_start TIME,
    break_end TIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure unique availability per doctor per date
    CONSTRAINT unique_doctor_date UNIQUE(doctor_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctor_custom_availability_date ON doctor_custom_availability(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_doctor_custom_availability_empresa ON doctor_custom_availability(empresa_id);
CREATE INDEX IF NOT EXISTS idx_doctores_slot_duration ON doctores(preferred_slot_duration);

-- Add some comments for documentation
COMMENT ON COLUMN doctores.preferred_slot_duration IS 'Default appointment duration in minutes for this doctor (10, 15, 30, etc)';
COMMENT ON COLUMN doctores.minimum_slot_duration IS 'Minimum appointment duration in minutes for this doctor';
COMMENT ON TABLE doctor_custom_availability IS 'Date-specific availability overrides for doctors (supplements weekly patterns)';
COMMENT ON COLUMN doctor_custom_availability.available IS 'Whether doctor is available on this specific date';
COMMENT ON COLUMN doctor_custom_availability.notes IS 'Optional notes about why this date has custom availability';