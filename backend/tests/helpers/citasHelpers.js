import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { createTestUser, createTestClinica, createTestMascota } from "./testHelpers.js";

/**
 * Helpers específicos para tests de citas
 */

// Create test Supabase client
export const createTestSupabaseClient = () => {
  return createClient(
    process.env.SUPABASE_URL || "http://localhost:54321",
    process.env.SERVICE_ROL_KEY || "test-key"
  );
};

/**
 * Create test appointment data
 */
export const createTestCita = (overrides = {}) => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 7); // 7 días en el futuro

  return {
    id_cita: 1,
    id_usuario: 1,
    id_mascota: 1,
    id_clinica: 1,
    id_servicio: 1,
    fecha_inicio: baseDate.toISOString(),
    horario: "10:00",
    motivo: "Consulta general",
    estado: "pendiente",
    notas_adicionales: "Notas de prueba",
    preferencia_recordatorio: "both",
    acepto_terminos: true,
    created_at: new Date().toISOString(),
    trazabilidad: [
      {
        accion: "creacion",
        usuario: 1,
        fecha: new Date().toISOString(),
        detalles: {
          estado: "pendiente",
          motivo: "Consulta general",
          notas: "Notas de prueba",
        },
      },
    ],
    ...overrides,
  };
};

/**
 * Create test service data
 */
export const createTestServicio = (overrides = {}) => {
  return {
    id_servicio: 1,
    id_clinica: 1,
    nombre: "Consulta General",
    descripcion: "Consulta veterinaria general",
    precio: 50000,
    categoria: "Consulta",
    disponible: true,
    ...overrides,
  };
};

/**
 * Create complete test data setup for appointments
 */
export const createTestAppointmentSetup = (overrides = {}) => {
  const user = createTestUser({ id_usuario: overrides.userId || 1 });
  const clinica = createTestClinica({ id_clinica: overrides.clinicId || 1 });
  const mascota = createTestMascota({ 
    id_mascota: overrides.petId || 1,
    id_usuario: overrides.userId || 1 
  });
  const servicio = createTestServicio({ 
    id_servicio: overrides.serviceId || 1,
    id_clinica: overrides.clinicId || 1 
  });
  const cita = createTestCita({
    id_usuario: overrides.userId || 1,
    id_clinica: overrides.clinicId || 1,
    id_mascota: overrides.petId || 1,
    id_servicio: overrides.serviceId || 1,
    ...overrides.citaOverrides
  });

  return {
    user,
    clinica,
    mascota,
    servicio,
    cita,
  };
};

/**
 * Generate appointment tokens
 */
export const createAppointmentUserToken = (userId = 1) => {
  const secret = process.env.JWT_SECRET || "test-secret";
  return jwt.sign(
    {
      userId,
      userType: "owner",
    },
    secret,
    { expiresIn: "1h" }
  );
};

export const createAppointmentVetToken = (clinicaId = 1) => {
  const secret = process.env.JWT_SECRET || "test-secret";
  return jwt.sign(
    {
      clinicaId,
      userType: "vet",
    },
    secret,
    { expiresIn: "1h" }
  );
};

/**
 * Mock Supabase responses for appointments
 */
export const createMockAppointmentSupabase = () => {
  const mockData = {
    citas: [],
    mascotas: [],
    clinicas: [],
    servicios: [],
    usuarios: [],
  };

  return {
    from: jest.fn((table) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockData[table]?.[0] || null,
            error: null,
          })),
          order: jest.fn(() => ({
            data: mockData[table] || [],
            error: null,
          })),
          data: mockData[table] || [],
          error: null,
        })),
        order: jest.fn(() => ({
          data: mockData[table] || [],
          error: null,
        })),
        data: mockData[table] || [],
        error: null,
      })),
      insert: jest.fn(() => ({
        data: [mockData[table]?.[0] || {}],
        error: null,
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [mockData[table]?.[0] || {}],
          error: null,
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    setMockData: (table, data) => {
      mockData[table] = Array.isArray(data) ? data : [data];
    },
  };
};

/**
 * Validation helpers
 */
export const isValidAppointmentStatus = (status) => {
  const validStatuses = [
    "pendiente",
    "confirmada", 
    "rechazada",
    "reprogramacion_sugerida",
    "cancelada",
    "finalizada"
  ];
  return validStatuses.includes(status);
};

export const isValidTimeSlot = (timeSlot) => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeSlot);
};

export const isValidFutureDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  return !isNaN(date.getTime()) && date > now;
};

export const isValidReminderPreference = (preference) => {
  const validPreferences = ["email", "sms", "both", "none"];
  return validPreferences.includes(preference);
};

/**
 * Test data cleanup helpers
 */
export const cleanupTestAppointments = async (supabase, appointmentIds = []) => {
  if (appointmentIds.length === 0) return;
  
  try {
    await supabase
      .from("citas")
      .delete()
      .in("id_cita", appointmentIds);
  } catch (error) {
    console.warn("Error cleaning up test appointments:", error);
  }
};

/**
 * Request body builders for tests
 */
export const buildScheduleAppointmentRequest = (overrides = {}) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  return {
    petId: 1,
    serviceId: 1,
    clinicId: 1,
    date: futureDate.toISOString(),
    timeSlot: "10:00",
    reason: "Consulta general",
    notes: "Notas de prueba",
    reminderPreference: "both",
    acceptedTerms: true,
    ...overrides,
  };
};

export const buildUpdateStatusRequest = (overrides = {}) => {
  return {
    status: "confirmada",
    message: "Cita confirmada por la clínica",
    ...overrides,
  };
};

export const buildEditAppointmentRequest = (overrides = {}) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);

  return {
    petId: 1,
    serviceId: 1,
    date: futureDate.toISOString(),
    timeSlot: "14:00",
    reason: "Consulta de seguimiento",
    notes: "Notas actualizadas",
    reminderPreference: "email",
    ...overrides,
  };
};

export const buildFinalizeAppointmentRequest = (overrides = {}) => {
  return {
    diagnostico: "Diagnóstico de prueba",
    tratamiento: "Tratamiento prescrito",
    medicamentos: ["Medicina A", "Medicina B"],
    recomendaciones: "Recomendaciones post-consulta",
    instrucciones_seguimiento: "Seguimiento en 2 semanas",
    notas_internas: "Notas internas de la clínica",
    servicios_adicionales: [],
    productos_vendidos: [],
    ...overrides,
  };
};

export const buildRescheduleRequest = (overrides = {}) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 14);

  return {
    date: futureDate.toISOString(),
    timeSlot: "16:00",
    message: "Reprogramación solicitada",
    ...overrides,
  };
};

export const buildCancelAppointmentRequest = (overrides = {}) => {
  return {
    reason: "Motivo de cancelación",
    ...overrides,
  };
};
