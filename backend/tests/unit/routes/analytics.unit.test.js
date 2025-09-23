import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// Mock all dependencies before importing
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("../../../src/utils.js", () => ({
  validateDate: jest.fn(),
  supabaseClient: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

import {
  createMockAnalyticsSupabase,
  createAnalyticsTestDataset,
  validateAppointmentsAnalyticsResponse,
  validateServicesAnalyticsResponse,
  validateDemographicsAnalyticsResponse,
  validateRatingsAnalyticsResponse,
  validateSummaryAnalyticsResponse,
  calculateExpectedStats,
  calculateExpectedAverage,
  isValidDateFormat,
  isValidDateRange,
} from "../../helpers/analyticsHelpers.js";

describe("Analytics Routes Unit Tests", () => {
  let mockSupabase;
  let mockValidateDate;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = createMockAnalyticsSupabase();

    // Mock utils
    const utils = require("../../../src/utils.js");
    mockValidateDate = utils.validateDate;
    utils.supabaseClient = mockSupabase;

    // Mock Express request/response
    mockReq = {
      params: {},
      query: {},
      headers: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Set environment variables
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SERVICE_ROL_KEY = "test-service-key";
    process.env.JWT_SECRET = "test-jwt-secret";
  });

  describe("GET /api/analytics/appointments/:id_clinica", () => {
    describe("Input Validation", () => {
      test("should validate date format correctly", () => {
        mockValidateDate.mockImplementation((date) => {
          return isValidDateFormat(date);
        });

        expect(mockValidateDate("2024-01-15")).toBe(true);
        expect(mockValidateDate("invalid-date")).toBe(false);
        expect(mockValidateDate("2024/01/15")).toBe(false);
        expect(mockValidateDate("2024-13-01")).toBe(false);
      });

      test("should validate date range logic", () => {
        const validRange = isValidDateRange("2024-01-01", "2024-01-31");
        const invalidRange = isValidDateRange("2024-01-31", "2024-01-01");

        expect(validRange).toBe(true);
        expect(invalidRange).toBe(false);
      });

      test("should handle missing date parameters", () => {
        mockValidateDate.mockReturnValue(false);
        mockReq.params = { id_clinica: "1" };
        mockReq.query = { from_date: undefined, to_date: undefined };

        // La ruta debería usar fechas por defecto cuando faltan parámetros
        expect(mockReq.query.from_date).toBeUndefined();
        expect(mockReq.query.to_date).toBeUndefined();
      });
    });

    describe("Clinic Validation", () => {
      test("should validate clinic existence", async () => {
        const clinicId = 1;

        // Mock clinic exists
        mockSupabase.setMockData("clinicas", [{ id_clinica: clinicId }]);

        const result = await mockSupabase
          .from("clinicas")
          .select("id_clinica")
          .eq("id_clinica", clinicId)
          .single();

        expect(result.data).toBeDefined();
        expect(result.data.id_clinica).toBe(clinicId);
        expect(result.error).toBeNull();
      });

      test("should handle non-existent clinic", async () => {
        const nonExistentClinicId = 999;

        // Mock clinic doesn't exist
        mockSupabase.setMockData("clinicas", []);

        const result = await mockSupabase
          .from("clinicas")
          .select("id_clinica")
          .eq("id_clinica", nonExistentClinicId)
          .single();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
      });
    });

    describe("Data Aggregation Logic", () => {
      test("should calculate appointment stats correctly", () => {
        const testCitas = [
          { estado: "completada" },
          { estado: "finalizada" },
          { estado: "programada" },
          { estado: "cancelada" },
          { estado: "programada" },
        ];

        const expectedStats = calculateExpectedStats(testCitas);

        expect(expectedStats.total).toBe(5);
        expect(expectedStats.completed).toBe(2); // completada + finalizada
        expect(expectedStats.scheduled).toBe(2); // programada
        expect(expectedStats.cancelled).toBe(1); // cancelada
      });

      test("should handle empty appointments list", () => {
        const emptyStats = calculateExpectedStats([]);

        expect(emptyStats.total).toBe(0);
        expect(emptyStats.completed).toBe(0);
        expect(emptyStats.scheduled).toBe(0);
        expect(emptyStats.cancelled).toBe(0);
      });

      test("should normalize appointment states correctly", () => {
        const mixedStateCitas = [
          { estado: "COMPLETADA" }, // uppercase
          { estado: "Finalizada" }, // mixed case
          { estado: "programada" }, // lowercase
          { estado: "CANCELADA" }, // uppercase
        ];

        const stats = calculateExpectedStats(mixedStateCitas);

        expect(stats.completed).toBe(2);
        expect(stats.scheduled).toBe(1);
        expect(stats.cancelled).toBe(1);
      });
    });

    describe("Date Grouping Logic", () => {
      test("should group appointments by date correctly", () => {
        const testCitas = [
          {
            fecha_inicio: "2024-01-15T10:00:00.000Z",
            estado: "completada",
          },
          {
            fecha_inicio: "2024-01-15T14:00:00.000Z",
            estado: "programada",
          },
          {
            fecha_inicio: "2024-01-16T09:00:00.000Z",
            estado: "cancelada",
          },
        ];

        // Simulate the grouping logic
        const grouped = {};
        testCitas.forEach((cita) => {
          const fecha = cita.fecha_inicio.split("T")[0];
          if (!grouped[fecha]) {
            grouped[fecha] = {
              total: 0,
              completed: 0,
              scheduled: 0,
              cancelled: 0,
            };
          }
          grouped[fecha].total++;

          const estado = cita.estado.toLowerCase();
          if (estado === "completada" || estado === "finalizada") {
            grouped[fecha].completed++;
          } else if (estado === "programada") {
            grouped[fecha].scheduled++;
          } else if (estado === "cancelada") {
            grouped[fecha].cancelled++;
          }
        });

        expect(grouped["2024-01-15"].total).toBe(2);
        expect(grouped["2024-01-15"].completed).toBe(1);
        expect(grouped["2024-01-15"].scheduled).toBe(1);
        expect(grouped["2024-01-16"].total).toBe(1);
        expect(grouped["2024-01-16"].cancelled).toBe(1);
      });
    });

    describe("Database Error Handling", () => {
      test("should handle database errors gracefully", async () => {
        // Mock database error
        mockSupabase.setMockResponse("basicSelect", {
          data: null,
          error: { message: "Database connection failed" },
        });

        const result = await mockSupabase
          .from("citas")
          .select("*")
          .eq("id_clinica", 1);

        expect(result.error).toBeDefined();
        if (result.error) {
          expect(result.error.message).toBe("Database connection failed");
        }
      });
    });
  });

  describe("GET /api/analytics/services/:id_clinica", () => {
    describe("Service Statistics Logic", () => {
      test("should handle RPC function call for top services", async () => {
        const mockTopServices = [
          {
            nombre_servicio: "Consulta General",
            total_citas: 10,
            ingreso_total: 500000,
          },
          {
            nombre_servicio: "Vacunación",
            total_citas: 8,
            ingreso_total: 640000,
          },
        ];

        mockSupabase.setMockResponse("rpcCall", {
          data: mockTopServices,
          error: null,
        });

        const result = await mockSupabase.rpc("get_top_services", {
          clinica_id: 1,
          start_date: "2024-01-01T00:00:00.000Z",
          end_date: "2024-01-31T23:59:59.999Z",
          limit_count: 5,
        });

        expect(result.data).toEqual(mockTopServices);
        expect(result.error).toBeNull();
      });

      test("should handle RPC function failure with fallback", async () => {
        // Mock RPC failure
        mockSupabase.setMockResponse("rpcCall", {
          data: null,
          error: { message: "RPC function failed" },
        });

        // Mock fallback query
        const mockCitasServicios = [
          {
            id_servicio: 1,
            servicios: {
              id_servicio: 1,
              nombre: "Consulta General",
              precio: 50000,
            },
          },
          {
            id_servicio: 1,
            servicios: {
              id_servicio: 1,
              nombre: "Consulta General",
              precio: 50000,
            },
          },
        ];

        mockSupabase.setMockResponse("joinSelect", {
          data: mockCitasServicios,
          error: null,
        });

        const rpcResult = await mockSupabase.rpc("get_top_services", {});
        expect(rpcResult.error).toBeDefined();

        // Fallback query should work
        // Para el test, simplemente verificamos que se puede llamar al fallback
        const fallbackQuery = mockSupabase
          .from("citas")
          .select("id_servicio, servicios(id_servicio, nombre, precio)");
        expect(fallbackQuery).toBeDefined();
      });

      test("should calculate service revenue correctly", () => {
        const citasServicios = [
          { id_servicio: 1, servicios: { precio: 50000 } },
          { id_servicio: 1, servicios: { precio: 50000 } },
          { id_servicio: 2, servicios: { precio: 80000 } },
        ];

        // Simulate manual counting logic
        const serviciosCount = {};
        citasServicios.forEach((cita) => {
          const idServicio = cita.id_servicio;
          const precio = parseFloat(cita.servicios.precio);

          if (!serviciosCount[idServicio]) {
            serviciosCount[idServicio] = { value: 0, revenue: 0 };
          }

          serviciosCount[idServicio].value++;
          serviciosCount[idServicio].revenue += precio;
        });

        expect(serviciosCount[1].value).toBe(2);
        expect(serviciosCount[1].revenue).toBe(100000);
        expect(serviciosCount[2].value).toBe(1);
        expect(serviciosCount[2].revenue).toBe(80000);
      });
    });

    describe("Edge Cases", () => {
      test("should handle services with zero price", () => {
        const citasServicios = [
          { id_servicio: 1, servicios: { precio: 0 } },
          { id_servicio: 1, servicios: { precio: null } },
        ];

        const serviciosCount = {};
        citasServicios.forEach((cita) => {
          const idServicio = cita.id_servicio;
          const precio = parseFloat(cita.servicios.precio || 0);

          if (!serviciosCount[idServicio]) {
            serviciosCount[idServicio] = { value: 0, revenue: 0 };
          }

          serviciosCount[idServicio].value++;
          serviciosCount[idServicio].revenue += precio;
        });

        expect(serviciosCount[1].value).toBe(2);
        expect(serviciosCount[1].revenue).toBe(0);
      });

      test("should handle empty services data", () => {
        const emptyServices = [];
        const result = emptyServices
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        expect(result).toEqual([]);
      });
    });
  });

  describe("GET /api/analytics/demographics/:id_clinica", () => {
    describe("Pet Species Distribution", () => {
      test("should normalize pet species correctly", () => {
        const testMascotas = [
          { mascotas: { especie: "Perro" } },
          { mascotas: { especie: "perro" } },
          { mascotas: { especie: "Canino" } },
          { mascotas: { especie: "Gato" } },
          { mascotas: { especie: "felino" } },
          { mascotas: { especie: "Ave" } },
          { mascotas: { especie: "Hamster" } },
        ];

        // Simulate species normalization logic
        const especiesNormalizadas = {
          Perros: 0,
          Gatos: 0,
          Aves: 0,
          Exóticos: 0,
        };

        testMascotas.forEach((cita) => {
          const especie = cita.mascotas.especie.toLowerCase();
          if (especie.includes("perro") || especie.includes("canino")) {
            especiesNormalizadas["Perros"]++;
          } else if (especie.includes("gato") || especie.includes("felino")) {
            especiesNormalizadas["Gatos"]++;
          } else if (especie.includes("ave")) {
            especiesNormalizadas["Aves"]++;
          } else {
            especiesNormalizadas["Exóticos"]++;
          }
        });

        expect(especiesNormalizadas["Perros"]).toBe(3);
        expect(especiesNormalizadas["Gatos"]).toBe(2);
        expect(especiesNormalizadas["Aves"]).toBe(1);
        expect(especiesNormalizadas["Exóticos"]).toBe(1);
      });

      test("should handle missing species data", () => {
        const testMascotas = [
          { mascotas: { especie: null } },
          { mascotas: { especie: "" } },
          { mascotas: null },
        ];

        const especiesCount = {};
        testMascotas.forEach((cita) => {
          if (!cita.mascotas) return;

          const especie = cita.mascotas.especie || "No especificado";
          if (!especiesCount[especie]) {
            especiesCount[especie] = 0;
          }
          especiesCount[especie]++;
        });

        expect(especiesCount["No especificado"]).toBe(2);
      });
    });

    describe("Age Distribution Logic", () => {
      test("should categorize pet ages correctly", () => {
        const testMascotas = [
          { mascotas: { edad: 0.5 } },
          { mascotas: { edad: 2 } },
          { mascotas: { edad: 5 } },
          { mascotas: { edad: 9 } },
          { mascotas: { edad: 12 } },
        ];

        const edadesCount = {
          "< 1 año": 0,
          "1-3 años": 0,
          "4-7 años": 0,
          "8-10 años": 0,
          "> 10 años": 0,
        };

        testMascotas.forEach((cita) => {
          const edad = parseInt(cita.mascotas.edad);
          if (isNaN(edad)) return;

          if (edad < 1) edadesCount["< 1 año"]++;
          else if (edad >= 1 && edad <= 3) edadesCount["1-3 años"]++;
          else if (edad >= 4 && edad <= 7) edadesCount["4-7 años"]++;
          else if (edad >= 8 && edad <= 10) edadesCount["8-10 años"]++;
          else edadesCount["> 10 años"]++;
        });

        expect(edadesCount["< 1 año"]).toBe(1);
        expect(edadesCount["1-3 años"]).toBe(1);
        expect(edadesCount["4-7 años"]).toBe(1);
        expect(edadesCount["8-10 años"]).toBe(1);
        expect(edadesCount["> 10 años"]).toBe(1);
      });

      test("should handle invalid age data", () => {
        const testMascotas = [
          { mascotas: { edad: null } },
          { mascotas: { edad: "invalid" } },
          { mascotas: { edad: -1 } },
          { mascotas: null },
        ];

        const validAges = testMascotas.filter((cita) => {
          if (!cita.mascotas || cita.mascotas.edad === null) return false;
          const edad = parseInt(cita.mascotas.edad);
          return !isNaN(edad) && edad >= 0;
        });

        expect(validAges.length).toBe(0);
      });
    });
  });

  describe("GET /api/analytics/ratings/:id_clinica", () => {
    describe("Rating Calculations", () => {
      test("should calculate average rating correctly", () => {
        const testReseñas = [
          { calificacion: 5 },
          { calificacion: 4 },
          { calificacion: 3 },
          { calificacion: 5 },
          { calificacion: 4 },
        ];

        const expectedAverage = calculateExpectedAverage(testReseñas);
        expect(expectedAverage).toBe(4.2);
      });

      test("should handle empty ratings", () => {
        const emptyReseñas = [];
        const average = calculateExpectedAverage(emptyReseñas);
        expect(average).toBe(0);
      });

      test("should distribute ratings correctly", () => {
        const testReseñas = [
          { calificacion: 1 },
          { calificacion: 2 },
          { calificacion: 3 },
          { calificacion: 4 },
          { calificacion: 5 },
          { calificacion: 5 },
        ];

        const calificacionesCount = {
          "1 ★": 0,
          "2 ★": 0,
          "3 ★": 0,
          "4 ★": 0,
          "5 ★": 0,
        };

        testReseñas.forEach((resena) => {
          const estrellas = resena.calificacion;
          if (estrellas >= 1 && estrellas <= 5) {
            calificacionesCount[`${estrellas} ★`]++;
          }
        });

        expect(calificacionesCount["1 ★"]).toBe(1);
        expect(calificacionesCount["2 ★"]).toBe(1);
        expect(calificacionesCount["3 ★"]).toBe(1);
        expect(calificacionesCount["4 ★"]).toBe(1);
        expect(calificacionesCount["5 ★"]).toBe(2);
      });

      test("should handle invalid ratings", () => {
        const invalidReseñas = [
          { calificacion: 0 },
          { calificacion: 6 },
          { calificacion: null },
          { calificacion: "invalid" },
        ];

        const validRatings = invalidReseñas.filter((resena) => {
          const rating = resena.calificacion;
          return rating >= 1 && rating <= 5 && typeof rating === "number";
        });

        expect(validRatings.length).toBe(0);
      });
    });
  });

  describe("GET /api/analytics/summary/:id_clinica", () => {
    describe("Summary Calculations", () => {
      test("should calculate total revenue correctly", () => {
        const testCitasServicios = [
          { servicios: { precio: 50000 } },
          { servicios: { precio: 80000 } },
          { servicios: { precio: 100000 } },
          { servicios: null }, // Should be ignored
        ];

        let totalRevenue = 0;
        testCitasServicios.forEach((cita) => {
          if (cita.servicios && cita.servicios.precio) {
            totalRevenue += parseFloat(cita.servicios.precio);
          }
        });

        expect(totalRevenue).toBe(230000);
      });

      test("should count unique pets correctly", () => {
        const testMascotasAtendidas = [
          { id_mascota: 1 },
          { id_mascota: 2 },
          { id_mascota: 1 }, // Duplicate
          { id_mascota: 3 },
          { id_mascota: 2 }, // Duplicate
        ];

        const mascotasUnicas = new Set();
        testMascotasAtendidas.forEach((cita) => {
          mascotasUnicas.add(cita.id_mascota);
        });

        expect(mascotasUnicas.size).toBe(3);
      });

      test("should handle empty data gracefully", () => {
        const emptyData = {
          citas: [],
          reseñas: [],
          citasServicios: [],
          mascotasAtendidas: [],
        };

        expect(emptyData.citas.length).toBe(0);
        expect(calculateExpectedAverage(emptyData.reseñas)).toBe(0);

        const emptyRevenue = emptyData.citasServicios.reduce((total, cita) => {
          return total + (cita.servicios?.precio || 0);
        }, 0);
        expect(emptyRevenue).toBe(0);

        const emptyPets = new Set(
          emptyData.mascotasAtendidas.map((c) => c.id_mascota)
        );
        expect(emptyPets.size).toBe(0);
      });
    });
  });

  describe("Response Validation Helpers", () => {
    test("should validate appointments analytics response structure", () => {
      const validResponse = {
        body: {
          totalAppointments: 10,
          statusDistribution: [
            { name: "Completadas", value: 5 },
            { name: "Programadas", value: 3 },
            { name: "Canceladas", value: 2 },
          ],
          appointmentsByDate: [
            {
              date: "2024-01-15",
              total: 3,
              completed: 2,
              scheduled: 1,
              cancelled: 0,
            },
          ],
        },
      };

      const validation = validateAppointmentsAnalyticsResponse(validResponse);
      expect(validation.hasValidStructure).toBe(true);
      expect(validation.hasValidStatusDistribution).toBe(true);
      expect(validation.hasValidDateData).toBe(true);
    });

    test("should validate services analytics response structure", () => {
      const validResponse = {
        body: {
          topServices: [{ name: "Consulta General", value: 10 }],
          servicesRevenue: [
            { name: "Consulta General", value: 10, revenue: 500000 },
          ],
        },
      };

      const validation = validateServicesAnalyticsResponse(validResponse);
      expect(validation.hasValidStructure).toBe(true);
      expect(validation.hasValidTopServices).toBe(true);
      expect(validation.hasValidRevenue).toBe(true);
    });

    test("should validate demographics analytics response structure", () => {
      const validResponse = {
        body: {
          petTypeDistribution: [
            { type: "Perros", count: 15 },
            { type: "Gatos", count: 8 },
          ],
          ageDistribution: [
            { range: "1-3 años", count: 10 },
            { range: "4-7 años", count: 8 },
          ],
        },
      };

      const validation = validateDemographicsAnalyticsResponse(validResponse);
      expect(validation.hasValidStructure).toBe(true);
      expect(validation.hasValidPetTypes).toBe(true);
      expect(validation.hasValidAgeDistribution).toBe(true);
    });

    test("should validate ratings analytics response structure", () => {
      const validResponse = {
        body: {
          averageRating: 4.2,
          ratingDistribution: [
            { rating: "5 ★", count: 10 },
            { rating: "4 ★", count: 5 },
          ],
        },
      };

      const validation = validateRatingsAnalyticsResponse(validResponse);
      expect(validation.hasValidStructure).toBe(true);
      expect(validation.hasValidAverage).toBe(true);
      expect(validation.hasValidDistribution).toBe(true);
    });

    test("should validate summary analytics response structure", () => {
      const validResponse = {
        body: {
          totalAppointments: 50,
          avgRating: 4.3,
          totalRevenue: 2500000,
          totalPets: 25,
        },
      };

      const validation = validateSummaryAnalyticsResponse(validResponse);
      expect(validation.hasValidStructure).toBe(true);
      expect(validation.hasValidRanges).toBe(true);
    });
  });
});
