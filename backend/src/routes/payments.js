import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  MercadoPagoPreferenceService,
  MercadoPagoPaymentService,
  MercadoPagoRefundService,
  MercadoPagoUtils,
} from '../services/mercadopago.js';
import autenticacionToken from '../middleware/auth.js';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SERVICE_ROL_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Payment Routes - Simplified Version
 * Handles payment preference creation, status checks, and refunds
 * All payments go to platform's Mercado Pago account
 */

/**
 * Helper function to get platform configuration
 */
async function getPlatformConfig(key) {
  const { data, error } = await supabase
    .from('configuracion_plataforma')
    .select('valor, tipo')
    .eq('clave', key)
    .single();

  if (error || !data) return null;

  // Cast value based on type
  switch (data.tipo) {
    case 'number':
      return parseFloat(data.valor);
    case 'boolean':
      return data.valor === 'true';
    case 'json':
      return JSON.parse(data.valor);
    default:
      return data.valor;
  }
}

/**
 * POST /payments/create-preference
 * Creates a payment preference (payment link) for an appointment
 * Can be called by vet when confirming appointment OR by user when booking
 */
router.post('/create-preference', autenticacionToken, async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const { userId, userType } = req.user;

    if (!appointmentId) {
      return res.status(400).json({
        message: 'ID de cita requerido'
      });
    }

    // Get appointment details with complete user information
    const { data: cita, error: citaError } = await supabase
      .from('citas')
      .select(`
        id_cita,
        id_clinica,
        id_usuario,
        id_servicio,
        estado,
        payment_status,
        servicios(nombre, precio),
        usuarios(nombre, correo, telefono, tipo_documento, numero_documento, direccion, ciudad, codigo_postal),
        clinicas(nombre, direccion, ciudad, codigo_postal)
      `)
      .eq('id_cita', appointmentId)
      .single();

    if (citaError || !cita) {
      return res.status(404).json({
        message: 'Cita no encontrada'
      });
    }

    // Verify permission: either vet for this clinic OR user who owns the appointment
    const hasPermission =
      (userType === 'vet' && cita.id_clinica === req.user.clinicaId) ||
      (userType === 'owner' && cita.id_usuario === userId);

    if (!hasPermission) {
      return res.status(403).json({
        message: 'No tienes permiso para crear preferencia de pago para esta cita'
      });
    }

    // Check if preference already exists
    if (cita.payment_status === 'awaiting_payment' || cita.payment_status === 'paid') {
      return res.status(400).json({
        message: 'Esta cita ya tiene un pago en proceso o completado'
      });
    }

    // Get platform commission percentage
    const commissionPercentage = await getPlatformConfig('commission_percentage') || 10;

    // Calculate amounts
    const serviceAmount = parseFloat(cita.servicios.precio);
    const { platformCommission, clinicAmount } = MercadoPagoUtils.calculateCommission(
      serviceAmount,
      commissionPercentage
    );

    // Prepare payer data with all available information
    const usuario = cita.usuarios;
    const payerData = {
      email: usuario.correo,
      phone: usuario.telefono,
    };

    // Split name into first_name and last_name
    if (usuario.nombre) {
      const nameParts = usuario.nombre.trim().split(' ');
      payerData.first_name = nameParts[0];
      payerData.last_name = nameParts.slice(1).join(' ') || nameParts[0];
    }

    // Add identification if available
    if (usuario.tipo_documento && usuario.numero_documento) {
      payerData.identification = {
        type: usuario.tipo_documento,
        number: usuario.numero_documento,
      };
    }

    // Add address if available
    if (usuario.direccion) {
      payerData.address = {
        direccion: usuario.direccion,
        street_name: usuario.direccion,
        codigo_postal: usuario.codigo_postal || '',
        zip_code: usuario.codigo_postal || '',
      };
    }

    // Create payment preference using PLATFORM credentials
    const preference = await MercadoPagoPreferenceService.createPreference({
      appointmentId: cita.id_cita,
      title: cita.servicios.nombre,
      amount: serviceAmount,
      payer: payerData,
      clinic: {
        id: cita.id_clinica,
        nombre: cita.clinicas.nombre,
        direccion: cita.clinicas.direccion,
        ciudad: cita.clinicas.ciudad,
        codigo_postal: cita.clinicas.codigo_postal,
      },
    });

    // Update appointment with payment information
    const { error: updateError } = await supabase
      .from('citas')
      .update({
        payment_status: 'awaiting_payment',
        preference_id: preference.id,
        payment_url: preference.init_point,
        payment_amount: serviceAmount,
      })
      .eq('id_cita', appointmentId);

    if (updateError) {
      console.error('Error updating appointment with payment info:', updateError);
      return res.status(500).json({
        message: 'Error al actualizar cita con información de pago'
      });
    }

    // Log transaction
    await supabase.from('payment_transactions').insert([{
      id_cita: appointmentId,
      id_clinica: cita.id_clinica,
      transaction_type: 'payment',
      amount: serviceAmount,
      status: 'preference_created',
      metadata: {
        preference_id: preference.id,
        platform_commission: platformCommission,
        clinic_amount: clinicAmount,
      },
    }]);

    console.log(`✅ Payment preference created for appointment ${appointmentId} - Amount: ${serviceAmount} COP`);

    res.status(201).json({
      message: 'Preferencia de pago creada exitosamente',
      payment_url: preference.init_point,
      preference_id: preference.id,
      amount: serviceAmount,
      platform_commission: platformCommission,
      clinic_earnings: clinicAmount,
    });
  } catch (error) {
    console.error('Error creating payment preference:', error);
    res.status(500).json({
      message: 'Error al crear preferencia de pago',
      error: error.message
    });
  }
});

