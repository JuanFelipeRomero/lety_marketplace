import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import {
  createTestUser,
  createTestClinica,
  createTestMascota,
} from "./testHelpers.js";

/**
 * Helpers específicos para tests de analytics
 */

// Create test Supabase client
export const createTestSupabaseClient = () => {
  return createClient(
    process.env.SUPABASE_URL || "http://localhost:54321",
    process.env.SERVICE_ROL_KEY || "test-key"
  );
};

/**
 * Create test analytics data factories
 */
export const createTestCitaForAnalytics = (overrides = {}) => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 15); // 15 días atrás por defecto

  return {
    id_cita: 1,
    id_usuario: 1,
    id_mascota: 1,
    id_clinica: 1,
    id_servicio: 1,
    fecha_inicio: baseDate.toISOString(),
    fecha_fin: new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString(), // +1 hora
    estado: "completada",
    horario: "10:00",
    motivo: "Consulta general",
    notas_adicionales: "Notas de prueba",
    preferencia_recordatorio: "both",
    acepto_terminos: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
};

export const createTestServicioForAnalytics = (overrides = {}) => {
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

export const createTestReseñaForAnalytics = (overrides = {}) => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 10); // 10 días atrás

  return {
    id_resena: 1,
    id_usuario: 1,
    id_clinica: 1,
    calificacion: 5,
    comentario: "Excelente servicio",
    fecha: baseDate.toISOString(),
    ...overrides,
  };
};

export const createTestMascotaForAnalytics = (overrides = {}) => {
  return {
    id_mascota: 1,
    id_usuario: 1,
    nombre: "Test Pet",
    edad: 3,
    raza: "Golden Retriever",
    especie: "Perro",
    genero: "Macho",
    peso: 25.5,
    historial_medico: "Historial de prueba",
    ...overrides,
  };
};

/**
 * Create comprehensive analytics dataset
 */
export const createAnalyticsTestDataset = (clinicId = 1) => {
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setDate(today.getDate() - 30);

  // Create data for different time periods
  const dataset = {
    clinica: createTestClinica({ id_clinica: clinicId }),

    // Citas con diferentes estados y fechas
    citas: [
      createTestCitaForAnalytics({
        id_cita: 1,
        id_clinica: clinicId,
        estado: "completada",
        fecha_inicio: new Date(
          today.getTime() - 5 * 24 * 60 * 60 * 1000
        ).toISOString(), // 5 días atrás
      }),
      createTestCitaForAnalytics({
        id_cita: 2,
        id_clinica: clinicId,
        estado: "programada",
        fecha_inicio: new Date(
          today.getTime() - 3 * 24 * 60 * 60 * 1000
        ).toISOString(), // 3 días atrás
      }),
      createTestCitaForAnalytics({
        id_cita: 3,
        id_clinica: clinicId,
        estado: "cancelada",
        fecha_inicio: new Date(
          today.getTime() - 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // 7 días atrás
      }),
      createTestCitaForAnalytics({
        id_cita: 4,
        id_clinica: clinicId,
        estado: "finalizada",
        fecha_inicio: new Date(
          today.getTime() - 10 * 24 * 60 * 60 * 1000
        ).toISOString(), // 10 días atrás
      }),
    ],

    // Servicios variados
    servicios: [
      createTestServicioForAnalytics({
        id_servicio: 1,
        id_clinica: clinicId,
        nombre: "Consulta General",
        precio: 50000,
      }),
      createTestServicioForAnalytics({
        id_servicio: 2,
        id_clinica: clinicId,
        nombre: "Vacunación",
        precio: 80000,
      }),
      createTestServicioForAnalytics({
        id_servicio: 3,
        id_clinica: clinicId,
        nombre: "Cirugía Menor",
        precio: 150000,
      }),
    ],

    // Mascotas con diferentes especies y edades
    mascotas: [
      createTestMascotaForAnalytics({
        id_mascota: 1,
        especie: "Perro",
        edad: 2,
      }),
      createTestMascotaForAnalytics({
        id_mascota: 2,
        especie: "Gato",
        edad: 5,
      }),
      createTestMascotaForAnalytics({
        id_mascota: 3,
        especie: "Ave",
        edad: 1,
      }),
    ],

    // Reseñas con diferentes calificaciones
    reseñas: [
      createTestReseñaForAnalytics({
        id_resena: 1,
        id_clinica: clinicId,
        calificacion: 5,
      }),
      createTestReseñaForAnalytics({
        id_resena: 2,
        id_clinica: clinicId,
        calificacion: 4,
      }),
      createTestReseñaForAnalytics({
        id_resena: 3,
        id_clinica: clinicId,
        calificacion: 3,
      }),
      createTestReseñaForAnalytics({
        id_resena: 4,
        id_clinica: clinicId,
        calificacion: 5,
      }),
    ],
  };

  return dataset;
};

/**
 * Generate analytics tokens
 */
export const createAnalyticsVetToken = (clinicaId = 1) => {
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

export const createAnalyticsUserToken = (userId = 1) => {
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

/**
 * Mock Supabase client for analytics unit tests
 */
export const createMockAnalyticsSupabase = () => {
  const mockData = {
    clinicas: [],
    citas: [],
    servicios: [],
    mascotas: [],
    reseñas: [],
  };

  const mockQueries = {
    // Mock para consultas básicas
    basicSelect: jest.fn(() => ({
      data: [],
      error: null,
    })),

    // Mock para consultas con joins
    joinSelect: jest.fn(() => ({
      data: [],
      error: null,
    })),

    // Mock para RPC calls
    rpcCall: jest.fn(() => ({
      data: [],
      error: null,
    })),
  };

  return {
    from: jest.fn((table) => ({
      select: jest.fn((columns = "*") => {
        const query = {
          eq: jest.fn((column, value) => ({
            single: jest.fn(() => {
              if (table === "clinicas" && column === "id_clinica") {
                return {
                  data:
                    mockData.clinicas.find((c) => c.id_clinica === value) ||
                    null,
                  error: mockData.clinicas.find((c) => c.id_clinica === value)
                    ? null
                    : { message: "Not found" },
                };
              }
              return mockQueries.basicSelect();
            }),
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => mockQueries.basicSelect()),
                data: mockData[table] || [],
                error: null,
              })),
            })),
            data: mockData[table] || [],
            error: null,
          })),
          gte: jest.fn(() => ({
            lte: jest.fn(() => {
              if (
                columns.includes("servicios(") ||
                columns.includes("mascotas(")
              ) {
                return mockQueries.joinSelect();
              }
              return mockQueries.basicSelect();
            }),
          })),
          in: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => mockQueries.basicSelect()),
            })),
          })),
          data: mockData[table] || [],
          error: null,
        };
        return query;
      }),
    })),

    rpc: jest.fn((functionName, params) => {
      if (functionName === "get_top_services") {
        return mockQueries.rpcCall();
      }
      return mockQueries.rpcCall();
    }),

    // Helper methods to set mock data
    setMockData: (table, data) => {
      mockData[table] = Array.isArray(data) ? data : [data];
    },

    setMockResponse: (type, response) => {
      mockQueries[type].mockReturnValue(response);
    },

    // Expose mocks for assertions
    mocks: mockQueries,
  };
};

