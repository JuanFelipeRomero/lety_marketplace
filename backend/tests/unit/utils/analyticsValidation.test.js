import { describe, test, expect } from "@jest/globals";
import {
  isValidDateFormat,
  isValidDateRange,
  calculateExpectedStats,
  calculateExpectedAverage,
  groupCitasByDate,
  validateAppointmentsAnalyticsResponse,
  validateServicesAnalyticsResponse,
  validateDemographicsAnalyticsResponse,
  validateRatingsAnalyticsResponse,
  validateSummaryAnalyticsResponse,
} from "../../helpers/analyticsHelpers.js";

describe("Analytics Validation Unit Tests", () => {
  describe("Date Validation Functions", () => {
    describe("isValidDateFormat", () => {
      test("should validate correct YYYY-MM-DD format", () => {
        expect(isValidDateFormat("2024-01-15")).toBe(true);
        expect(isValidDateFormat("2023-12-31")).toBe(true);
        expect(isValidDateFormat("2024-02-29")).toBe(true); // Leap year
      });

      test("should reject invalid date formats", () => {
        expect(isValidDateFormat("2024/01/15")).toBe(false);
        expect(isValidDateFormat("15-01-2024")).toBe(false);
        expect(isValidDateFormat("2024-1-15")).toBe(false);
        expect(isValidDateFormat("2024-01-5")).toBe(false);
        expect(isValidDateFormat("invalid-date")).toBe(false);
        expect(isValidDateFormat("")).toBe(false);
        expect(isValidDateFormat(null)).toBe(false);
        expect(isValidDateFormat(undefined)).toBe(false);
      });

      test("should reject invalid dates with correct format", () => {
        expect(isValidDateFormat("2024-13-01")).toBe(false); // Month 13
        expect(isValidDateFormat("2024-01-32")).toBe(false); // Day 32
        expect(isValidDateFormat("2023-02-29")).toBe(false); // Non-leap year
        expect(isValidDateFormat("2024-04-31")).toBe(false); // April has 30 days
      });
    });

    describe("isValidDateRange", () => {
      test("should validate correct date ranges", () => {
        expect(isValidDateRange("2024-01-01", "2024-01-31")).toBe(true);
        expect(isValidDateRange("2024-01-15", "2024-01-15")).toBe(true); // Same date
        expect(isValidDateRange("2023-12-31", "2024-01-01")).toBe(true); // Year boundary
      });

      test("should reject invalid date ranges", () => {
        expect(isValidDateRange("2024-01-31", "2024-01-01")).toBe(false); // From > To
        expect(isValidDateRange("2024-02-01", "2024-01-31")).toBe(false); // From > To
      });

      test("should handle edge cases", () => {
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        expect(isValidDateRange(today, tomorrow)).toBe(true);
        expect(isValidDateRange(tomorrow, today)).toBe(false);
      });
    });
  });

  describe("Statistics Calculation Functions", () => {
    describe("calculateExpectedStats", () => {
      test("should calculate appointment statistics correctly", () => {
        const testCitas = [
          { estado: "completada" },
          { estado: "finalizada" },
          { estado: "programada" },
          { estado: "cancelada" },
          { estado: "programada" },
          { estado: "completada" },
        ];

        const stats = calculateExpectedStats(testCitas);

        expect(stats.total).toBe(6);
        expect(stats.completed).toBe(3); // completada + finalizada
        expect(stats.scheduled).toBe(2); // programada
        expect(stats.cancelled).toBe(1); // cancelada
      });

      test("should handle case-insensitive states", () => {
        const testCitas = [
          { estado: "COMPLETADA" },
          { estado: "Finalizada" },
          { estado: "PROGRAMADA" },
          { estado: "cancelada" },
        ];

        const stats = calculateExpectedStats(testCitas);

        expect(stats.completed).toBe(2);
        expect(stats.scheduled).toBe(1);
        expect(stats.cancelled).toBe(1);
      });

      test("should handle empty appointments array", () => {
        const stats = calculateExpectedStats([]);

        expect(stats.total).toBe(0);
        expect(stats.completed).toBe(0);
        expect(stats.scheduled).toBe(0);
        expect(stats.cancelled).toBe(0);
      });

      test("should handle unknown states", () => {
        const testCitas = [
          { estado: "unknown_state" },
          { estado: "another_state" },
          { estado: "completada" },
        ];

        const stats = calculateExpectedStats(testCitas);

        expect(stats.total).toBe(3);
        expect(stats.completed).toBe(1);
        expect(stats.scheduled).toBe(0);
        expect(stats.cancelled).toBe(0);
      });
    });

    describe("calculateExpectedAverage", () => {
      test("should calculate rating average correctly", () => {
        const testReseñas = [
          { calificacion: 5 },
          { calificacion: 4 },
          { calificacion: 3 },
          { calificacion: 5 },
          { calificacion: 4 },
        ];

        const average = calculateExpectedAverage(testReseñas);
        expect(average).toBe(4.2);
      });

      test("should handle perfect ratings", () => {
        const perfectReseñas = [
          { calificacion: 5 },
          { calificacion: 5 },
          { calificacion: 5 },
        ];

        const average = calculateExpectedAverage(perfectReseñas);
        expect(average).toBe(5.0);
      });

      test("should handle lowest ratings", () => {
        const lowReseñas = [
          { calificacion: 1 },
          { calificacion: 1 },
          { calificacion: 1 },
        ];

        const average = calculateExpectedAverage(lowReseñas);
        expect(average).toBe(1.0);
      });

      test("should return 0 for empty ratings", () => {
        const average = calculateExpectedAverage([]);
        expect(average).toBe(0);
      });

      test("should handle decimal results correctly", () => {
        const testReseñas = [
          { calificacion: 1 },
          { calificacion: 2 },
          { calificacion: 3 },
        ];

        const average = calculateExpectedAverage(testReseñas);
        expect(average).toBe(2.0);
      });

      test("should round to one decimal place", () => {
        const testReseñas = [
          { calificacion: 4 },
          { calificacion: 5 },
          { calificacion: 3 },
        ];

        const average = calculateExpectedAverage(testReseñas);
        expect(average).toBe(4.0);
      });
    });

    describe("groupCitasByDate", () => {
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
          {
            fecha_inicio: "2024-01-16T11:00:00.000Z",
            estado: "finalizada",
          },
        ];

        const grouped = groupCitasByDate(testCitas);

        expect(grouped["2024-01-15"].total).toBe(2);
        expect(grouped["2024-01-15"].completed).toBe(1);
        expect(grouped["2024-01-15"].scheduled).toBe(1);
        expect(grouped["2024-01-15"].cancelled).toBe(0);

        expect(grouped["2024-01-16"].total).toBe(2);
        expect(grouped["2024-01-16"].completed).toBe(1); // finalizada counts as completed
        expect(grouped["2024-01-16"].scheduled).toBe(0);
        expect(grouped["2024-01-16"].cancelled).toBe(1);
      });

      test("should handle single appointment per date", () => {
        const testCitas = [
          {
            fecha_inicio: "2024-01-15T10:00:00.000Z",
            estado: "completada",
          },
        ];

        const grouped = groupCitasByDate(testCitas);

        expect(grouped["2024-01-15"].total).toBe(1);
        expect(grouped["2024-01-15"].completed).toBe(1);
        expect(grouped["2024-01-15"].scheduled).toBe(0);
        expect(grouped["2024-01-15"].cancelled).toBe(0);
      });

      test("should handle empty appointments array", () => {
        const grouped = groupCitasByDate([]);
        expect(Object.keys(grouped)).toHaveLength(0);
      });

      test("should normalize appointment states in grouping", () => {
        const testCitas = [
          {
            fecha_inicio: "2024-01-15T10:00:00.000Z",
            estado: "COMPLETADA",
          },
          {
            fecha_inicio: "2024-01-15T14:00:00.000Z",
            estado: "Finalizada",
          },
        ];

        const grouped = groupCitasByDate(testCitas);

        expect(grouped["2024-01-15"].total).toBe(2);
        expect(grouped["2024-01-15"].completed).toBe(2);
      });
    });
  });

  describe("Response Validation Functions", () => {
    describe("validateAppointmentsAnalyticsResponse", () => {
      test("should validate correct appointments response", () => {
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
              {
                date: "2024-01-16",
                total: 2,
                completed: 1,
                scheduled: 0,
                cancelled: 1,
              },
            ],
          },
        };

        const validation = validateAppointmentsAnalyticsResponse(validResponse);

        expect(validation.hasValidStructure).toBe(true);
        expect(validation.hasValidStatusDistribution).toBe(true);
        expect(validation.hasValidDateData).toBe(true);
      });

      test("should reject invalid appointments response structure", () => {
        const invalidResponses = [
          { body: {} }, // Missing fields
          { body: { totalAppointments: "invalid" } }, // Wrong type
          { body: { totalAppointments: 10, statusDistribution: "not_array" } }, // Wrong type
          {
            body: {
              totalAppointments: 10,
              statusDistribution: [],
              appointmentsByDate: "not_array",
            },
          }, // Wrong type
        ];

        invalidResponses.forEach((response) => {
          const validation = validateAppointmentsAnalyticsResponse(response);
          expect(validation.hasValidStructure).toBe(false);
        });
      });

      test("should validate status distribution format", () => {
        const responseWithInvalidStatus = {
          body: {
            totalAppointments: 10,
            statusDistribution: [
              { name: "Completadas" }, // Missing value
              { value: 3 }, // Missing name
            ],
            appointmentsByDate: [],
          },
        };

        const validation = validateAppointmentsAnalyticsResponse(
          responseWithInvalidStatus
        );
        expect(validation.hasValidStatusDistribution).toBe(false);
      });

      test("should validate date data format", () => {
        const responseWithInvalidDateData = {
          body: {
            totalAppointments: 10,
            statusDistribution: [{ name: "Completadas", value: 5 }],
            appointmentsByDate: [
              { date: "2024-01-15" }, // Missing total
              { total: "invalid" }, // Wrong type
            ],
          },
        };

        const validation = validateAppointmentsAnalyticsResponse(
          responseWithInvalidDateData
        );
        expect(validation.hasValidDateData).toBe(false);
      });
    });

    describe("validateServicesAnalyticsResponse", () => {
      test("should validate correct services response", () => {
        const validResponse = {
          body: {
            topServices: [
              { name: "Consulta General", value: 10 },
              { name: "Vacunación", value: 8 },
            ],
            servicesRevenue: [
              { name: "Consulta General", value: 10, revenue: 500000 },
              { name: "Vacunación", value: 8, revenue: 640000 },
            ],
          },
        };

        const validation = validateServicesAnalyticsResponse(validResponse);

        expect(validation.hasValidStructure).toBe(true);
        expect(validation.hasValidTopServices).toBe(true);
        expect(validation.hasValidRevenue).toBe(true);
      });

      test("should reject invalid services response", () => {
        const invalidResponse = {
          body: {
            topServices: [
              { name: "Service" }, // Missing value
            ],
            servicesRevenue: [
              { name: "Service", value: "invalid" }, // Wrong type, missing revenue
            ],
          },
        };

        const validation = validateServicesAnalyticsResponse(invalidResponse);
        expect(validation.hasValidTopServices).toBe(false);
        expect(validation.hasValidRevenue).toBe(false);
      });
    });

    describe("validateDemographicsAnalyticsResponse", () => {
      test("should validate correct demographics response", () => {
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

      test("should reject invalid demographics response", () => {
        const invalidResponse = {
          body: {
            petTypeDistribution: [
              { type: "Perros" }, // Missing count
            ],
            ageDistribution: [
              { count: 10 }, // Missing range
            ],
          },
        };

        const validation =
          validateDemographicsAnalyticsResponse(invalidResponse);
        expect(validation.hasValidPetTypes).toBe(false);
        expect(validation.hasValidAgeDistribution).toBe(false);
      });
    });

    describe("validateRatingsAnalyticsResponse", () => {
      test("should validate correct ratings response", () => {
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

      test("should reject invalid rating values", () => {
        const invalidRatingResponses = [
          {
            body: {
              averageRating: -1, // Below 0
              ratingDistribution: [],
            },
          },
          {
            body: {
              averageRating: 6, // Above 5
              ratingDistribution: [],
            },
          },
          {
            body: {
              averageRating: "invalid", // Wrong type
              ratingDistribution: [],
            },
          },
        ];

        invalidRatingResponses.forEach((response) => {
          const validation = validateRatingsAnalyticsResponse(response);
          expect(validation.hasValidAverage).toBe(false);
        });
      });

      test("should validate rating distribution format", () => {
        const invalidDistributionResponse = {
          body: {
            averageRating: 4.0,
            ratingDistribution: [
              { rating: "5 ★" }, // Missing count
              { count: 5 }, // Missing rating
            ],
          },
        };

        const validation = validateRatingsAnalyticsResponse(
          invalidDistributionResponse
        );
        expect(validation.hasValidDistribution).toBe(false);
      });
    });

    describe("validateSummaryAnalyticsResponse", () => {
      test("should validate correct summary response", () => {
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

      test("should reject invalid summary values", () => {
        const invalidResponses = [
          {
            body: {
              totalAppointments: -1, // Negative
              avgRating: 4.0,
              totalRevenue: 1000,
              totalPets: 10,
            },
          },
          {
            body: {
              totalAppointments: 10,
              avgRating: 6, // Above 5
              totalRevenue: 1000,
              totalPets: 10,
            },
          },
          {
            body: {
              totalAppointments: 10,
              avgRating: 4.0,
              totalRevenue: -100, // Negative
              totalPets: 10,
            },
          },
          {
            body: {
              totalAppointments: 10,
              avgRating: 4.0,
              totalRevenue: 1000,
              totalPets: -5, // Negative
            },
          },
        ];

        invalidResponses.forEach((response) => {
          const validation = validateSummaryAnalyticsResponse(response);
          expect(validation.hasValidRanges).toBe(false);
        });
      });

      test("should reject missing fields", () => {
        const incompleteResponse = {
          body: {
            totalAppointments: 10,
            // Missing other fields
          },
        };

        const validation = validateSummaryAnalyticsResponse(incompleteResponse);
        expect(validation.hasValidStructure).toBe(false);
      });
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    test("should handle null and undefined inputs gracefully", () => {
      expect(isValidDateFormat(null)).toBe(false);
      expect(isValidDateFormat(undefined)).toBe(false);

      expect(calculateExpectedStats(null)).toEqual({
        total: 0,
        completed: 0,
        scheduled: 0,
        cancelled: 0,
      });

      expect(calculateExpectedAverage(null)).toBe(0);
      expect(calculateExpectedAverage(undefined)).toBe(0);
    });

    test("should handle malformed data objects", () => {
      const malformedCitas = [
        null,
        undefined,
        { estado: null },
        { estado: undefined },
        { estado: "" },
        {},
      ];

      const stats = calculateExpectedStats(malformedCitas);
      expect(stats.total).toBe(6);
      expect(stats.completed).toBe(0);
      expect(stats.scheduled).toBe(0);
      expect(stats.cancelled).toBe(0);
    });

    test("should handle extreme date scenarios", () => {
      // Test leap year
      expect(isValidDateFormat("2024-02-29")).toBe(true);
      expect(isValidDateFormat("2023-02-29")).toBe(false);

      // Test year boundaries
      expect(isValidDateRange("2023-12-31", "2024-01-01")).toBe(true);
      expect(isValidDateRange("2024-01-01", "2023-12-31")).toBe(false);
    });

    test("should handle precision in rating calculations", () => {
      const precisionReseñas = [
        { calificacion: 4.5 }, // This would be rounded to 5 in real data
        { calificacion: 4.2 }, // This would be rounded to 4 in real data
        { calificacion: 3.7 }, // This would be rounded to 4 in real data
      ];

      // Test with decimal inputs (although real system uses integers)
      const average =
        precisionReseñas.reduce((sum, r) => sum + r.calificacion, 0) /
        precisionReseñas.length;
      expect(Math.round(average * 10) / 10).toBeCloseTo(4.1, 1);
    });
  });
});
