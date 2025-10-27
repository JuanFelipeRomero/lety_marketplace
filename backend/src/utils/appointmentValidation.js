/**
 * Utilidades de validación para el sistema de citas
 * @module appointmentValidation
 */

/**
 * Validar que la clínica esté activa y aprobada
 * @param {Object} supabase - Cliente de Supabase
 * @param {number} clinicId - ID de la clínica
 * @returns {Promise<Object>} - { isValid: boolean, error?: string, clinic?: Object }
 */
export const validateClinicStatus = async (supabase, clinicId) => {
  try {
    const { data: clinic, error } = await supabase
      .from('clinicas')
      .select('id_clinica, nombre, estado, tiempo_minimo_anticipacion, tiempo_maximo_anticipacion, duracion_slot_cita')
      .eq('id_clinica', clinicId)
      .single();

    if (error || !clinic) {
      return {
        isValid: false,
        error: 'Clínica no encontrada',
      };
    }

    if (clinic.estado !== 'confirmado') {
      return {
        isValid: false,
        error: `La clínica no está disponible para agendar citas. Estado actual: ${clinic.estado}`,
      };
    }

    return {
      isValid: true,
      clinic,
    };
  } catch (error) {
    console.error('Error validating clinic status:', error);
    return {
      isValid: false,
      error: 'Error al validar el estado de la clínica',
    };
  }
};

/**
 * Validar que el servicio esté disponible y pertenezca a la clínica
 * @param {Object} supabase - Cliente de Supabase
 * @param {number} serviceId - ID del servicio
 * @param {number} clinicId - ID de la clínica
 * @returns {Promise<Object>} - { isValid: boolean, error?: string, service?: Object }
 */
export const validateServiceAvailability = async (supabase, serviceId, clinicId) => {
  try {
    const { data: service, error } = await supabase
      .from('servicios')
      .select('id_servicio, id_clinica, nombre, disponible, duracion_minutos, precio')
      .eq('id_servicio', serviceId)
      .single();

    if (error || !service) {
      return {
        isValid: false,
        error: 'Servicio no encontrado',
      };
    }

    // Verificar que el servicio pertenezca a la clínica
    if (service.id_clinica !== clinicId) {
      return {
        isValid: false,
        error: 'El servicio seleccionado no pertenece a esta clínica',
      };
    }

    // Verificar que el servicio esté disponible
    if (!service.disponible) {
      return {
        isValid: false,
        error: 'El servicio seleccionado no está disponible actualmente',
      };
    }

    // Verificar que el servicio tenga una duración válida
    if (!service.duracion_minutos || service.duracion_minutos <= 0) {
      return {
        isValid: false,
        error: 'El servicio no tiene una duración configurada correctamente',
      };
    }

    return {
      isValid: true,
      service,
    };
  } catch (error) {
    console.error('Error validating service availability:', error);
    return {
      isValid: false,
      error: 'Error al validar la disponibilidad del servicio',
    };
  }
};

/**
 * Obtener día de la semana en inglés desde una fecha
 * @param {Date} date - Fecha
 * @returns {string} - Día de la semana en inglés (monday, tuesday, etc.)
 */
const getDayOfWeek = (date) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

/**
 * Validar que la cita esté dentro del horario de atención de la clínica
 * @param {Object} supabase - Cliente de Supabase
 * @param {number} clinicId - ID de la clínica
 * @param {Date} fechaInicio - Fecha y hora de inicio de la cita
 * @param {Date} fechaFin - Fecha y hora de fin de la cita
 * @returns {Promise<Object>} - { isValid: boolean, error?: string }
 */
