/**
 * Refund Policy Utilities
 * Handles refund eligibility and policy enforcement
 */

/**
 * Check if appointment is eligible for automatic refund
 * @param {Object} appointment - Appointment data
 * @param {number} refundDeadlineHours - Hours before appointment to allow refund
 * @returns {Object} Eligibility result
 */
export function isEligibleForRefund(appointment, refundDeadlineHours = 24) {
  const errors = [];
  const warnings = [];

  // Check if payment was made
  if (appointment.payment_status !== 'paid') {
    errors.push('La cita no tiene un pago confirmado');
    return {
      eligible: false,
      reason: 'no_payment',
      errors,
      warnings,
    };
  }

  // Check if already refunded
  if (appointment.payment_status === 'refunded') {
    errors.push('Esta cita ya fue reembolsada');
    return {
      eligible: false,
      reason: 'already_refunded',
      errors,
      warnings,
    };
  }

  // Check if appointment is already completed
  if (appointment.estado === 'finalizada') {
    errors.push('No se puede reembolsar una cita ya finalizada');
    return {
      eligible: false,
      reason: 'already_completed',
      errors,
      warnings,
    };
  }

  // Check time until appointment
  const appointmentDate = new Date(appointment.fecha_inicio);
  const now = new Date();
  const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);

  if (appointmentDate < now) {
    errors.push('No se puede reembolsar una cita que ya pasó');
    return {
      eligible: false,
      reason: 'appointment_passed',
      errors,
      warnings,
    };
  }

  if (hoursUntilAppointment < refundDeadlineHours) {
    errors.push(
      `Debe cancelar con al menos ${refundDeadlineHours} horas de anticipación para reembolso automático`
    );
    warnings.push(
      `Faltan ${hoursUntilAppointment.toFixed(1)} horas para la cita. ` +
      `Puede solicitar reembolso manual contactando a la clínica.`
    );
    return {
      eligible: false,
      reason: 'past_deadline',
      errors,
      warnings,
      hoursUntilAppointment: hoursUntilAppointment.toFixed(1),
    };
  }

  // All checks passed
  return {
    eligible: true,
    reason: 'eligible',
    errors: [],
    warnings: [],
    hoursUntilAppointment: hoursUntilAppointment.toFixed(1),
  };
}

/**
 * Calculate refund amount based on cancellation time
 * @param {number} totalAmount - Total payment amount
 * @param {number} hoursUntilAppointment - Hours until appointment
 * @param {Object} policy - Refund policy configuration
 * @returns {Object} Refund calculation
 */
export function calculateRefundAmount(
  totalAmount,
  hoursUntilAppointment,
  policy = {}
) {
  const {
    fullRefundDeadlineHours = 24,
    partialRefundDeadlineHours = 12,
    partialRefundPercentage = 50,
  } = policy;

  let refundAmount = 0;
  let refundPercentage = 0;
  let refundType = 'none';

  if (hoursUntilAppointment >= fullRefundDeadlineHours) {
    // Full refund
    refundAmount = totalAmount;
    refundPercentage = 100;
    refundType = 'full';
  } else if (hoursUntilAppointment >= partialRefundDeadlineHours) {
    // Partial refund
    refundAmount = totalAmount * (partialRefundPercentage / 100);
    refundPercentage = partialRefundPercentage;
    refundType = 'partial';
  } else {
    // No refund
    refundAmount = 0;
    refundPercentage = 0;
    refundType = 'none';
  }

  return {
    refundAmount: parseFloat(refundAmount.toFixed(2)),
    refundPercentage,
    refundType,
    totalAmount,
    hoursUntilAppointment,
  };
}

/**
 * Get refund policy description for display
 * @param {number} refundDeadlineHours - Hours before appointment
 * @returns {string} Policy description
 */
export function getRefundPolicyDescription(refundDeadlineHours = 24) {
  return (
    `Política de reembolso: ` +
    `Reembolso completo al cancelar con ${refundDeadlineHours} horas o más de anticipación. ` +
    `Cancelaciones con menos anticipación pueden estar sujetas a cargo por cancelación tardía.`
  );
}