/**
 * POST /payments/webhook
 * Receives payment notifications from Mercado Pago
 * This is called by Mercado Pago when payment status changes
 */
router.post('/webhook', async (req, res) => {
  try {
    // MP can send data in body OR query params (especially in test simulations)
    // Priority: body > query params
    let type = req.body.type || req.query.type;
    let data = req.body.data;

    // If data is not in body, check query params
    if (!data || !data.id) {
      // MP test webhooks send data.id as query param
      const dataId = req.query.id || req.query['data.id'];
      if (dataId) {
        data = { id: dataId };
      }
    }

    console.log('📥 Webhook received:', {
      type,
      data,
      headers: {
        'x-signature': req.headers['x-signature'],
        'x-request-id': req.headers['x-request-id']
      },
      body: req.body,
      query: req.query
    });

    // Validate webhook signature before processing
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    const shouldValidate = webhookSecret && webhookSecret.trim() !== '';

    if (shouldValidate) {
      // Check if this is a test webhook (missing signature headers)
      const hasSignatureHeaders = req.headers['x-signature'] && req.headers['x-request-id'];

      if (!hasSignatureHeaders) {
        console.warn('⚠️ Test webhook detected (no signature headers) - skipping validation');
        // Allow test webhooks to proceed
      } else {
        // Validate signature for real webhooks
        if (!MercadoPagoUtils.validateWebhookSignature(req.headers, req.query, webhookSecret)) {
          console.error('⚠️ Invalid webhook signature');
          return res.status(401).json({ message: 'Invalid signature' });
        }
        console.log('✅ Webhook signature validated');
      }
    } else {
      console.warn('⚠️ Webhook signature validation skipped (MP_WEBHOOK_SECRET not configured)');
    }

    // Acknowledge receipt after validation
    res.status(200).send('OK');

    // Handle payment notification
    if (type === 'payment') {
      const paymentId = data.id;

      // Wait a bit to ensure MP has processed the payment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get payment details
      const payment = await MercadoPagoPaymentService.getPayment(paymentId.toString());

      // Extract appointment ID from external reference
      const externalRef = payment.external_reference;
      if (!externalRef || !externalRef.startsWith('appointment_')) {
        console.error('Invalid external reference:', externalRef);
        return;
      }

      const appointmentId = parseInt(externalRef.replace('appointment_', ''));

      // Process payment update
      await processPaymentUpdate(appointmentId, payment);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
});

/**
 * Helper function to process payment update
 */
async function processPaymentUpdate(appointmentId, payment) {
  try {
    const paymentStatus = payment.status;
    let newStatus = 'awaiting_payment';

    // Map Mercado Pago status to our status
    switch (paymentStatus) {
      case 'approved':
        newStatus = 'paid';
        break;
      case 'rejected':
      case 'cancelled':
        newStatus = 'failed';
        break;
      case 'refunded':
        newStatus = 'refunded';
        break;
      case 'pending':
      case 'in_process':
      case 'in_mediation':
        newStatus = 'awaiting_payment';
        break;
      default:
        newStatus = 'awaiting_payment';
    }

    // Get appointment to retrieve clinic info
    const { data: cita } = await supabase
      .from('citas')
      .select('id_clinica, payment_amount')
      .eq('id_cita', appointmentId)
      .single();

    // Update appointment
    const updateData = {
      payment_status: newStatus,
      payment_id: payment.id.toString(),
      payment_method: payment.payment_method_id,
      payment_metadata: payment,
    };

    if (newStatus === 'paid') {
      updateData.payment_date = new Date().toISOString();
      // Keep estado as 'confirmada' - payment_status tracks payment separately
      // No need to change estado since it's already confirmed
    }

    const { error: updateError } = await supabase
      .from('citas')
      .update(updateData)
      .eq('id_cita', appointmentId);

    if (updateError) {
      console.error('Error updating appointment payment status:', updateError);
      return;
    }

    // Log transaction
    await supabase.from('payment_transactions').insert([{
      id_cita: appointmentId,
      id_clinica: cita.id_clinica,
      transaction_type: 'payment',
      payment_id: payment.id.toString(),
      amount: payment.transaction_amount,
      status: paymentStatus,
      metadata: payment,
    }]);

    // If payment was approved, create earnings record for clinic
    if (newStatus === 'paid') {
      const commissionPercentage = await getPlatformConfig('commission_percentage') || 10;
      const totalAmount = payment.transaction_amount;
      const { platformCommission, clinicAmount } = MercadoPagoUtils.calculateCommission(
        totalAmount,
        commissionPercentage
      );

      await supabase.from('veterinary_earnings').insert([{
        id_clinica: cita.id_clinica,
        id_cita: appointmentId,
        amount_total: totalAmount,
        platform_commission: platformCommission,
        clinic_amount: clinicAmount,
        status: 'pending',
        payment_date: new Date().toISOString(),
      }]);

      console.log(`💰 Earnings recorded for clinic ${cita.id_clinica}: ${clinicAmount} COP (${totalAmount} - ${platformCommission} commission)`);
    }

    console.log(`✅ Payment ${payment.id} processed for appointment ${appointmentId} - Status: ${newStatus}`);

    // TODO: Send notification to user and clinic
  } catch (error) {
    console.error('Error processing payment update:', error);
  }
}

/**
 * POST /payments/verify/:appointmentId
 * Verify payment status by querying Mercado Pago API directly
 * This is called when user returns from MP or clicks "Verify Payment"
 */
router.post('/verify/:appointmentId', autenticacionToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId, userType } = req.user;

    // Optional: payment_id from query params if MP provides it
    const { payment_id } = req.body;

    console.log(`🔍 Verifying payment for appointment ${appointmentId}`);

    // Get appointment details
    const { data: cita, error: citaError } = await supabase
      .from('citas')
      .select(`
        id_cita,
        id_usuario,
        id_clinica,
        preference_id,
        payment_status,
        payment_id,
        payment_amount
      `)
      .eq('id_cita', appointmentId)
      .single();

    if (citaError || !cita) {
      return res.status(404).json({
        message: 'Cita no encontrada'
      });
    }

    // Check permissions
    const hasAccess =
      (userType === 'owner' && cita.id_usuario === userId) ||
      (userType === 'vet' && cita.id_clinica === req.user.clinicaId);

    if (!hasAccess) {
      return res.status(403).json({
        message: 'No tienes permiso para verificar esta cita'
      });
    }

    // If already processed and paid, return current status
    if (cita.payment_status === 'paid' || cita.payment_status === 'refunded') {
      console.log(`✅ Payment already processed: ${cita.payment_status}`);
      return res.status(200).json({
        message: cita.payment_status === 'paid' ? 'Pago ya confirmado' : 'Pago reembolsado',
        payment_status: cita.payment_status,
        payment_id: cita.payment_id,
        already_processed: true,
      });
    }

    let payment = null;

    // Method 1: Try with payment_id if provided (faster direct lookup)
    if (payment_id) {
      try {
        payment = await MercadoPagoPaymentService.getPayment(payment_id.toString());
        console.log(`✅ Payment found by ID: ${payment_id}`);
      } catch (error) {
        console.warn(`⚠️ Could not find payment by ID ${payment_id}:`, error.message);
        payment = null;
      }
    }

    // Method 2: Search by external_reference (more reliable, works always)
    if (!payment) {
      const externalRef = `appointment_${appointmentId}`;
      console.log(`🔍 Searching payments by external_reference: ${externalRef}`);

      const payments = await MercadoPagoPaymentService.searchPayments(externalRef);

      if (payments.length === 0) {
        console.log(`⚠️ No payment found for appointment ${appointmentId}`);
        return res.status(404).json({
          message: 'No se encontró ningún pago para esta cita. Es posible que aún no se haya completado el pago.',
          payment_status: cita.payment_status || 'awaiting_payment',
          requires_payment: true,
        });
      }

      // Get the most recent payment (in case of retries)
      payment = payments.sort((a, b) =>
        new Date(b.date_created) - new Date(a.date_created)
      )[0];

      console.log(`✅ Payment found by external_reference: ${payment.id} (status: ${payment.status})`);
    }

    // Verify external reference matches (security check)
    if (payment.external_reference !== `appointment_${appointmentId}`) {
      console.error(`⚠️ External reference mismatch: ${payment.external_reference} vs appointment_${appointmentId}`);
      return res.status(400).json({
        message: 'El pago no corresponde a esta cita'
      });
    }

    // Process payment update using existing function
    await processPaymentUpdate(appointmentId, payment);

    // Get updated appointment
    const { data: updatedCita } = await supabase
      .from('citas')
      .select('payment_status, payment_id, payment_date, payment_method, estado')
      .eq('id_cita', appointmentId)
      .single();

    // Build response with user-friendly message
    const response = {
      message: getPaymentMessage(payment.status),
      payment_status: updatedCita.payment_status,
      payment_id: payment.id,
      payment_method: payment.payment_method_id,
      payment_type: payment.payment_type_id,
      transaction_amount: payment.transaction_amount,
      mp_status: payment.status,
      mp_status_detail: payment.status_detail,
      date_approved: payment.date_approved,
      already_processed: false,
    };

    // Add pending payment instructions if needed
    if (payment.status === 'pending') {
      response.pending_info = getPendingPaymentInfo(payment);
    }

    console.log(`✅ Payment verification complete for appointment ${appointmentId}: ${payment.status}`);

    res.status(200).json(response);

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      message: 'Error al verificar el pago. Por favor intenta nuevamente.',
      error: error.message
    });
  }
});

