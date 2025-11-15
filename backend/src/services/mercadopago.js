import pkg from 'mercadopago';
const { MercadoPagoConfig, Preference, Payment, Refund } = pkg;
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Mercado Pago Service - Simplified Version
 *
 * This service handles all interactions with Mercado Pago API for a SIMPLE payment flow:
 * - All payments go to the PLATFORM's Mercado Pago account (not individual clinics)
 * - Platform tracks internally what is owed to each clinic
 * - No OAuth or marketplace split payments
 * - Simplified for educational/demo purposes
 *
 * Flow:
 * 1. Customer books appointment → Platform creates payment preference
 * 2. Customer pays → Money goes to platform's MP account
 * 3. Webhook confirms payment → Platform records debt to clinic in veterinary_earnings table
 * 4. Platform pays clinics manually (outside of Mercado Pago integration)
 */

// Initialize Mercado Pago client with PLATFORM credentials
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: {
    timeout: 5000,
  }
});

/**
 * Payment Preference Service
 * Creates payment links for appointments
 */
export class MercadoPagoPreferenceService {
  /**
   * Create a payment preference for an appointment
   * @param {Object} params - Preference parameters
   * @param {number} params.appointmentId - Appointment ID
   * @param {string} params.title - Service name
   * @param {number} params.amount - Total amount (what customer pays)
   * @param {Object} params.payer - Payer information (email, first_name, last_name, phone, identification, address)
   * @param {Object} params.clinic - Clinic information (for reference)
   * @returns {Promise<Object>} Preference with init_point URL
   */
  static async createPreference(params) {
    const {
      appointmentId,
      title,
      amount,
      payer,
      clinic,
    } = params;

    // Validate required environment variables
    if (!process.env.FRONTEND_URL || !process.env.BACKEND_URL) {
      console.error('❌ Missing environment variables:');
      console.error('  FRONTEND_URL:', process.env.FRONTEND_URL);
      console.error('  BACKEND_URL:', process.env.BACKEND_URL);
      throw new Error('FRONTEND_URL and BACKEND_URL environment variables must be set');
    }

    console.log('✅ Creating payment preference with URLs:');
    console.log('  FRONTEND_URL:', process.env.FRONTEND_URL);
    console.log('  BACKEND_URL:', process.env.BACKEND_URL);

    try {
      const preference = new Preference(client);

      // Build payer object with all available fields
      const payerData = {
        email: payer.email,
      };

      // Add name fields (split from full name if needed)
      if (payer.first_name && payer.last_name) {
        payerData.name = payer.first_name;
        payerData.surname = payer.last_name;
      } else if (payer.name) {
        // Fallback: split full name into first and last
        const nameParts = payer.name.trim().split(' ');
        payerData.name = nameParts[0];
        payerData.surname = nameParts.slice(1).join(' ') || nameParts[0];
      }

      // Add phone if available
      if (payer.phone) {
        payerData.phone = {
          area_code: '',
          number: payer.phone,
        };
      }

      // Add identification if available
      if (payer.identification && payer.identification.type && payer.identification.number) {
        payerData.identification = {
          type: payer.identification.type, // CC, CE, TI, PA, etc.
          number: payer.identification.number,
        };
      }

      // Add address if available
      if (payer.address) {
        payerData.address = {
          street_name: payer.address.street_name || payer.address.direccion || '',
          street_number: payer.address.street_number || '',
          zip_code: payer.address.zip_code || payer.address.codigo_postal || '',
        };
      }

      const preferenceData = {
        items: [
          {
            id: `appointment_${appointmentId}`,
            title: title,
            description: `Cita veterinaria en ${clinic.nombre}`,
            category_id: 'services', // Required for quality checklist
            quantity: 1,
            unit_price: amount,
            currency_id: 'COP', // Colombian Peso
          }
        ],
        payer: payerData,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/dashboard-client/appointments/${appointmentId}?payment=success`,
          failure: `${process.env.FRONTEND_URL}/dashboard-client/appointments/${appointmentId}?payment=failure`,
          pending: `${process.env.FRONTEND_URL}/dashboard-client/appointments/${appointmentId}?payment=pending`,
        },
        // auto_return: 'approved', // Temporarily disabled - causes issues with localhost URLs
        notification_url: `${process.env.BACKEND_URL}/payments/webhook`,
        external_reference: `appointment_${appointmentId}`,
        metadata: {
          appointment_id: appointmentId,
          clinic_id: clinic.id,
          clinic_name: clinic.nombre,
        },
        statement_descriptor: 'Lety Marketplace', // Appears on card statement
        purpose: 'wallet_purchase', // Required for compliance
        binary_mode: false, // Allow pending payments for bank transfers, cash, etc.
        additional_info: {
          items: [
            {
              id: `appointment_${appointmentId}`,
              title: title,
              description: `Cita veterinaria en ${clinic.nombre}`,
              category_id: 'services',
              quantity: 1,
              unit_price: amount,
            }
          ],
          payer: {
            first_name: payerData.name || '',
            last_name: payerData.surname || '',
            phone: payer.phone ? { area_code: '', number: payer.phone } : undefined,
            address: payer.address ? {
              street_name: payer.address.street_name || payer.address.direccion || '',
              zip_code: payer.address.zip_code || payer.address.codigo_postal || '',
            } : undefined,
          },
          shipments: {
            receiver_address: {
              zip_code: clinic.codigo_postal || '',
              street_name: clinic.direccion || '',
              city_name: clinic.ciudad || 'Bogotá',
            }
          }
        },
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      console.log('📤 Sending preference to Mercado Pago:', JSON.stringify({
        items: preferenceData.items,
        back_urls: preferenceData.back_urls,
        auto_return: preferenceData.auto_return,
      }, null, 2));

      const response = await preference.create({ body: preferenceData });

      return {
        id: response.id,
        init_point: response.init_point, // Payment URL for desktop
        sandbox_init_point: response.sandbox_init_point, // For testing
        collector_id: response.collector_id,
        date_created: response.date_created,
      };
    } catch (error) {
      console.error('Error creating payment preference:', error);
      throw new Error(`Failed to create payment preference: ${error.message}`);
    }
  }

  /**
   * Get preference details
   * @param {string} preferenceId - Preference ID
   * @returns {Promise<Object>} Preference details
   */
  static async getPreference(preferenceId) {
    try {
      const preference = new Preference(client);
      return await preference.get({ preferenceId });
    } catch (error) {
      console.error('Error getting preference:', error);
      throw new Error('Failed to retrieve payment preference');
    }
  }
}

/**
 * Payment Service
 * Query and manage payments
 */
export class MercadoPagoPaymentService {
  /**
   * Get payment details
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment details
   */
  static async getPayment(paymentId) {
    try {
      const payment = new Payment(client);
      return await payment.get({ id: paymentId });
    } catch (error) {
      console.error('Error getting payment:', error);
      throw new Error('Failed to retrieve payment details');
    }
  }

  /**
   * Search payments by external reference
   * @param {string} externalReference - External reference (e.g., 'appointment_123')
   * @returns {Promise<Array>} List of payments
   */
  static async searchPayments(externalReference) {
    try {
      const payment = new Payment(client);
      const response = await payment.search({
        options: {
          criteria: 'desc',
          external_reference: externalReference,
        }
      });

      return response.results || [];
    } catch (error) {
      console.error('Error searching payments:', error);
      throw new Error('Failed to search payments');
    }
  }
}

/**
 * Refund Service
 * Process refunds for cancelled appointments
 */
export class MercadoPagoRefundService {
  /**
   * Create a full refund for a payment
   * @param {string} paymentId - Payment ID to refund
   * @returns {Promise<Object>} Refund details
   */
  static async createFullRefund(paymentId) {
    try {
      const refund = new Refund(client);

      const response = await refund.create({
        body: {
          payment_id: parseInt(paymentId),
        }
      });

      return {
        id: response.id,
        payment_id: response.payment_id,
        amount: response.amount,
        status: response.status,
        date_created: response.date_created,
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Create a partial refund for a payment
   * @param {string} paymentId - Payment ID to refund
   * @param {number} amount - Amount to refund
   * @returns {Promise<Object>} Refund details
   */
  static async createPartialRefund(paymentId, amount) {
    try {
      const refund = new Refund(client);

      const response = await refund.create({
        body: {
          payment_id: parseInt(paymentId),
          amount: amount,
        }
      });

      return {
        id: response.id,
        payment_id: response.payment_id,
        amount: response.amount,
        status: response.status,
        date_created: response.date_created,
      };
    } catch (error) {
      console.error('Error creating partial refund:', error);
      throw new Error(`Failed to process partial refund: ${error.message}`);
    }
  }

  /**
   * Get refund details
   * @param {string} refundId - Refund ID
   * @returns {Promise<Object>} Refund details
   */
  static async getRefund(refundId) {
    try {
      const refund = new Refund(client);
      return await refund.get({ id: refundId });
    } catch (error) {
      console.error('Error getting refund:', error);
      throw new Error('Failed to retrieve refund details');
    }
  }
}

/**
 * Utility functions
 */
export class MercadoPagoUtils {
  /**
   * Calculate platform commission and clinic amount
   * @param {number} totalAmount - Total amount paid by customer
   * @param {number} commissionPercentage - Commission percentage (0-100)
   * @returns {Object} { platformCommission, clinicAmount }
   */
  static calculateCommission(totalAmount, commissionPercentage) {
    const platformCommission = parseFloat((totalAmount * (commissionPercentage / 100)).toFixed(2));
    const clinicAmount = parseFloat((totalAmount - platformCommission).toFixed(2));

    return {
      platformCommission,
      clinicAmount,
    };
  }

  /**
   * Validate webhook signature (for security)
   * @param {Object} headers - Request headers
   * @param {Object} query - Query parameters
   * @param {string} webhookSecret - Mercado Pago webhook secret
   * @returns {boolean} True if signature is valid
   */
  static validateWebhookSignature(headers, query, webhookSecret) {
    // Validate x-request-id header exists
    if (!headers['x-request-id']) {
      console.error('Missing x-request-id header');
      return false;
    }

    // If no webhook secret is configured, skip signature validation
    // (not recommended for production, but useful for development)
    if (!webhookSecret) {
      console.warn('⚠️ No webhook secret configured - skipping signature validation');
      return true;
    }

    // Get signature from header
    const xSignature = headers['x-signature'];
    const xRequestId = headers['x-request-id'];

    if (!xSignature || !xRequestId) {
      console.error('Missing x-signature or x-request-id header');
      return false;
    }

    // Extract data_id from query parameters (sent by Mercado Pago)
    const dataId = query.id || query['data.id'];

    if (!dataId) {
      console.error('Missing data ID in query parameters');
      return false;
    }

    try {
      // Mercado Pago webhook signature validation
      // The signature is created with: HMAC-SHA256(data_id + x-request-id, webhook_secret)
      const message = `${dataId}${xRequestId}`;
      const expectedSignature = crypto.createHmac('sha256', webhookSecret)
        .update(message)
        .digest('hex');

      // Compare signatures
      const isValid = expectedSignature === xSignature;

      if (!isValid) {
        console.error('Invalid webhook signature');
        console.error('Expected:', expectedSignature);
        console.error('Received:', xSignature);
      }

      return isValid;
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }
}

export default {
  Preference: MercadoPagoPreferenceService,
  Payment: MercadoPagoPaymentService,
  Refund: MercadoPagoRefundService,
  Utils: MercadoPagoUtils,
};
