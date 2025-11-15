/**
 * Payment Validation Utilities
 * Validates payment-related operations and data
 */

/**
 * Validate payment amount
 * @param {number} amount - Amount to validate
 * @returns {Object} Validation result
 */
export function validatePaymentAmount(amount) {
  const errors = [];

  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push('El monto debe ser un número válido');
  }

  if (amount <= 0) {
    errors.push('El monto debe ser mayor a cero');
  }

  if (amount > 50000000) {
    // Max 50M COP
    errors.push('El monto excede el límite permitido');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate commission percentage
 * @param {number} percentage - Commission percentage (0-100)
 * @returns {Object} Validation result
 */
export function validateCommissionPercentage(percentage) {
  const errors = [];

  if (typeof percentage !== 'number' || isNaN(percentage)) {
    errors.push('El porcentaje de comisión debe ser un número válido');
  }

  if (percentage < 0 || percentage > 100) {
    errors.push('El porcentaje de comisión debe estar entre 0 y 100');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate payment status transition
 * @param {string} currentStatus - Current payment status
 * @param {string} newStatus - New payment status
 * @returns {Object} Validation result
 */
export function validatePaymentStatusTransition(currentStatus, newStatus) {
  const validStatuses = [
    'pending',
    'awaiting_payment',
    'paid',
    'refunded',
    'failed',
    'cancelled'
  ];

  const errors = [];

  if (!validStatuses.includes(currentStatus)) {
    errors.push(`Estado actual inválido: ${currentStatus}`);
  }

  if (!validStatuses.includes(newStatus)) {
    errors.push(`Estado nuevo inválido: ${newStatus}`);
  }

  // Define valid transitions
  const validTransitions = {
    pending: ['awaiting_payment', 'cancelled'],
    awaiting_payment: ['paid', 'failed', 'cancelled'],
    paid: ['refunded'],
    refunded: [],
    failed: ['awaiting_payment', 'cancelled'],
    cancelled: [],
  };

  if (currentStatus in validTransitions) {
    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      errors.push(
        `Transición no permitida: de "${currentStatus}" a "${newStatus}"`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Mercado Pago tokens
 * @param {Object} tokens - Token object
 * @returns {Object} Validation result
 */
export function validateMercadoPagoTokens(tokens) {
  const errors = [];

  if (!tokens.access_token || typeof tokens.access_token !== 'string') {
    errors.push('Access token inválido o faltante');
  }

  if (!tokens.refresh_token || typeof tokens.refresh_token !== 'string') {
    errors.push('Refresh token inválido o faltante');
  }

  if (!tokens.public_key || typeof tokens.public_key !== 'string') {
    errors.push('Public key inválida o faltante');
  }

  if (!tokens.user_id) {
    errors.push('User ID faltante');
  }

  if (tokens.expires_in && (typeof tokens.expires_in !== 'number' || tokens.expires_in <= 0)) {
    errors.push('Expires_in debe ser un número positivo');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate payment metadata
 * @param {Object} metadata - Payment metadata from Mercado Pago
 * @returns {Object} Validation result
 */
export function validatePaymentMetadata(metadata) {
  const errors = [];

  if (!metadata || typeof metadata !== 'object') {
    errors.push('Metadata debe ser un objeto');
    return { isValid: false, errors };
  }

  // Check required fields in webhook payload
  if (!metadata.id) {
    errors.push('Payment ID faltante en metadata');
  }

  if (!metadata.status) {
    errors.push('Payment status faltante en metadata');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate refund request
 * @param {Object} refundData - Refund request data
 * @returns {Object} Validation result
 */
export function validateRefundRequest(refundData) {
  const errors = [];

  if (!refundData.payment_id) {
    errors.push('Payment ID es requerido para reembolso');
  }

  if (refundData.payment_status !== 'paid') {
    errors.push('Solo se pueden reembolsar pagos completados');
  }

  if (refundData.amount !== undefined) {
    // Partial refund
    const amountValidation = validatePaymentAmount(refundData.amount);
    if (!amountValidation.isValid) {
      errors.push(...amountValidation.errors);
    }

    if (refundData.amount > refundData.total_amount) {
      errors.push('El monto del reembolso no puede exceder el monto pagado');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate preference creation data
 * @param {Object} preferenceData - Preference creation data
 * @returns {Object} Validation result
 */
export function validatePreferenceData(preferenceData) {
  const errors = [];

  if (!preferenceData.appointmentId) {
    errors.push('Appointment ID es requerido');
  }

  if (!preferenceData.title || preferenceData.title.trim().length === 0) {
    errors.push('Título del servicio es requerido');
  }

  const amountValidation = validatePaymentAmount(preferenceData.amount);
  if (!amountValidation.isValid) {
    errors.push(...amountValidation.errors);
  }

  if (preferenceData.marketplaceFee !== undefined) {
    const feeValidation = validatePaymentAmount(preferenceData.marketplaceFee);
    if (!feeValidation.isValid) {
      errors.push('Comisión de marketplace inválida');
    }

    if (preferenceData.marketplaceFee >= preferenceData.amount) {
      errors.push('La comisión no puede ser mayor o igual al monto total');
    }
  }

  if (!preferenceData.payer || !preferenceData.payer.email) {
    errors.push('Email del pagador es requerido');
  }

  if (preferenceData.payer && preferenceData.payer.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(preferenceData.payer.email)) {
      errors.push('Email del pagador inválido');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate webhook signature from Mercado Pago
 * @param {Object} headers - Request headers
 * @param {Object} body - Request body
 * @param {string} secret - Webhook secret
 * @returns {boolean} True if signature is valid
 */
export function validateWebhookSignature(headers, body, secret) {
  // TODO: Implement actual signature validation
  // Mercado Pago sends x-signature and x-request-id headers
  // This requires HMAC SHA256 validation with the webhook secret

  // For now, basic validation
  const hasRequiredHeaders = headers['x-request-id'] && headers['x-signature'];

  if (!hasRequiredHeaders) {
    return false;
  }

  // In production, implement full signature validation:
  // const signature = headers['x-signature'];
  // const requestId = headers['x-request-id'];
  // const computedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(JSON.stringify(body) + requestId)
  //   .digest('hex');
  // return signature === computedSignature;

  return true;
}

export default {
  validatePaymentAmount,
  validateCommissionPercentage,
  validatePaymentStatusTransition,
  validateMercadoPagoTokens,
  validatePaymentMetadata,
  validateRefundRequest,
  validatePreferenceData,
  validateWebhookSignature,
};
