import pkg from 'mercadopago';
const { MercadoPagoConfig, Preference, Payment, OAuth, Refund } = pkg;
import dotenv from 'dotenv';

dotenv.config();

/**
 * Mercado Pago Service
 * Handles all interactions with the Mercado Pago API including:
 * - OAuth authentication for marketplace sellers
 * - Payment preference creation
 * - Payment queries and refunds
 * - Split payments with marketplace fees
 */

// Initialize Mercado Pago client with marketplace credentials
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: {
    timeout: 5000,
    idempotencyKey: 'unique-key', // This will be overridden per request
  }
});

/**
 * OAuth Service for Marketplace Integration
 * Handles seller authorization flow
 */
export class MercadoPagoOAuthService {
  /**
   * Generate OAuth authorization URL for sellers
   * @param {string} state - Random state for CSRF protection
   * @returns {string} Authorization URL
   */
  static getAuthorizationURL(state) {
    const clientId = process.env.MP_CLIENT_ID;
    const redirectUri = process.env.MP_REDIRECT_URI;

    return `https://auth.mercadopago.com.co/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from callback
   * @returns {Promise<Object>} Token response with access_token, refresh_token, etc.
   */
  static async getAccessToken(code) {
    try {
      const oauth = new OAuth(client);

      const response = await oauth.create({
        body: {
          client_secret: process.env.MP_CLIENT_SECRET,
          client_id: process.env.MP_CLIENT_ID,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.MP_REDIRECT_URI,
        }
      });

      return {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        public_key: response.public_key,
        user_id: response.user_id,
        expires_in: response.expires_in, // Seconds until expiration (usually 15552000 = 180 days)
        token_type: response.token_type,
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw new Error('Failed to obtain access token from Mercado Pago');
    }
  }

  /**
   * Refresh an expired access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token response
   */
  static async refreshAccessToken(refreshToken) {
    try {
      const oauth = new OAuth(client);

      const response = await oauth.create({
        body: {
          client_secret: process.env.MP_CLIENT_SECRET,
          client_id: process.env.MP_CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }
      });

      return {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        public_key: response.public_key,
        user_id: response.user_id,
        expires_in: response.expires_in,
        token_type: response.token_type,
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh access token');
    }
  }
}

/**
 * Payment Preference Service
 * Creates payment links for appointments
 */
export class MercadoPagoPreferenceService {
  /**
   * Create a payment preference for an appointment
   * @param {Object} params - Preference parameters
   * @param {string} params.sellerAccessToken - Clinic's Mercado Pago access token
   * @param {number} params.appointmentId - Appointment ID
   * @param {string} params.title - Service name
   * @param {number} params.amount - Total amount
   * @param {number} params.marketplaceFee - Platform commission
   * @param {Object} params.payer - Payer information (email, name)
   * @param {Object} params.clinic - Clinic information
   * @returns {Promise<Object>} Preference with init_point URL
   */
  static async createPreference(params) {
    const {
      sellerAccessToken,
      appointmentId,
      title,
      amount,
      marketplaceFee,
      payer,
      clinic,
    } = params;

    try {
      // Create client with seller's access token
      const sellerClient = new MercadoPagoConfig({
        accessToken: sellerAccessToken,
      });

      const preference = new Preference(sellerClient);

      const preferenceData = {
        items: [
          {
            id: `appointment_${appointmentId}`,
            title: title,
            description: `Cita veterinaria en ${clinic.nombre}`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'COP', // Colombian Peso
          }
        ],
        payer: {
          name: payer.name,
          email: payer.email,
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/dashboard-client/appointments/${appointmentId}/payment/success`,
          failure: `${process.env.FRONTEND_URL}/dashboard-client/appointments/${appointmentId}/payment/failure`,
          pending: `${process.env.FRONTEND_URL}/dashboard-client/appointments/${appointmentId}/payment/pending`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/payments/webhook`,
        external_reference: `appointment_${appointmentId}`,
        marketplace_fee: marketplaceFee, // Platform commission
        metadata: {
          appointment_id: appointmentId,
          clinic_id: clinic.id,
          clinic_name: clinic.nombre,
        },
        statement_descriptor: 'Lety Marketplace', // Appears on card statement
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

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
   * @param {string} sellerAccessToken - Clinic's access token
   * @returns {Promise<Object>} Preference details
   */
  static async getPreference(preferenceId, sellerAccessToken) {
    try {
      const sellerClient = new MercadoPagoConfig({
        accessToken: sellerAccessToken,
      });

      const preference = new Preference(sellerClient);
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
   * @param {string} sellerAccessToken - Clinic's access token
   * @returns {Promise<Object>} Payment details
   */
  static async getPayment(paymentId, sellerAccessToken) {
    try {
      const sellerClient = new MercadoPagoConfig({
        accessToken: sellerAccessToken,
      });

      const payment = new Payment(sellerClient);
      return await payment.get({ id: paymentId });
    } catch (error) {
      console.error('Error getting payment:', error);
      throw new Error('Failed to retrieve payment details');
    }
  }

  /**
   * Search payments by external reference
   * @param {string} externalReference - External reference (e.g., 'appointment_123')
   * @param {string} sellerAccessToken - Clinic's access token
   * @returns {Promise<Array>} List of payments
   */
  static async searchPayments(externalReference, sellerAccessToken) {
    try {
      const sellerClient = new MercadoPagoConfig({
        accessToken: sellerAccessToken,
      });

      const payment = new Payment(sellerClient);
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
   * @param {string} sellerAccessToken - Clinic's access token
   * @returns {Promise<Object>} Refund details
   */
  static async createFullRefund(paymentId, sellerAccessToken) {
    try {
      const sellerClient = new MercadoPagoConfig({
        accessToken: sellerAccessToken,
      });

      const refund = new Refund(sellerClient);

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
   * @param {string} sellerAccessToken - Clinic's access token
   * @returns {Promise<Object>} Refund details
   */
  static async createPartialRefund(paymentId, amount, sellerAccessToken) {
    try {
      const sellerClient = new MercadoPagoConfig({
        accessToken: sellerAccessToken,
      });

      const refund = new Refund(sellerClient);

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
   * @param {string} sellerAccessToken - Clinic's access token
   * @returns {Promise<Object>} Refund details
   */
  static async getRefund(refundId, sellerAccessToken) {
    try {
      const sellerClient = new MercadoPagoConfig({
        accessToken: sellerAccessToken,
      });

      const refund = new Refund(sellerClient);
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
   * Calculate marketplace fee based on commission percentage
   * @param {number} amount - Total amount
   * @param {number} commissionPercentage - Commission percentage (0-100)
   * @returns {number} Fee amount
   */
  static calculateMarketplaceFee(amount, commissionPercentage) {
    return parseFloat((amount * (commissionPercentage / 100)).toFixed(2));
  }

  /**
   * Validate webhook signature (for security)
   * @param {Object} headers - Request headers
   * @param {Object} body - Request body
   * @returns {boolean} True if signature is valid
   */
  static validateWebhookSignature(headers, body) {
    // TODO: Implement signature validation using x-signature header
    // This requires the webhook secret from Mercado Pago
    // For now, we'll validate the x-request-id header exists
    return !!headers['x-request-id'];
  }

  /**
   * Check if access token is expired or about to expire
   * @param {Date} expirationDate - Token expiration date
   * @returns {boolean} True if token needs refresh
   */
  static needsTokenRefresh(expirationDate) {
    if (!expirationDate) return true;

    const now = new Date();
    const expiration = new Date(expirationDate);
    const daysUntilExpiration = (expiration - now) / (1000 * 60 * 60 * 24);

    // Refresh if less than 7 days until expiration
    return daysUntilExpiration < 7;
  }
}

export default {
  OAuth: MercadoPagoOAuthService,
  Preference: MercadoPagoPreferenceService,
  Payment: MercadoPagoPaymentService,
  Refund: MercadoPagoRefundService,
  Utils: MercadoPagoUtils,
};
