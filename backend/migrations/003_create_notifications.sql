-- Migration 003: Create notifications table
-- Tabla para almacenar notificaciones del sistema del Back Office Odonto

CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant isolation
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

    -- Recipients (one or both may be set)
    user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    doctor_id INTEGER REFERENCES doctores(id) ON DELETE SET NULL,

    -- Context information
    patient_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
    appointment_id INTEGER REFERENCES citas(id) ON DELETE SET NULL,

    -- Content
    type VARCHAR(50) NOT NULL,  -- 'appointment_scheduled', 'new_patient', 'appointment_reminder_30m', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Status tracking
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,

    -- Audit
    created_at TIMESTAMP DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP DEFAULT (now() AT TIME ZONE 'UTC')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notificaciones_empresa ON notificaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_doctor ON notificaciones(doctor_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created ON notificaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_read ON notificaciones(read);
CREATE INDEX IF NOT EXISTS idx_notificaciones_appointment ON notificaciones(appointment_id);

-- Comment
COMMENT ON TABLE notificaciones IS 'System notifications for doctors and administrators';
COMMENT ON COLUMN notificaciones.type IS 'Notification type: appointment_scheduled, new_patient, appointment_reminder_30m, appointment_started, appointment_completed, appointment_cancelled';