/**
 * Validate refund reason
 * @param {string} reason - Cancellation reason
 * @returns {Object} Validation result
 */
export function validateRefundReason(reason) {
  const errors = [];

  if (!reason || typeof reason !== 'string') {
    errors.push('Debe proporcionar un motivo de cancelación');
  }

  if (reason && reason.trim().length < 10) {
    errors.push('El motivo de cancelación debe tener al menos 10 caracteres');
  }

  if (reason && reason.length > 500) {
    errors.push('El motivo de cancelación no puede exceder 500 caracteres');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if user has excessive cancellations (anti-abuse)
 * @param {number} userId - User ID
 * @param {Object} supabase - Supabase client
 * @param {number} timeWindowDays - Days to check
 * @param {number} maxCancellations - Maximum allowed cancellations
 * @returns {Promise<Object>} Abuse check result
 */
export async function checkCancellationAbuse(
  userId,
  supabase,
  timeWindowDays = 30,
  maxCancellations = 3
) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindowDays);

    const { data, error } = await supabase
      .from('citas')
      .select('id_cita, payment_status, motivo_cancelacion')
      .eq('id_usuario', userId)
      .eq('estado', 'cancelada')
      .eq('payment_status', 'refunded')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Error checking cancellation abuse:', error);
      return {
        abusive: false,
        count: 0,
        message: 'No se pudo verificar historial de cancelaciones',
      };
    }

    const cancellationCount = data?.length || 0;
    const isAbusive = cancellationCount >= maxCancellations;

    return {
      abusive: isAbusive,
      count: cancellationCount,
      maxAllowed: maxCancellations,
      timeWindowDays,
      message: isAbusive
        ? `Has cancelado ${cancellationCount} citas en los últimos ${timeWindowDays} días. ` +
          `Límite de cancelaciones alcanzado.`
        : null,
    };
  } catch (error) {
    console.error('Error in checkCancellationAbuse:', error);
    return {
      abusive: false,
      count: 0,
      message: 'Error al verificar historial',
    };
  }
}

/**
 * Calculate platform fee refund
 * The marketplace fee should also be refunded to maintain proportions
 * @param {number} marketplaceFee - Original marketplace fee
 * @param {number} refundPercentage - Refund percentage (0-100)
 * @returns {number} Refundable marketplace fee
 */
export function calculateMarketplaceFeeRefund(marketplaceFee, refundPercentage) {
  return parseFloat((marketplaceFee * (refundPercentage / 100)).toFixed(2));
}

/**
 * Get cancellation window status
 * @param {Date} appointmentDate - Appointment date
 * @param {number} refundDeadlineHours - Refund deadline in hours
 * @returns {Object} Window status
 */
export function getCancellationWindowStatus(appointmentDate, refundDeadlineHours = 24) {
  const now = new Date();
  const deadline = new Date(appointmentDate);
  deadline.setHours(deadline.getHours() - refundDeadlineHours);

  const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
  const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);

  let status = 'unknown';
  if (now > appointmentDate) {
    status = 'appointment_passed';
  } else if (now > deadline) {
    status = 'past_deadline';
  } else if (hoursUntilDeadline < 1) {
    status = 'deadline_approaching';
  } else {
    status = 'within_window';
  }

  return {
    status,
    canRefund: status === 'within_window',
    hoursUntilDeadline: Math.max(0, hoursUntilDeadline).toFixed(1),
    hoursUntilAppointment: Math.max(0, hoursUntilAppointment).toFixed(1),
    deadline: deadline.toISOString(),
  };
}

export default {
  isEligibleForRefund,
  calculateRefundAmount,
  getRefundPolicyDescription,
  validateRefundReason,
  checkCancellationAbuse,
  calculateMarketplaceFeeRefund,
  getCancellationWindowStatus,
};