/**
 * Helper: Get user-friendly message based on payment status
 */
function getPaymentMessage(status) {
  const messages = {
    'approved': '¡Pago confirmado! Tu cita ha sido programada.',
    'pending': 'Tu pago está pendiente. Recibirás una confirmación cuando se complete.',
    'in_process': 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
    'rejected': 'Tu pago fue rechazado. Por favor intenta nuevamente.',
    'cancelled': 'El pago fue cancelado.',
    'refunded': 'El pago fue reembolsado.',
    'in_mediation': 'El pago está en mediación.',
    'charged_back': 'Se realizó un contracargo en este pago.',
  };
  return messages[status] || 'Estado de pago actualizado';
}

/**
 * Helper: Get pending payment instructions for Colombian payment methods
 */
function getPendingPaymentInfo(payment) {
  const paymentType = payment.payment_type_id;

  const instructions = {
    'bank_transfer': {
      title: 'Transferencia bancaria pendiente',
      message: 'Completa la transferencia bancaria en los próximos 3 días. Tu cita se confirmará automáticamente cuando recibamos el pago.',
      estimated_time: '2-3 días hábiles',
    },
    'ticket': {
      title: 'Pago en efectivo pendiente',
      message: 'Paga en efectivo en cualquier punto autorizado (Efecty, Baloto, etc.). Encontrarás las instrucciones en tu correo.',
      estimated_time: 'Hasta 2 días hábiles después del pago',
    },
    'atm': {
      title: 'Pago en cajero pendiente',
      message: 'Completa el pago en un cajero automático. Tu cita se confirmará automáticamente.',
      estimated_time: '1-2 días hábiles',
    },
  };

  return instructions[paymentType] || {
    title: 'Pago pendiente',
    message: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
    estimated_time: 'Variable según método de pago',
  };
}

