-- Migration: Create WhatsApp Sessions table
-- This migration adds support for multi-turn conversation state management via WhatsApp

-- ============= CREATE WHATSAPP_SESSIONS TABLE =============
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    caller_id VARCHAR(20) NOT NULL,

    -- Conversation state
    current_phase VARCHAR(50) DEFAULT 'idle',  -- idle, agendamiento, reagendamiento, cancelacion

    -- Selected data during conversation
    selected_doctor_id INTEGER,
    selected_date VARCHAR(10),  -- YYYY-MM-DD
    selected_time VARCHAR(5),  -- HH:MM

    -- Available options sent to user
    available_doctors JSONB,  -- Array of doctor objects
    available_times JSONB,  -- Array of available time slots

    -- For rescheduling and cancellation
    appointment_to_reschedule_id INTEGER,
    appointment_to_cancel_id INTEGER,

    -- Patient information
    patient_id INTEGER,
    patient_name VARCHAR(255),
    patient_phone VARCHAR(20),

    -- Timestamps and expiration
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,

    -- Foreign key constraints
    CONSTRAINT fk_wa_sessions_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    CONSTRAINT fk_wa_sessions_doctor FOREIGN KEY (selected_doctor_id) REFERENCES doctores(id) ON DELETE SET NULL,
    CONSTRAINT fk_wa_sessions_reschedule FOREIGN KEY (appointment_to_reschedule_id) REFERENCES citas(id) ON DELETE SET NULL,
    CONSTRAINT fk_wa_sessions_cancel FOREIGN KEY (appointment_to_cancel_id) REFERENCES citas(id) ON DELETE SET NULL,
    CONSTRAINT fk_wa_sessions_patient FOREIGN KEY (patient_id) REFERENCES pacientes(id) ON DELETE SET NULL,

    -- Unique constraint to ensure one active session per caller_id per empresa
    CONSTRAINT uq_wa_sessions_empresa_caller UNIQUE(empresa_id, caller_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wa_sessions_empresa ON whatsapp_sessions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_caller ON whatsapp_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_expires ON whatsapp_sessions(expires_at);

-- ============= UPDATE PACIENTES TABLE =============
-- Add WhatsApp-related columns to pacientes table
ALTER TABLE pacientes
    ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS last_whatsapp_contact TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_pacientes_whatsapp_phone ON pacientes(whatsapp_phone);
