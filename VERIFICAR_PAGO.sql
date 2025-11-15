-- ============================================
-- QUERIES PARA VERIFICAR QUE EL PAGO SE GUARDÓ
-- ============================================
-- Ejecuta estos queries en Supabase SQL Editor
-- para verificar que el pago se procesó correctamente

-- ============================================
-- 1. VERIFICAR ESTADO DE LA CITA
-- ============================================
-- Busca la cita más reciente y verifica su estado de pago
SELECT
  id_cita,
  id_usuario,
  id_clinica,
  estado,
  payment_status,
  payment_amount,
  payment_id,
  payment_date,
  payment_url,
  fecha_inicio
FROM citas
WHERE id_cita = 42  -- Cambia 42 por el ID de tu cita
ORDER BY created_at DESC;

-- El resultado debería mostrar:
-- payment_status: 'paid' (si el webhook procesó el pago)
-- payment_id: El ID del pago de Mercado Pago
-- payment_date: La fecha/hora del pago

-- ============================================
-- 2. VERIFICAR GANANCIAS DE LA CLÍNICA
-- ============================================
-- Revisa si se creó el registro de ganancias para la veterinaria
SELECT
  id_earning,
  id_clinica,
  id_cita,
  amount_total,
  platform_commission,
  clinic_amount,
  status,
  payment_date,
  created_at
FROM veterinary_earnings
WHERE id_cita = 42  -- Cambia 42 por el ID de tu cita
ORDER BY created_at DESC;

-- El resultado debería mostrar:
-- amount_total: El total pagado (ej: 34000.00)
-- platform_commission: 10% del total (ej: 3400.00)
-- clinic_amount: 90% del total (ej: 30600.00)
-- status: 'pending' (pendiente de pago a la clínica)

-- ============================================
-- 3. VERIFICAR TRANSACCIONES DE PAGO
-- ============================================
-- Revisa el historial de transacciones
SELECT
  id_transaction,
  id_cita,
  transaction_type,
  status,
  amount,
  mercadopago_payment_id,
  created_at
FROM payment_transactions
WHERE id_cita = 42  -- Cambia 42 por el ID de tu cita
ORDER BY created_at DESC;

-- Deberías ver transacciones de tipo:
-- 'payment_created': Cuando se creó la preferencia
-- 'payment_approved': Cuando se aprobó el pago

-- ============================================
-- 4. VER TODAS LAS CITAS CON PAGO PENDIENTE/PAGADO
-- ============================================
SELECT
  c.id_cita,
  c.estado,
  c.payment_status,
  c.payment_amount,
  cl.nombre as clinica,
  u.nombre as usuario,
  s.nombre as servicio
FROM citas c
JOIN clinicas cl ON cl.id_clinica = c.id_clinica
JOIN usuarios u ON u.id_usuario = c.id_usuario
JOIN servicios s ON s.id_servicio = c.id_servicio
WHERE c.payment_status IN ('awaiting_payment', 'paid')
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================
-- 5. VER RESUMEN DE GANANCIAS POR CLÍNICA
-- ============================================
SELECT
  cl.nombre as clinica,
  COUNT(ve.id_earning) as num_pagos,
  SUM(ve.amount_total) as total_recibido,
  SUM(ve.platform_commission) as total_comision_plataforma,
  SUM(ve.clinic_amount) as total_ganancia_clinica,
  SUM(CASE WHEN ve.status = 'pending' THEN ve.clinic_amount ELSE 0 END) as pendiente_pagar,
  SUM(CASE WHEN ve.status = 'paid_out' THEN ve.clinic_amount ELSE 0 END) as ya_pagado
FROM veterinary_earnings ve
JOIN clinicas cl ON cl.id_clinica = ve.id_clinica
GROUP BY cl.id_clinica, cl.nombre
ORDER BY total_ganancia_clinica DESC;

-- ============================================
-- 6. BUSCAR CITA POR ID DE PAGO DE MERCADO PAGO
-- ============================================
-- Si tienes el payment_id de Mercado Pago, búscalo aquí
SELECT
  c.id_cita,
  c.estado,
  c.payment_status,
  c.payment_id,
  c.payment_amount,
  c.payment_date,
  cl.nombre as clinica
FROM citas c
JOIN clinicas cl ON cl.id_clinica = c.id_clinica
WHERE c.payment_id = '1234567890'  -- Reemplaza con tu payment_id
LIMIT 1;
