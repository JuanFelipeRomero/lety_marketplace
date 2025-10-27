-- =====================================================
-- Migration: Mejoras al Sistema de Citas
-- Fecha: 2025-10-26
-- Descripción: Agregar constraints, índices y campos de configuración
--              para mejorar la lógica de agendamiento de citas
-- =====================================================

-- 1. AGREGAR CAMPOS DE CONFIGURACIÓN A CLÍNICAS
-- =====================================================
-- Tiempo mínimo de anticipación para agendar (en minutos)
-- Por defecto: 120 minutos (2 horas)
ALTER TABLE "clinicas"
  ADD COLUMN IF NOT EXISTS "tiempo_minimo_anticipacion" INTEGER DEFAULT 120;

-- Tiempo máximo de anticipación para agendar (en días)
-- Por defecto: 90 días (3 meses)
ALTER TABLE "clinicas"
  ADD COLUMN IF NOT EXISTS "tiempo_maximo_anticipacion" INTEGER DEFAULT 90;

-- Duración de slot de cita (en minutos)
-- Por defecto: 30 minutos
ALTER TABLE "clinicas"
  ADD COLUMN IF NOT EXISTS "duracion_slot_cita" INTEGER DEFAULT 30;

COMMENT ON COLUMN "clinicas"."tiempo_minimo_anticipacion" IS 'Tiempo mínimo en minutos que se requiere para agendar una cita (ej: 120 = 2 horas de anticipación)';
COMMENT ON COLUMN "clinicas"."tiempo_maximo_anticipacion" IS 'Tiempo máximo en días que se puede agendar con anticipación (ej: 90 = 3 meses)';
COMMENT ON COLUMN "clinicas"."duracion_slot_cita" IS 'Duración de los slots de tiempo en minutos (ej: 15, 30, 60)';

-- 2. AGREGAR CHECK CONSTRAINT EN CITAS
-- =====================================================
-- Garantizar que fecha_fin sea posterior a fecha_inicio
ALTER TABLE "citas"
  DROP CONSTRAINT IF EXISTS "check_citas_fecha_fin_after_inicio";

ALTER TABLE "citas"
  ADD CONSTRAINT "check_citas_fecha_fin_after_inicio"
  CHECK ("fecha_fin" > "fecha_inicio");

COMMENT ON CONSTRAINT "check_citas_fecha_fin_after_inicio" ON "citas"
IS 'Garantiza que la fecha de finalización sea posterior a la fecha de inicio de la cita';

-- 3. CREAR ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- =====================================================
-- Índice compuesto para búsqueda eficiente de conflictos de horario
-- Este índice mejora significativamente la performance de la query de conflictos
CREATE INDEX IF NOT EXISTS "idx_citas_conflict_check"
  ON "citas" ("id_clinica", "fecha_inicio", "fecha_fin", "estado")
  WHERE "estado" NOT IN ('cancelada');

COMMENT ON INDEX "idx_citas_conflict_check" IS 'Índice optimizado para detección de conflictos de horarios en citas activas';

-- Índice para búsquedas por clínica y rango de fechas
CREATE INDEX IF NOT EXISTS "idx_citas_clinica_fecha"
  ON "citas" ("id_clinica", "fecha_inicio" DESC);

COMMENT ON INDEX "idx_citas_clinica_fecha" IS 'Índice para consultas de citas por clínica ordenadas por fecha';

-- Índice para consultas de disponibilidad de servicios
CREATE INDEX IF NOT EXISTS "idx_servicios_clinica_disponible"
  ON "servicios" ("id_clinica", "disponible")
  WHERE "disponible" = true;

COMMENT ON INDEX "idx_servicios_clinica_disponible" IS 'Índice para búsqueda rápida de servicios disponibles por clínica';

-- 4. OPTIMIZAR ÍNDICES EN HORARIOS_ATENCION
-- =====================================================
-- Índice compuesto para búsqueda de horarios por clínica y día
CREATE INDEX IF NOT EXISTS "idx_horarios_clinica_dia"
  ON "horarios_atencion" ("id_clinica", "dia_semana");

