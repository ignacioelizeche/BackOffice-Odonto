-- Migration: Add doctor_id to usuarios table for role-based data filtering
-- This migration links Doctor users to their Doctor records for proper data isolation

-- ============= STEP 1: Add doctor_id column to usuarios =============
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS doctor_id INTEGER;

-- ============= STEP 2: Add Foreign Key constraint =============
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_doctor_id
FOREIGN KEY (doctor_id) REFERENCES doctores(id) ON DELETE SET NULL;

-- ============= STEP 3: Create index for performance =============
CREATE INDEX IF NOT EXISTS idx_usuarios_doctor_id ON usuarios(doctor_id);

-- ============= STEP 4: Populate doctor_id for existing doctor users =============
-- This matches Usuario records with Doctor records using email
UPDATE usuarios
SET doctor_id = doctores.id
FROM doctores
WHERE usuarios.email = doctores.email
  AND usuarios.role = 'doctor'::roleenum
  AND usuarios.empresa_id = doctores.empresa_id;

-- ============= Migration complete =============
-- Doctor users now have doctor_id linking to their Doctor record
-- Non-doctor users have doctor_id = NULL
