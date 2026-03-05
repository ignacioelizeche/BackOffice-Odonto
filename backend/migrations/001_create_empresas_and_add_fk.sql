-- Migration: Create Empresa table and add empresa_id to all related tables
-- This migration adds multi-tenant support to the BackOffice Odonto system

-- ============= STEP 1: Create Empresa (Enterprise) table =============
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rfc VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    license_number VARCHAR(255) UNIQUE,
    address TEXT,
    specialties JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'activa',
    subscription_plan VARCHAR(50) DEFAULT 'free',
    max_users INTEGER DEFAULT 10,
    max_patients INTEGER DEFAULT 500,
    logo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============= STEP 2: Create default empresa =============
INSERT INTO empresas (name, rfc, status, subscription_plan)
VALUES ('default', 'DEFAULT000000XXX', 'activa', 'free')
ON CONFLICT (rfc) DO NOTHING;

-- ============= STEP 3: Add empresa_id column to all tables =============

-- Usuarios table
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Pacientes table
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Dientes table
ALTER TABLE dientes
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Registros dentales table
ALTER TABLE registros_dentales
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Adjuntos table
ALTER TABLE adjuntos
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Doctores table
ALTER TABLE doctores
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Horarios doctores table
ALTER TABLE horarios_doctores
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Estadísticas doctores table
ALTER TABLE estadisticas_doctores
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Citas table
ALTER TABLE citas
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Configuración tables
ALTER TABLE configuracion_clinica
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

ALTER TABLE configuracion_horario
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

ALTER TABLE configuracion_seguridad
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

ALTER TABLE configuracion_facturacion
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

ALTER TABLE configuracion_notificaciones
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- Dashboard stats table
ALTER TABLE dashboard_stats
ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;

-- ============= STEP 4: Add Foreign Key constraints =============

-- Usuarios -> Empresa
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Pacientes -> Empresa
ALTER TABLE pacientes
ADD CONSTRAINT fk_pacientes_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Dientes -> Empresa
ALTER TABLE dientes
ADD CONSTRAINT fk_dientes_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Registros dentales -> Empresa
ALTER TABLE registros_dentales
ADD CONSTRAINT fk_registros_dentales_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Adjuntos -> Empresa
ALTER TABLE adjuntos
ADD CONSTRAINT fk_adjuntos_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Doctores -> Empresa
ALTER TABLE doctores
ADD CONSTRAINT fk_doctores_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Horarios doctores -> Empresa
ALTER TABLE horarios_doctores
ADD CONSTRAINT fk_horarios_doctores_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Estadísticas doctores -> Empresa
ALTER TABLE estadisticas_doctores
ADD CONSTRAINT fk_estadisticas_doctores_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Citas -> Empresa
ALTER TABLE citas
ADD CONSTRAINT fk_citas_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Configuración clinica -> Empresa
ALTER TABLE configuracion_clinica
ADD CONSTRAINT fk_configuracion_clinica_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Configuración horario -> Empresa
ALTER TABLE configuracion_horario
ADD CONSTRAINT fk_configuracion_horario_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Configuración seguridad -> Empresa
ALTER TABLE configuracion_seguridad
ADD CONSTRAINT fk_configuracion_seguridad_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Configuración facturación -> Empresa
ALTER TABLE configuracion_facturacion
ADD CONSTRAINT fk_configuracion_facturacion_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Configuración notificaciones -> Empresa
ALTER TABLE configuracion_notificaciones
ADD CONSTRAINT fk_configuracion_notificaciones_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Dashboard stats -> Empresa
ALTER TABLE dashboard_stats
ADD CONSTRAINT fk_dashboard_stats_empresa_id
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- ============= STEP 5: Make empresa_id NOT NULL (after data migration) =============
-- Note: These are commented out and should be executed AFTER verifying data migration
-- Uncomment and run after confirming all records have empresa_id = 1

/*
ALTER TABLE usuarios ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE pacientes ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE dientes ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE registros_dentales ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE adjuntos ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE doctores ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE horarios_doctores ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE estadisticas_doctores ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE citas ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE configuracion_clinica ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE configuracion_horario ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE configuracion_seguridad ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE configuracion_facturacion ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE configuracion_notificaciones ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE dashboard_stats ALTER COLUMN empresa_id SET NOT NULL;
*/

-- ============= STEP 6: Create indexes for performance =============
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_empresa_id ON pacientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_doctores_empresa_id ON doctores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_citas_empresa_id ON citas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_horarios_doctores_empresa_id ON horarios_doctores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_estadisticas_doctores_empresa_id ON estadisticas_doctores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dientes_empresa_id ON dientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_dentales_empresa_id ON registros_dentales(empresa_id);
CREATE INDEX IF NOT EXISTS idx_adjuntos_empresa_id ON adjuntos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_clinica_empresa_id ON configuracion_clinica(empresa_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_horario_empresa_id ON configuracion_horario(empresa_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_seguridad_empresa_id ON configuracion_seguridad(empresa_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_facturacion_empresa_id ON configuracion_facturacion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_notificaciones_empresa_id ON configuracion_notificaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_empresa_id ON dashboard_stats(empresa_id);

-- ============= Migration complete =============
-- All tables now have empresa_id column and foreign key constraints
-- All existing data is assigned to empresa_id = 1 (default)
-- System is now multi-tenant capable