COMMENT ON INDEX "idx_horarios_clinica_dia" IS 'Índice para búsqueda eficiente de horarios por clínica y día de la semana';

-- 5. AGREGAR ÍNDICE EN MASCOTAS PARA VALIDACIÓN DE PROPIEDAD
-- =====================================================
CREATE INDEX IF NOT EXISTS "idx_mascotas_usuario"
  ON "mascotas" ("id_usuario", "id_mascota");

COMMENT ON INDEX "idx_mascotas_usuario" IS 'Índice para validación rápida de propiedad de mascotas';

-- 6. VALIDACIÓN DE ESTADOS DE CITAS
-- =====================================================
-- Agregar check constraint para estados válidos
ALTER TABLE "citas"
  DROP CONSTRAINT IF EXISTS "check_citas_estado_valido";

ALTER TABLE "citas"
  ADD CONSTRAINT "check_citas_estado_valido"
  CHECK ("estado" IN (
    'pendiente',
    'confirmada',
    'rechazada',
    'reprogramacion_sugerida',
    'cancelada',
    'finalizada'
  ));

COMMENT ON CONSTRAINT "check_citas_estado_valido" ON "citas"
IS 'Garantiza que el estado de la cita sea uno de los valores permitidos';

-- 7. VALIDACIÓN DE ESTADOS DE CLÍNICAS
-- =====================================================
-- Agregar check constraint para estados válidos de clínicas
ALTER TABLE "clinicas"
  DROP CONSTRAINT IF EXISTS "check_clinicas_estado_valido";

ALTER TABLE "clinicas"
  ADD CONSTRAINT "check_clinicas_estado_valido"
  CHECK ("estado" IN ('pendiente', 'confirmado', 'rechazada', 'suspendida'));

COMMENT ON CONSTRAINT "check_clinicas_estado_valido" ON "clinicas"
IS 'Garantiza que el estado de la clínica sea uno de los valores permitidos';

-- 8. VALIDACIÓN DE DÍAS DE LA SEMANA
-- =====================================================
-- Agregar check constraint para días válidos
ALTER TABLE "horarios_atencion"
  DROP CONSTRAINT IF EXISTS "check_horarios_dia_valido";

ALTER TABLE "horarios_atencion"
  ADD CONSTRAINT "check_horarios_dia_valido"
  CHECK ("dia_semana" IN (
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'
  ));

COMMENT ON CONSTRAINT "check_horarios_dia_valido" ON "horarios_atencion"
IS 'Garantiza que el día de la semana sea uno de los valores permitidos en inglés';

-- 9. VALIDACIÓN DE DURACIONES EN SERVICIOS
-- =====================================================
-- Asegurar que la duración sea positiva
ALTER TABLE "servicios"
  DROP CONSTRAINT IF EXISTS "check_servicios_duracion_positiva";

ALTER TABLE "servicios"
  ADD CONSTRAINT "check_servicios_duracion_positiva"
  CHECK ("duracion_minutos" IS NULL OR "duracion_minutos" > 0);

COMMENT ON CONSTRAINT "check_servicios_duracion_positiva" ON "servicios"
IS 'Garantiza que la duración del servicio sea un valor positivo';

-- 10. VALIDACIÓN DE PRECIOS EN SERVICIOS
-- =====================================================
-- Asegurar que el precio sea no negativo
ALTER TABLE "servicios"
  DROP CONSTRAINT IF EXISTS "check_servicios_precio_no_negativo";

ALTER TABLE "servicios"
  ADD CONSTRAINT "check_servicios_precio_no_negativo"
  CHECK ("precio" >= 0);

COMMENT ON CONSTRAINT "check_servicios_precio_no_negativo" ON "servicios"
IS 'Garantiza que el precio del servicio no sea negativo';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
-- NOTA: Para aplicar esta migración, ejecutar:
-- psql -U postgres -d lety_marketplace -f migrations/improve_appointment_system.sql
--
-- O desde Supabase SQL Editor, copiar y pegar el contenido
-- =====================================================