/**
 * GET /payments/status/:appointmentId
 * Get payment status for an appointment
 */
router.get('/status/:appointmentId', autenticacionToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId, userType } = req.user;

    // Get appointment with payment info
    const { data: cita, error } = await supabase
      .from('citas')
      .select(`
        id_cita,
        id_usuario,
        id_clinica,
        payment_status,
        payment_id,
        payment_url,
        payment_amount,
        payment_date,
        payment_method,
        estado
      `)
      .eq('id_cita', appointmentId)
      .single();

    if (error || !cita) {
      return res.status(404).json({
        message: 'Cita no encontrada'
      });
    }

    // Check permissions
    const hasAccess =
      (userType === 'owner' && cita.id_usuario === userId) ||
      (userType === 'vet' && cita.id_clinica === req.user.clinicaId);

    if (!hasAccess) {
      return res.status(403).json({
        message: 'No tienes permiso para ver esta información'
      });
    }

    res.status(200).json({
      appointment_id: cita.id_cita,
      payment_status: cita.payment_status,
      payment_url: cita.payment_url,
      amount: cita.payment_amount,
      payment_date: cita.payment_date,
      payment_method: cita.payment_method,
      estado: cita.estado,
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      message: 'Error al obtener estado de pago',
      error: error.message
    });
  }
});

/**
 * POST /payments/refund/:appointmentId
 * Process refund for cancelled appointment
 */