/**
 * Request builders for analytics tests
 */
export const buildAnalyticsRequest = (overrides = {}) => {
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setDate(today.getDate() - 30);

  return {
    from_date: lastMonth.toISOString().split("T")[0], // YYYY-MM-DD
    to_date: today.toISOString().split("T")[0],
    ...overrides,
  };
};

export const buildInvalidDateRequest = () => {
  return {
    from_date: "invalid-date",
    to_date: "2024-01-01",
  };
};

export const buildFutureDateRequest = () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  return {
    from_date: futureDate.toISOString().split("T")[0],
    to_date: futureDate.toISOString().split("T")[0],
  };
};

/**
 * Response validators for analytics
 */
export const validateAppointmentsAnalyticsResponse = (response) => {
  const { body } = response;

  return {
    hasValidStructure: !!(
      body.totalAppointments !== undefined &&
      Array.isArray(body.statusDistribution) &&
      Array.isArray(body.appointmentsByDate)
    ),
    hasValidStatusDistribution:
      Array.isArray(body.statusDistribution) &&
      body.statusDistribution.every(
        (item) => item.name && typeof item.value === "number"
      ),
    hasValidDateData:
      Array.isArray(body.appointmentsByDate) &&
      body.appointmentsByDate.every(
        (item) => item.date && typeof item.total === "number"
      ),
  };
};

export const validateServicesAnalyticsResponse = (response) => {
  const { body } = response;

  return {
    hasValidStructure: !!(
      Array.isArray(body.topServices) && Array.isArray(body.servicesRevenue)
    ),
    hasValidTopServices: body.topServices?.every(
      (item) => item.name && typeof item.value === "number"
    ),
    hasValidRevenue: body.servicesRevenue?.every(
      (item) =>
        item.name &&
        typeof item.value === "number" &&
        typeof item.revenue === "number"
    ),
  };
};

