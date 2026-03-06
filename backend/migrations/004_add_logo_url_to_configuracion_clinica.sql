-- Migration 004: Add logo_url column to configuracion_clinica
-- Adds support for storing clinic logo URLs in the configuration table

ALTER TABLE configuracion_clinica ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) NULL;

-- Comment
COMMENT ON COLUMN configuracion_clinica.logo_url IS 'URL to the clinic logo image stored in the uploads directory';