router.post('/refund/:appointmentId', autenticacionToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const { userId, userType } = req.user;

    // Get appointment details
    const { data: cita, error: citaError } = await supabase
      .from('citas')
      .select(`
        id_cita,
        id_usuario,
        id_clinica,
        payment_status,
        payment_id,
        payment_amount,
        fecha_inicio,
        estado
      `)
      .eq('id_cita', appointmentId)
      .single();

    if (citaError || !cita) {
      return res.status(404).json({
        message: 'Cita no encontrada'
      });
    }

    // Check permissions (owner or vet can request refund)
    const hasAccess =
      (userType === 'owner' && cita.id_usuario === userId) ||
      (userType === 'vet' && cita.id_clinica === req.user.clinicaId);

    if (!hasAccess) {
      return res.status(403).json({
        message: 'No tienes permiso para reembolsar esta cita'
      });
    }

    // Check if payment was made
    if (cita.payment_status !== 'paid' || !cita.payment_id) {
      return res.status(400).json({
        message: 'Esta cita no tiene un pago confirmado para reembolsar'
      });
    }

    // Check refund deadline
    const refundDeadlineHours = await getPlatformConfig('refund_deadline_hours') || 24;
    const appointmentDate = new Date(cita.fecha_inicio);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);

    if (hoursUntilAppointment < refundDeadlineHours) {
      return res.status(400).json({
        message: `No se puede reembolsar. Debe cancelar con al menos ${refundDeadlineHours} horas de anticipación`,
        hours_until_appointment: hoursUntilAppointment.toFixed(1)
      });
    }

    // Process refund using platform credentials
    const refund = await MercadoPagoRefundService.createFullRefund(cita.payment_id);

    // Update appointment
    const { error: updateError } = await supabase
      .from('citas')
      .update({
        payment_status: 'refunded',
        refund_id: refund.id.toString(),
        refund_date: new Date().toISOString(),
        refund_reason: reason || 'Cancelación de cita',
        estado: 'cancelada',
        motivo_cancelacion: reason || 'Cancelación con reembolso',
      })
      .eq('id_cita', appointmentId);

    if (updateError) {
      console.error('Error updating appointment after refund:', updateError);
    }

    // Log transaction
    await supabase.from('payment_transactions').insert([{
      id_cita: appointmentId,
      id_clinica: cita.id_clinica,
      transaction_type: 'refund',
      payment_id: cita.payment_id,
      amount: refund.amount,
      status: refund.status,
      metadata: refund,
    }]);

    // Update earnings record to cancelled
    await supabase
      .from('veterinary_earnings')
      .update({
        status: 'cancelled',
        notes: `Refund processed: ${reason || 'Cancelación de cita'}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id_cita', appointmentId);

    console.log(`✅ Refund processed for appointment ${appointmentId}`);

    res.status(200).json({
      message: 'Reembolso procesado exitosamente',
      refund_id: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      message: 'Error al procesar reembolso',
      error: error.message
    });
  }
});

/**
 * GET /payments/clinic-earnings
 * Get earnings summary for a veterinary clinic
 * Shows pending, paid, and total earnings
 */
router.get('/clinic-earnings', autenticacionToken, async (req, res) => {
  try {
    const { userType, clinicaId } = req.user;

    if (userType !== 'vet') {
      return res.status(403).json({
        message: 'Solo las clínicas pueden ver sus ganancias'
      });
    }

    // Get all earnings for this clinic
    const { data: earnings, error } = await supabase
      .from('veterinary_earnings')
      .select(`
        *,
        citas (
          id_cita,
          fecha_inicio,
          servicios (
            nombre
          ),
          usuarios (
            nombre,
            correo
          )
        )
      `)
      .eq('id_clinica', clinicaId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching clinic earnings:', error);
      return res.status(500).json({
        message: 'Error al obtener ganancias'
      });
    }

    // Calculate totals by status
    const totals = {
      pending: 0,
      paid_out: 0,
      total_earned: 0,
    };

    earnings.forEach(earning => {
      if (earning.status === 'pending') {
        totals.pending += parseFloat(earning.clinic_amount);
      } else if (earning.status === 'paid_out') {
        totals.paid_out += parseFloat(earning.clinic_amount);
      }

      if (earning.status !== 'cancelled') {
        totals.total_earned += parseFloat(earning.clinic_amount);
      }
    });

    res.status(200).json({
      totals,
      earnings,
    });
  } catch (error) {
    console.error('Error getting clinic earnings:', error);
    res.status(500).json({
      message: 'Error al obtener ganancias',
      error: error.message
    });
  }
});

export default router;