export const validateDemographicsAnalyticsResponse = (response) => {
  const { body } = response;

  return {
    hasValidStructure: !!(
      Array.isArray(body.petTypeDistribution) &&
      Array.isArray(body.ageDistribution)
    ),
    hasValidPetTypes: body.petTypeDistribution?.every(
      (item) => item.type && typeof item.count === "number"
    ),
    hasValidAgeDistribution: body.ageDistribution?.every(
      (item) => item.range && typeof item.count === "number"
    ),
  };
};

export const validateRatingsAnalyticsResponse = (response) => {
  const { body } = response;

  return {
    hasValidStructure: !!(
      typeof body.averageRating === "number" &&
      Array.isArray(body.ratingDistribution)
    ),
    hasValidAverage: body.averageRating >= 0 && body.averageRating <= 5,
    hasValidDistribution: body.ratingDistribution?.every(
      (item) => item.rating && typeof item.count === "number"
    ),
  };
};

export const validateSummaryAnalyticsResponse = (response) => {
  const { body } = response;

  return {
    hasValidStructure: !!(
      typeof body.totalAppointments === "number" &&
      typeof body.avgRating === "number" &&
      typeof body.totalRevenue === "number" &&
      typeof body.totalPets === "number"
    ),
    hasValidRanges:
      body.totalAppointments >= 0 &&
      body.avgRating >= 0 &&
      body.avgRating <= 5 &&
      body.totalRevenue >= 0 &&
      body.totalPets >= 0,
  };
};

/**
 * Date validation helpers
 */
export const isValidDateFormat = (dateString) => {
  if (!dateString || typeof dateString !== "string") return false;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  // Parse the date components
  const [year, month, day] = dateString.split("-").map(Number);

  // Create date object and check if it matches the input
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

export const isValidDateRange = (fromDate, toDate) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  return from <= to;
};

/**
 * Analytics calculation helpers for testing
 */
export const calculateExpectedStats = (citas) => {
  if (!citas || !Array.isArray(citas)) {
    return {
      total: 0,
      completed: 0,
      scheduled: 0,
      cancelled: 0,
    };
  }

  const stats = {
    total: citas.length,
    completed: 0,
    scheduled: 0,
    cancelled: 0,
  };

  citas.forEach((cita) => {
    if (!cita || !cita.estado) return;
    const estado = cita.estado.toLowerCase();
    if (estado === "completada" || estado === "finalizada") {
      stats.completed++;
    } else if (estado === "programada") {
      stats.scheduled++;
    } else if (estado === "cancelada") {
      stats.cancelled++;
    }
  });

  return stats;
};

export const calculateExpectedAverage = (reseñas) => {
  if (!reseñas || !Array.isArray(reseñas) || reseñas.length === 0) return 0;

  const total = reseñas.reduce((sum, reseña) => sum + reseña.calificacion, 0);
  return parseFloat((total / reseñas.length).toFixed(1));
};

export const groupCitasByDate = (citas) => {
  const grouped = {};

  citas.forEach((cita) => {
    const date = cita.fecha_inicio.split("T")[0];
    if (!grouped[date]) {
      grouped[date] = { total: 0, completed: 0, scheduled: 0, cancelled: 0 };
    }

    grouped[date].total++;
    const estado = cita.estado.toLowerCase();
    if (estado === "completada" || estado === "finalizada") {
      grouped[date].completed++;
    } else if (estado === "programada") {
      grouped[date].scheduled++;
    } else if (estado === "cancelada") {
      grouped[date].cancelled++;
    }
  });

  return grouped;
};

/**
 * Test cleanup helpers
 */
export const cleanupAnalyticsTestData = async (supabase, testData = {}) => {
  try {
    // Cleanup in reverse dependency order
    if (testData.citaIds && testData.citaIds.length > 0) {
      await supabase.from("citas").delete().in("id_cita", testData.citaIds);
    }

    if (testData.reseñaIds && testData.reseñaIds.length > 0) {
      await supabase
        .from("reseñas")
        .delete()
        .in("id_resena", testData.reseñaIds);
    }

    if (testData.servicioIds && testData.servicioIds.length > 0) {
      await supabase
        .from("servicios")
        .delete()
        .in("id_servicio", testData.servicioIds);
    }

    if (testData.mascotaIds && testData.mascotaIds.length > 0) {
      await supabase
        .from("mascotas")
        .delete()
        .in("id_mascota", testData.mascotaIds);
    }

    if (testData.clinicaIds && testData.clinicaIds.length > 0) {
      await supabase
        .from("clinicas")
        .delete()
        .in("id_clinica", testData.clinicaIds);
    }
  } catch (error) {
    console.warn("Error cleaning up analytics test data:", error);
  }
};
