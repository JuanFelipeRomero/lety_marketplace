-- Migration: Add Mercado Pago payment integration fields
-- Date: 2025-10-26
-- Description: Adds fields for Mercado Pago OAuth tokens and payment tracking

-- ============================================
-- 1. ADD MERCADO PAGO FIELDS TO CLINICAS TABLE
-- ============================================

-- Add Mercado Pago authentication fields
ALTER TABLE public.clinicas
ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_user_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_public_key TEXT,
ADD COLUMN IF NOT EXISTS mp_token_expiration TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS mp_connected BOOLEAN DEFAULT FALSE;

-- Add comment to document the fields
COMMENT ON COLUMN public.clinicas.mercadopago_access_token IS 'OAuth access token from Mercado Pago (valid for 180 days)';
COMMENT ON COLUMN public.clinicas.mercadopago_refresh_token IS 'OAuth refresh token to renew access token';
COMMENT ON COLUMN public.clinicas.mercadopago_user_id IS 'Mercado Pago user ID of the clinic';
COMMENT ON COLUMN public.clinicas.mercadopago_public_key IS 'Mercado Pago public key for frontend integration';
COMMENT ON COLUMN public.clinicas.mp_token_expiration IS 'Expiration date of the current access token';
COMMENT ON COLUMN public.clinicas.mp_connected IS 'Indicates if clinic has completed Mercado Pago setup';

-- ============================================
-- 2. ADD PAYMENT TRACKING FIELDS TO CITAS TABLE
-- ============================================

-- Add payment status and tracking fields
ALTER TABLE public.citas
ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_id VARCHAR,
ADD COLUMN IF NOT EXISTS preference_id VARCHAR,
ADD COLUMN IF NOT EXISTS payment_url TEXT,
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS marketplace_fee NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_id VARCHAR,
ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR,
ADD COLUMN IF NOT EXISTS payment_metadata JSONB;

-- Add check constraint for payment_status values
ALTER TABLE public.citas
DROP CONSTRAINT IF EXISTS citas_payment_status_check;

ALTER TABLE public.citas
ADD CONSTRAINT citas_payment_status_check
CHECK (payment_status IN ('pending', 'awaiting_payment', 'paid', 'refunded', 'failed', 'cancelled'));

-- Add comments to document the fields
COMMENT ON COLUMN public.citas.payment_status IS 'Status: pending, awaiting_payment, paid, refunded, failed, cancelled';
COMMENT ON COLUMN public.citas.payment_id IS 'Mercado Pago payment ID once payment is completed';
COMMENT ON COLUMN public.citas.preference_id IS 'Mercado Pago preference ID for payment link';
COMMENT ON COLUMN public.citas.payment_url IS 'Payment URL (init_point) sent to user';
COMMENT ON COLUMN public.citas.payment_amount IS 'Total amount to be paid by user';
COMMENT ON COLUMN public.citas.marketplace_fee IS 'Platform commission amount';
COMMENT ON COLUMN public.citas.payment_date IS 'Timestamp when payment was confirmed';
COMMENT ON COLUMN public.citas.refund_id IS 'Mercado Pago refund ID if payment was refunded';
COMMENT ON COLUMN public.citas.refund_date IS 'Timestamp when refund was processed';
COMMENT ON COLUMN public.citas.refund_reason IS 'Reason for refund (cancellation reason)';
COMMENT ON COLUMN public.citas.payment_method IS 'Payment method used (credit_card, debit_card, etc)';
COMMENT ON COLUMN public.citas.payment_metadata IS 'Additional payment information from Mercado Pago';

-- ============================================
-- 3. CREATE PLATFORM CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.configuracion_plataforma (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clave VARCHAR UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  tipo VARCHAR NOT NULL, -- 'number', 'string', 'boolean', 'json'
  descripcion TEXT,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES public.usuarios(id_usuario)
);

COMMENT ON TABLE public.configuracion_plataforma IS 'Platform-wide configuration settings';
COMMENT ON COLUMN public.configuracion_plataforma.clave IS 'Configuration key (unique identifier)';
COMMENT ON COLUMN public.configuracion_plataforma.valor IS 'Configuration value (stored as text, cast based on tipo)';
COMMENT ON COLUMN public.configuracion_plataforma.tipo IS 'Data type: number, string, boolean, json';

