-- Migration: Simplify Mercado Pago Integration
-- Date: 2025-11-03
-- Description: Remove OAuth marketplace complexity and use single platform account

-- ============================================
-- 1. REMOVE OAUTH FIELDS FROM CLINICAS TABLE
-- ============================================

-- Remove Mercado Pago OAuth fields (no longer needed with simplified flow)
ALTER TABLE public.clinicas
DROP COLUMN IF EXISTS mercadopago_access_token,
DROP COLUMN IF EXISTS mercadopago_refresh_token,
DROP COLUMN IF EXISTS mercadopago_user_id,
DROP COLUMN IF EXISTS mercadopago_public_key,
DROP COLUMN IF EXISTS mp_token_expiration,
DROP COLUMN IF EXISTS mp_connected;

-- ============================================
-- 2. REMOVE MARKETPLACE_FEE FROM CITAS TABLE
-- ============================================

-- The marketplace fee will now be calculated and stored in veterinary_earnings
-- but not passed to Mercado Pago (since we're not doing split payments)
ALTER TABLE public.citas
DROP COLUMN IF EXISTS marketplace_fee;

-- ============================================
-- 3. CREATE VETERINARY_EARNINGS TABLE
-- ============================================

-- This table tracks what the platform owes to each clinic
CREATE TABLE IF NOT EXISTS public.veterinary_earnings (
  id_earning INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_clinica INTEGER NOT NULL REFERENCES public.clinicas(id_clinica),
  id_cita INTEGER NOT NULL REFERENCES public.citas(id_cita),
  amount_total NUMERIC(10, 2) NOT NULL, -- Total payment from customer
  platform_commission NUMERIC(10, 2) NOT NULL, -- What platform keeps
  clinic_amount NUMERIC(10, 2) NOT NULL, -- What clinic earns (amount_total - platform_commission)
  status VARCHAR NOT NULL DEFAULT 'pending', -- 'pending', 'paid_out', 'held'
  payment_date TIMESTAMP WITHOUT TIME ZONE, -- When customer paid
  payout_date TIMESTAMP WITHOUT TIME ZONE, -- When clinic was paid
  payout_method VARCHAR, -- 'bank_transfer', 'mercadopago', 'cash', etc.
  payout_reference VARCHAR, -- Transaction reference for the payout
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT veterinary_earnings_status_check CHECK (status IN ('pending', 'paid_out', 'held', 'cancelled'))
);

-- Add comments
COMMENT ON TABLE public.veterinary_earnings IS 'Tracks platform debt to veterinary clinics from customer payments';
COMMENT ON COLUMN public.veterinary_earnings.amount_total IS 'Total amount paid by customer';
COMMENT ON COLUMN public.veterinary_earnings.platform_commission IS 'Platform commission amount (e.g., 10% of total)';
COMMENT ON COLUMN public.veterinary_earnings.clinic_amount IS 'Amount owed to clinic (total - commission)';
COMMENT ON COLUMN public.veterinary_earnings.status IS 'pending: awaiting payout, paid_out: paid to clinic, held: on hold, cancelled: refunded to customer';
COMMENT ON COLUMN public.veterinary_earnings.payout_date IS 'When the platform paid the clinic';
COMMENT ON COLUMN public.veterinary_earnings.payout_method IS 'How the clinic was paid (bank_transfer, mercadopago, etc.)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_veterinary_earnings_clinica ON public.veterinary_earnings(id_clinica);
CREATE INDEX IF NOT EXISTS idx_veterinary_earnings_cita ON public.veterinary_earnings(id_cita);
CREATE INDEX IF NOT EXISTS idx_veterinary_earnings_status ON public.veterinary_earnings(status);
CREATE INDEX IF NOT EXISTS idx_veterinary_earnings_payment_date ON public.veterinary_earnings(payment_date);

-- ============================================
-- 4. UPDATE PLATFORM CONFIGURATION
-- ============================================

-- Update description for commission to reflect new model
UPDATE public.configuracion_plataforma
SET descripcion = 'Platform commission percentage (0-100) - deducted from clinic earnings, not split with Mercado Pago'
WHERE clave = 'commission_percentage';

-- Add new configuration for payout settings
INSERT INTO public.configuracion_plataforma (clave, valor, tipo, descripcion)
VALUES
  ('min_payout_amount', '50000', 'number', 'Minimum accumulated earnings (in COP) before clinic can request payout'),
  ('payout_frequency_days', '7', 'number', 'How often clinics can request payouts (in days)'),
  ('auto_payout_enabled', 'false', 'boolean', 'Enable automatic payouts to clinics'),
  ('auto_payout_threshold', '200000', 'number', 'Auto-payout when clinic earnings reach this amount (in COP)')
ON CONFLICT (clave) DO NOTHING;

-- ============================================
-- 5. ADD CLINIC REFERENCE TO PAYMENT TRANSACTIONS
-- ============================================

-- Add index to make clinic queries faster
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- Update comment to reflect new model
COMMENT ON TABLE public.payment_transactions IS 'Audit log for all payment-related transactions (all payments go to platform account)';

-- ============================================
-- 6. UPDATE CITAS TABLE COMMENTS
-- ============================================

COMMENT ON COLUMN public.citas.payment_amount IS 'Total amount paid by customer (goes to platform Mercado Pago account)';
COMMENT ON COLUMN public.citas.estado IS 'Appointment status: pendiente (awaiting vet confirmation), confirmada (vet confirmed), pagada (paid by customer), cancelada, finalizada, rechazada';

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================

-- To rollback this migration, run:
/*
-- Drop indexes
DROP INDEX IF EXISTS idx_veterinary_earnings_payment_date;
DROP INDEX IF EXISTS idx_veterinary_earnings_status;
DROP INDEX IF EXISTS idx_veterinary_earnings_cita;
DROP INDEX IF EXISTS idx_veterinary_earnings_clinica;
DROP INDEX IF EXISTS idx_payment_transactions_status;

-- Drop table
DROP TABLE IF EXISTS public.veterinary_earnings;

-- Re-add OAuth fields to clinicas (if needed)
ALTER TABLE public.clinicas
ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_user_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_public_key TEXT,
ADD COLUMN IF NOT EXISTS mp_token_expiration TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS mp_connected BOOLEAN DEFAULT FALSE;

-- Re-add marketplace_fee to citas
ALTER TABLE public.citas
ADD COLUMN IF NOT EXISTS marketplace_fee NUMERIC(10, 2);

-- Remove new configuration keys
DELETE FROM public.configuracion_plataforma
WHERE clave IN ('min_payout_amount', 'payout_frequency_days', 'auto_payout_enabled', 'auto_payout_threshold');
*/
