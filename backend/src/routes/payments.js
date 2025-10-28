import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  MercadoPagoPreferenceService,
  MercadoPagoPaymentService,
  MercadoPagoRefundService,
  MercadoPagoUtils,
} from '../services/mercadopago.js';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SERVICE_ROL_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Payment Routes
 * Handles payment preference creation, status checks, and refunds
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
 * Helper function to check if clinic has MP connected and token is valid
 */
async function getClinicMPTokens(clinicId) {
  const { data: clinica, error } = await supabase
    .from('clinicas')
    .select('mercadopago_access_token, mercadopago_refresh_token, mp_connected, mp_token_expiration, nombre')
    .eq('id_clinica', clinicId)
    .single();

  if (error || !clinica) {
    throw new Error('Clínica no encontrada');
  }

  if (!clinica.mp_connected || !clinica.mercadopago_access_token) {
    throw new Error('La clínica no tiene Mercado Pago configurado');
  }

  // Check if token needs refresh
  if (MercadoPagoUtils.needsTokenRefresh(clinica.mp_token_expiration)) {
    // TODO: Implement automatic token refresh
    console.warn(`⚠️ Token for clinic ${clinicId} needs refresh`);
  }

  return {
    accessToken: clinica.mercadopago_access_token,
    nombre: clinica.nombre,
  };
}

/**
 * POST /payments/create-preference
 * Creates a payment preference (payment link) for an appointment
 * Called when vet confirms the appointment
 */
router.post('/create-preference', async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const { userId, userType } = req.user;

    // Only vets can create payment preferences (when confirming appointment)
    if (userType !== 'vet') {
      return res.status(403).json({
        message: 'Solo las clínicas pueden crear preferencias de pago'
      });
    }

    if (!appointmentId) {
      return res.status(400).json({
        message: 'ID de cita requerido'
      });
    }

    // Get appointment details
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
        usuarios(nombre, correo),
        clinicas(nombre)
      `)
      .eq('id_cita', appointmentId)
      .single();

    if (citaError || !cita) {
      return res.status(404).json({
        message: 'Cita no encontrada'
      });
    }

    // Verify appointment belongs to this clinic
    if (cita.id_clinica !== req.user.clinicaId) {
      return res.status(403).json({
        message: 'Esta cita no pertenece a tu clínica'
      });
    }

    // Check if preference already exists
    if (cita.payment_status === 'awaiting_payment' || cita.payment_status === 'paid') {
      return res.status(400).json({
        message: 'Esta cita ya tiene un pago en proceso o completado'
      });
    }

    // Get clinic's Mercado Pago tokens
    const clinic = await getClinicMPTokens(cita.id_clinica);

    // Get platform commission percentage
    const commissionPercentage = await getPlatformConfig('commission_percentage') || 10;

    // Calculate amounts
    const serviceAmount = parseFloat(cita.servicios.precio);
    const marketplaceFee = MercadoPagoUtils.calculateMarketplaceFee(
      serviceAmount,
      commissionPercentage
    );

    // Create payment preference
    const preference = await MercadoPagoPreferenceService.createPreference({
      sellerAccessToken: clinic.accessToken,
      appointmentId: cita.id_cita,
      title: cita.servicios.nombre,
      amount: serviceAmount,
      marketplaceFee: marketplaceFee,
      payer: {
        name: cita.usuarios.nombre,
        email: cita.usuarios.correo,
      },
      clinic: {
        id: cita.id_clinica,
        nombre: clinic.nombre,
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
        marketplace_fee: marketplaceFee,
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
        marketplace_fee: marketplaceFee,
      },
    }]);

    console.log(`✅ Payment preference created for appointment ${appointmentId}`);

    res.status(201).json({
      message: 'Preferencia de pago creada exitosamente',
      payment_url: preference.init_point,
      preference_id: preference.id,
      amount: serviceAmount,
      marketplace_fee: marketplaceFee,
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
    const { type, data } = req.body;

    console.log('📥 Webhook received:', { type, data });

    // Acknowledge receipt immediately
    res.status(200).send('OK');

    // Validate webhook (basic validation)
    if (!MercadoPagoUtils.validateWebhookSignature(req.headers, req.body)) {
      console.error('⚠️ Invalid webhook signature');
      return;
    }

    // Handle payment notification
    if (type === 'payment') {
      const paymentId = data.id;

      // We need to get the external_reference to find the appointment
      // Since we don't have the seller token here, we'll search all appointments
      // with this payment_id or match by preference_id

      // Wait a bit to ensure MP has processed the payment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Find appointment by checking recent appointments
      const { data: recentAppointments, error: searchError } = await supabase
        .from('citas')
        .select('id_cita, id_clinica, preference_id, payment_status')
        .eq('payment_status', 'awaiting_payment')
        .order('created_at', { ascending: false })
        .limit(50);

      if (searchError) {
        console.error('Error searching appointments:', searchError);
        return;
      }

      // Try to get payment details and match with appointment
      for (const appointment of recentAppointments) {
        try {
          // Get clinic tokens
          const clinic = await getClinicMPTokens(appointment.id_clinica);

          // Get payment details
          const payment = await MercadoPagoPaymentService.getPayment(
            paymentId.toString(),
            clinic.accessToken
          );

          // Check if this payment matches this appointment
          const externalRef = payment.external_reference;
          if (externalRef === `appointment_${appointment.id_cita}`) {
            // Found matching appointment!
            await processPaymentUpdate(appointment.id_cita, payment);
            break;
          }
        } catch (err) {
          // Continue to next appointment
          continue;
        }
      }
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

    // Update appointment
    const updateData = {
      payment_status: newStatus,
      payment_id: payment.id.toString(),
      payment_method: payment.payment_method_id,
      payment_metadata: payment,
    };

    if (newStatus === 'paid') {
      updateData.payment_date = new Date().toISOString();
      updateData.estado = 'pagada'; // Update appointment state to paid
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
      id_clinica: payment.collector_id,
      transaction_type: 'payment',
      payment_id: payment.id.toString(),
      amount: payment.transaction_amount,
      status: paymentStatus,
      metadata: payment,
    }]);

    console.log(`✅ Payment ${payment.id} processed for appointment ${appointmentId} - Status: ${newStatus}`);

    // TODO: Send notification to user and clinic
  } catch (error) {
    console.error('Error processing payment update:', error);
  }
}

/**
 * GET /payments/status/:appointmentId
 * Get payment status for an appointment
 */
router.get('/status/:appointmentId', async (req, res) => {
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
        marketplace_fee,
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
      marketplace_fee: cita.marketplace_fee,
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
router.post('/refund/:appointmentId', async (req, res) => {
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

    // Get clinic tokens
    const clinic = await getClinicMPTokens(cita.id_clinica);

    // Process refund
    const refund = await MercadoPagoRefundService.createFullRefund(
      cita.payment_id,
      clinic.accessToken
    );

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

export default router;