-- Insert default configuration values
INSERT INTO public.configuracion_plataforma (clave, valor, tipo, descripcion)
VALUES
  ('commission_percentage', '10', 'number', 'Platform commission percentage (0-100)'),
  ('refund_deadline_hours', '24', 'number', 'Hours before appointment to allow automatic refund'),
  ('payment_enabled', 'true', 'boolean', 'Enable/disable payment processing globally'),
  ('min_advance_payment_hours', '2', 'number', 'Minimum hours before appointment to require payment')
ON CONFLICT (clave) DO NOTHING;

-- ============================================
-- 4. CREATE PAYMENT TRANSACTIONS LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id_transaction INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_cita INTEGER REFERENCES public.citas(id_cita),
  id_clinica INTEGER REFERENCES public.clinicas(id_clinica),
  transaction_type VARCHAR NOT NULL, -- 'payment', 'refund', 'chargeback'
  payment_id VARCHAR,
  amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.payment_transactions IS 'Audit log for all payment-related transactions';
COMMENT ON COLUMN public.payment_transactions.transaction_type IS 'Type: payment, refund, chargeback';
COMMENT ON COLUMN public.payment_transactions.status IS 'Transaction status from Mercado Pago';
COMMENT ON COLUMN public.payment_transactions.metadata IS 'Full webhook payload or API response';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_citas_payment_status ON public.citas(payment_status);
CREATE INDEX IF NOT EXISTS idx_citas_preference_id ON public.citas(preference_id);
CREATE INDEX IF NOT EXISTS idx_citas_payment_id ON public.citas(payment_id);
CREATE INDEX IF NOT EXISTS idx_clinicas_mp_user_id ON public.clinicas(mercadopago_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_cita ON public.payment_transactions(id_cita);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_clinica ON public.payment_transactions(id_clinica);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON public.payment_transactions(payment_id);

-- ============================================
-- 5. UPDATE ESTADO FIELD CONSTRAINT IN CITAS
-- ============================================

-- Update the estado field to include payment-related states
-- Note: This assumes the estado field exists and may need adjustment based on current constraints

ALTER TABLE public.citas
DROP CONSTRAINT IF EXISTS citas_estado_check;

-- We're not recreating the constraint to allow flexibility in estado values
-- The payment_status field will handle payment-specific states

COMMENT ON COLUMN public.citas.estado IS 'Appointment status: pendiente (awaiting vet confirmation), confirmada (vet confirmed, awaiting payment), pagada (paid), cancelada, finalizada, rechazada, reprogramacion_sugerida';

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================

-- To rollback this migration, run:
/*
DROP INDEX IF EXISTS idx_payment_transactions_payment_id;
DROP INDEX IF EXISTS idx_payment_transactions_clinica;
DROP INDEX IF EXISTS idx_payment_transactions_cita;
DROP INDEX IF EXISTS idx_clinicas_mp_user_id;
DROP INDEX IF EXISTS idx_citas_payment_id;
DROP INDEX IF EXISTS idx_citas_preference_id;
DROP INDEX IF EXISTS idx_citas_payment_status;

DROP TABLE IF EXISTS public.payment_transactions;
DROP TABLE IF EXISTS public.configuracion_plataforma;

ALTER TABLE public.citas
DROP COLUMN IF EXISTS payment_metadata,
DROP COLUMN IF EXISTS payment_method,
DROP COLUMN IF EXISTS refund_reason,
DROP COLUMN IF EXISTS refund_date,
DROP COLUMN IF EXISTS refund_id,
DROP COLUMN IF EXISTS payment_date,
DROP COLUMN IF EXISTS marketplace_fee,
DROP COLUMN IF EXISTS payment_amount,
DROP COLUMN IF EXISTS payment_url,
DROP COLUMN IF EXISTS preference_id,
DROP COLUMN IF EXISTS payment_id,
DROP COLUMN IF EXISTS payment_status;

ALTER TABLE public.clinicas
DROP COLUMN IF EXISTS mp_connected,
DROP COLUMN IF EXISTS mp_token_expiration,
DROP COLUMN IF EXISTS mercadopago_public_key,
DROP COLUMN IF EXISTS mercadopago_user_id,
DROP COLUMN IF EXISTS mercadopago_refresh_token,
DROP COLUMN IF EXISTS mercadopago_access_token;
*/