export const validateBusinessHours = async (supabase, clinicId, fechaInicio, fechaFin) => {
  try {
    // Obtener el día de la semana
    const dayOfWeek = getDayOfWeek(fechaInicio);

    // Consultar horario de atención para ese día
    const { data: horario, error } = await supabase
      .from('horarios_atencion')
      .select('*')
      .eq('id_clinica', clinicId)
      .eq('dia_semana', dayOfWeek)
      .single();

    if (error || !horario) {
      return {
        isValid: false,
        error: `La clínica no tiene horario de atención configurado para ${dayOfWeek}`,
      };
    }

    // Si está cerrado ese día
    if (horario.esta_cerrado) {
      return {
        isValid: false,
        error: `La clínica está cerrada los ${dayOfWeek}`,
      };
    }

    // Si es 24 horas, siempre es válido
    if (horario.es_24h) {
      return { isValid: true };
    }

    // Validar que las horas de apertura y cierre existan
    if (!horario.hora_apertura || !horario.hora_cierre) {
      return {
        isValid: false,
        error: 'Horario de atención no configurado correctamente',
      };
    }

    // Extraer las horas de inicio y fin de la cita
    const appointmentStartTime = fechaInicio.toTimeString().slice(0, 8); // "HH:MM:SS"
    const appointmentEndTime = fechaFin.toTimeString().slice(0, 8); // "HH:MM:SS"

    // Comparar horarios
    if (appointmentStartTime < horario.hora_apertura) {
      return {
        isValid: false,
        error: `La cita no puede iniciar antes de la hora de apertura (${horario.hora_apertura})`,
      };
    }

    if (appointmentEndTime > horario.hora_cierre) {
      return {
        isValid: false,
        error: `La cita no puede finalizar después de la hora de cierre (${horario.hora_cierre})`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating business hours:', error);
    return {
      isValid: false,
      error: 'Error al validar el horario de atención',
    };
  }
};

/**
 * Validar ventana de anticipación para agendar
 * @param {Date} fechaInicio - Fecha y hora de inicio de la cita
 * @param {number} minMinutos - Tiempo mínimo de anticipación en minutos
 * @param {number} maxDias - Tiempo máximo de anticipación en días
 * @returns {Object} - { isValid: boolean, error?: string }
 */
export const validateBookingWindow = (fechaInicio, minMinutos = 120, maxDias = 90) => {
  const now = new Date();
  const appointmentDate = new Date(fechaInicio);

  // Calcular diferencia en milisegundos
  const diffMs = appointmentDate - now;
  const diffMinutes = diffMs / (1000 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Validar anticipación mínima
  if (diffMinutes < minMinutos) {
    return {
      isValid: false,
      error: `Debes agendar con al menos ${minMinutos} minutos (${Math.floor(minMinutos / 60)} horas) de anticipación`,
    };
  }

  // Validar anticipación máxima
  if (diffDays > maxDias) {
    return {
      isValid: false,
      error: `No puedes agendar con más de ${maxDias} días de anticipación`,
    };
  }

  return { isValid: true };
};

/**
 * Validar que el timeSlot cumpla con la granularidad requerida
 * @param {string} timeSlot - Hora en formato "HH:MM"
 * @param {number} granularityMinutes - Granularidad en minutos (15, 30, 60)
 * @returns {Object} - { isValid: boolean, error?: string }
 */
export const validateTimeSlotGranularity = (timeSlot, granularityMinutes = 30) => {
  try {
    // Extraer minutos del timeSlot
    const [hours, minutes] = timeSlot.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      return {
        isValid: false,
        error: 'Formato de hora inválido. Use HH:MM',
      };
    }

    // Validar que los minutos sean múltiplo de la granularidad
    if (minutes % granularityMinutes !== 0) {
      return {
        isValid: false,
        error: `Los horarios deben ser en intervalos de ${granularityMinutes} minutos (ej: 09:00, 09:${granularityMinutes}, 10:00)`,
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error al validar el formato de hora',
    };
  }
};

/**
 * Verificar conflictos de horario con otras citas
 * @param {Object} supabase - Cliente de Supabase
 * @param {number} clinicId - ID de la clínica
 * @param {Date} fechaInicio - Fecha y hora de inicio
 * @param {Date} fechaFin - Fecha y hora de fin
 * @param {number} excludeAppointmentId - ID de cita a excluir (para ediciones)
 * @returns {Promise<Object>} - { hasConflict: boolean, error?: string, conflicts?: Array }
 */
export const checkAppointmentConflicts = async (
  supabase,
  clinicId,
  fechaInicio,
  fechaFin,
  excludeAppointmentId = null
) => {
  try {
    // Construir query base
    let query = supabase
      .from('citas')
      .select('id_cita, fecha_inicio, fecha_fin, estado')
      .eq('id_clinica', clinicId)
      .neq('estado', 'cancelada') // Ignorar citas canceladas
      // Lógica de solapamiento: (Inicio_A < Fin_B) Y (Fin_A > Inicio_B)
      .lt('fecha_inicio', fechaFin.toISOString())
      .gt('fecha_fin', fechaInicio.toISOString());

    // Si es una edición, excluir la cita actual
    if (excludeAppointmentId) {
      query = query.neq('id_cita', excludeAppointmentId);
    }

    const { data: conflicts, error } = await query;

    if (error) {
      console.error('Error checking conflicts:', error);
      return {
        hasConflict: false,
        error: 'Error al verificar conflictos de horario',
      };
    }

    if (conflicts && conflicts.length > 0) {
      return {
        hasConflict: true,
        conflicts,
        error: 'Ya existe una cita en este horario. Por favor, selecciona otro horario.',
      };
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Error in checkAppointmentConflicts:', error);
    return {
      hasConflict: false,
      error: 'Error al verificar conflictos',
    };
  }
};

/**
 * Validación completa para agendar/editar una cita
 * @param {Object} params - Parámetros de validación
 * @param {Object} params.supabase - Cliente de Supabase
 * @param {number} params.clinicId - ID de la clínica
 * @param {number} params.serviceId - ID del servicio
 * @param {Date} params.fechaInicio - Fecha y hora de inicio
 * @param {Date} params.fechaFin - Fecha y hora de fin
 * @param {string} params.timeSlot - Hora en formato "HH:MM"
 * @param {number} params.excludeAppointmentId - ID de cita a excluir (para ediciones)
 * @returns {Promise<Object>} - { isValid: boolean, errors: Array, clinic?: Object, service?: Object }
 */
export const validateCompleteAppointment = async ({
  supabase,
  clinicId,
  serviceId,
  fechaInicio,
  fechaFin,
  timeSlot,
  excludeAppointmentId = null,
}) => {
  const errors = [];
  let clinic = null;
  let service = null;

  // 1. Validar estado de la clínica
  const clinicValidation = await validateClinicStatus(supabase, clinicId);
  if (!clinicValidation.isValid) {
    errors.push(clinicValidation.error);
  } else {
    clinic = clinicValidation.clinic;
  }

  // 2. Validar disponibilidad del servicio
  const serviceValidation = await validateServiceAvailability(supabase, serviceId, clinicId);
  if (!serviceValidation.isValid) {
    errors.push(serviceValidation.error);
  } else {
    service = serviceValidation.service;
  }

  // Si tenemos la clínica, continuar con validaciones que dependen de ella
  if (clinic) {
    // 3. Validar horarios de atención
    const businessHoursValidation = await validateBusinessHours(
      supabase,
      clinicId,
      fechaInicio,
      fechaFin
    );
    if (!businessHoursValidation.isValid) {
      errors.push(businessHoursValidation.error);
    }

    // 4. Validar ventana de anticipación
    const bookingWindowValidation = validateBookingWindow(
      fechaInicio,
      clinic.tiempo_minimo_anticipacion,
      clinic.tiempo_maximo_anticipacion
    );
    if (!bookingWindowValidation.isValid) {
      errors.push(bookingWindowValidation.error);
    }

    // 5. Validar granularidad de time slot
    const granularityValidation = validateTimeSlotGranularity(
      timeSlot,
      clinic.duracion_slot_cita
    );
    if (!granularityValidation.isValid) {
      errors.push(granularityValidation.error);
    }
  }

  // 6. Verificar conflictos de horario
  const conflictValidation = await checkAppointmentConflicts(
    supabase,
    clinicId,
    fechaInicio,
    fechaFin,
    excludeAppointmentId
  );
  if (conflictValidation.hasConflict) {
    errors.push(conflictValidation.error);
  }

  return {
    isValid: errors.length === 0,
    errors,
    clinic,
    service,
  };
};
