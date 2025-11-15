-- Migración: Agregar campos de identificación a usuarios para Mercado Pago
-- Fecha: 2025-10-28
-- Descripción: Agrega campos requeridos por Mercado Pago para compliance y anti-fraude

-- Agregar campos de identificación a tabla usuarios
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(10) CHECK (tipo_documento IN ('CC', 'CE', 'TI', 'PA', 'NIT', 'OTRO')),
ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(50),
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100),
ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(20);

-- Crear índice para búsquedas por documento
CREATE INDEX IF NOT EXISTS idx_usuarios_numero_documento ON usuarios(numero_documento);

-- Comentarios para documentación
COMMENT ON COLUMN usuarios.tipo_documento IS 'Tipo de documento de identidad: CC=Cédula Ciudadanía, CE=Cédula Extranjería, TI=Tarjeta Identidad, PA=Pasaporte, NIT=Número Identificación Tributaria';
COMMENT ON COLUMN usuarios.numero_documento IS 'Número del documento de identificación del usuario';
COMMENT ON COLUMN usuarios.direccion IS 'Dirección completa del usuario (calle, número, apartamento, etc.)';
COMMENT ON COLUMN usuarios.ciudad IS 'Ciudad de residencia del usuario';
COMMENT ON COLUMN usuarios.codigo_postal IS 'Código postal de la dirección del usuario';
