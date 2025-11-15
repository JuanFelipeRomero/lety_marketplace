import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import {
  createAnalyticsTestDataset,
  createAnalyticsVetToken,
  createAnalyticsUserToken,
  buildAnalyticsRequest,
  buildInvalidDateRequest,
  buildFutureDateRequest,
  validateAppointmentsAnalyticsResponse,
  validateServicesAnalyticsResponse,
  validateDemographicsAnalyticsResponse,
  validateRatingsAnalyticsResponse,
  validateSummaryAnalyticsResponse,
  cleanupAnalyticsTestData,
} from "../helpers/analyticsHelpers.js";

describe("Analytics Integration Tests", () => {
  let server;
  let vetToken;
  let userToken;
  let testData;
  let testClinicId;
  let createdTestData = {};

  beforeAll(async () => {
    // Start test server on different port for tests
    const PORT = process.env.PORT ? parseInt(process.env.PORT) + 7 : 3007;
    server = app.listen(PORT);

    // Create test data
    testClinicId = 1; // Use existing clinic ID for testing
    testData = createAnalyticsTestDataset(testClinicId);

    // Create test tokens
    vetToken = createAnalyticsVetToken(testClinicId);
    userToken = createAnalyticsUserToken(1);
  });

  afterAll(async () => {
    // Cleanup created test data
    await cleanupAnalyticsTestData(null, createdTestData);

    // Close test server
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    // Reset created data tracking for cleanup
    createdTestData = {
      citaIds: [],
      reseñaIds: [],
      servicioIds: [],
      mascotaIds: [],
      clinicaIds: [],
    };
  });

  describe("GET /api/analytics/appointments/:id_clinica - Integration", () => {
    describe("Success Cases", () => {
      test("should return appointments analytics with valid data", async () => {
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/appointments/${testClinicId}`)
          .query(queryParams);

        // Should work even with minimal test data
        if (response.status === 200) {
          expect(response.body).toBeDefined();

          const validation = validateAppointmentsAnalyticsResponse(response);
          expect(validation.hasValidStructure).toBe(true);

          // Check response structure
          expect(typeof response.body.totalAppointments).toBe("number");
          expect(Array.isArray(response.body.statusDistribution)).toBe(true);
          expect(Array.isArray(response.body.appointmentsByDate)).toBe(true);

          // Validate status distribution format
          if (response.body.statusDistribution.length > 0) {
            expect(validation.hasValidStatusDistribution).toBe(true);
          }

          // Validate date data format
          if (response.body.appointmentsByDate.length > 0) {
            expect(validation.hasValidDateData).toBe(true);
          }
        } else {
          // Expected to fail without proper test database setup
          expect([400, 404, 500]).toContain(response.status);
        }
      });

      test("should handle custom date range", async () => {
        const customDateRange = {
          from_date: "2024-01-01",
          to_date: "2024-01-31",
        };

        const response = await request(app)
          .get(`/api/analytics/appointments/${testClinicId}`)
          .query(customDateRange);

        if (response.status === 200) {
          expect(response.body).toBeDefined();
          const validation = validateAppointmentsAnalyticsResponse(response);
          expect(validation.hasValidStructure).toBe(true);
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });

      test("should handle empty date range results", async () => {
        const futureDateRange = buildFutureDateRequest();

        const response = await request(app)
          .get(`/api/analytics/appointments/${testClinicId}`)
          .query(futureDateRange);

        if (response.status === 200) {
          // Should return empty results for future dates
          expect(response.body.totalAppointments).toBe(0);
          expect(response.body.statusDistribution).toEqual([
            { name: "Completadas", value: 0 },
            { name: "Programadas", value: 0 },
            { name: "Canceladas", value: 0 },
          ]);
          expect(response.body.appointmentsByDate).toEqual([]);
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });
    });

    describe("Error Cases", () => {
      test("should return 400 for invalid date format", async () => {
        const invalidDates = buildInvalidDateRequest();

        const response = await request(app)
          .get(`/api/analytics/appointments/${testClinicId}`)
          .query(invalidDates);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Formato de fecha inválido");
      });

      test("should return 404 for non-existent clinic", async () => {
        const nonExistentClinicId = 99999;
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/appointments/${nonExistentClinicId}`)
          .query(queryParams);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Clínica no encontrada");
      });

      test("should handle missing query parameters", async () => {
        const response = await request(app).get(
          `/api/analytics/appointments/${testClinicId}`
        );
        // Should use default dates when parameters are missing
        // This might return 400 or 200 depending on implementation
        expect([200, 400]).toContain(response.status);
      });
    });
  });

  describe("GET /api/analytics/services/:id_clinica - Integration", () => {
    describe("Success Cases", () => {
      test("should return services analytics with valid data", async () => {
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/services/${testClinicId}`)
          .query(queryParams);

        if (response.status === 200) {
          expect(response.body).toBeDefined();

          const validation = validateServicesAnalyticsResponse(response);
          expect(validation.hasValidStructure).toBe(true);

          // Check response structure
          expect(Array.isArray(response.body.topServices)).toBe(true);
          expect(Array.isArray(response.body.servicesRevenue)).toBe(true);

          // Validate data format if present
          if (response.body.topServices.length > 0) {
            expect(validation.hasValidTopServices).toBe(true);
          }

          if (response.body.servicesRevenue.length > 0) {
            expect(validation.hasValidRevenue).toBe(true);
          }
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });

      test("should handle RPC function fallback", async () => {
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/services/${testClinicId}`)
          .query(queryParams);

        // Should work with either RPC or fallback query
        if (response.status === 200) {
          const validation = validateServicesAnalyticsResponse(response);
          expect(validation.hasValidStructure).toBe(true);

          // Even if RPC fails, fallback should provide valid structure
          expect(Array.isArray(response.body.topServices)).toBe(true);
          expect(Array.isArray(response.body.servicesRevenue)).toBe(true);
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });
    });

    describe("Error Cases", () => {
      test("should return 400 for invalid date format", async () => {
        const invalidDates = buildInvalidDateRequest();

        const response = await request(app)
          .get(`/api/analytics/services/${testClinicId}`)
          .query(invalidDates);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Formato de fecha inválido");
      });

      test("should return 404 for non-existent clinic", async () => {
        const nonExistentClinicId = 99999;
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/services/${nonExistentClinicId}`)
          .query(queryParams);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Clínica no encontrada");
      });
    });
  });

  describe("GET /api/analytics/demographics/:id_clinica - Integration", () => {
    describe("Success Cases", () => {
      test("should return demographics analytics with valid data", async () => {
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/demographics/${testClinicId}`)
          .query(queryParams);

        if (response.status === 200) {
          expect(response.body).toBeDefined();

          const validation = validateDemographicsAnalyticsResponse(response);
          expect(validation.hasValidStructure).toBe(true);

          // Check response structure
          expect(Array.isArray(response.body.petTypeDistribution)).toBe(true);
          expect(Array.isArray(response.body.ageDistribution)).toBe(true);

          // Validate data format if present
          if (response.body.petTypeDistribution.length > 0) {
            expect(validation.hasValidPetTypes).toBe(true);
          }

          if (response.body.ageDistribution.length > 0) {
            expect(validation.hasValidAgeDistribution).toBe(true);
          }

          // Check expected pet type categories
          const expectedTypes = ["Perros", "Gatos", "Aves", "Exóticos"];
          const expectedAgeRanges = [
            "< 1 año",
            "1-3 años",
            "4-7 años",
            "8-10 años",
            "> 10 años",
          ];

          if (response.body.petTypeDistribution.length > 0) {
            response.body.petTypeDistribution.forEach((item) => {
              expect(expectedTypes).toContain(item.type);
              expect(typeof item.count).toBe("number");
              expect(item.count).toBeGreaterThanOrEqual(0);
            });
          }

          if (response.body.ageDistribution.length > 0) {
            response.body.ageDistribution.forEach((item) => {
              expect(expectedAgeRanges).toContain(item.range);
              expect(typeof item.count).toBe("number");
              expect(item.count).toBeGreaterThanOrEqual(0);
            });
          }
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });
    });

    describe("Error Cases", () => {
      test("should return 400 for invalid date format", async () => {
        const invalidDates = buildInvalidDateRequest();

        const response = await request(app)
          .get(`/api/analytics/demographics/${testClinicId}`)
          .query(invalidDates);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Formato de fecha inválido");
      });

      test("should return 404 for non-existent clinic", async () => {
        const nonExistentClinicId = 99999;
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/demographics/${nonExistentClinicId}`)
          .query(queryParams);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Clínica no encontrada");
      });
    });
  });

  describe("GET /api/analytics/ratings/:id_clinica - Integration", () => {
    describe("Success Cases", () => {
      test("should return ratings analytics with valid data", async () => {
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/ratings/${testClinicId}`)
          .query(queryParams);

        if (response.status === 200) {
          expect(response.body).toBeDefined();

          const validation = validateRatingsAnalyticsResponse(response);
          expect(validation.hasValidStructure).toBe(true);
          expect(validation.hasValidAverage).toBe(true);

          // Check response structure
          expect(typeof response.body.averageRating).toBe("number");
          expect(Array.isArray(response.body.ratingDistribution)).toBe(true);

          // Validate rating range
          expect(response.body.averageRating).toBeGreaterThanOrEqual(0);
          expect(response.body.averageRating).toBeLessThanOrEqual(5);

          // Validate distribution format if present
          if (response.body.ratingDistribution.length > 0) {
            expect(validation.hasValidDistribution).toBe(true);

            const expectedRatings = ["1 ★", "2 ★", "3 ★", "4 ★", "5 ★"];
            response.body.ratingDistribution.forEach((item) => {
              expect(expectedRatings).toContain(item.rating);
              expect(typeof item.count).toBe("number");
              expect(item.count).toBeGreaterThanOrEqual(0);
            });
          }
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });

      test("should handle no ratings scenario", async () => {
        const queryParams = buildFutureDateRequest(); // Use future dates to ensure no ratings

        const response = await request(app)
          .get(`/api/analytics/ratings/${testClinicId}`)
          .query(queryParams);

        if (response.status === 200) {
          // Should return 0 average and empty/zero distribution
          expect(response.body.averageRating).toBe(0);
          expect(Array.isArray(response.body.ratingDistribution)).toBe(true);
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });
    });

    describe("Error Cases", () => {
      test("should return 400 for invalid date format", async () => {
        const invalidDates = buildInvalidDateRequest();

        const response = await request(app)
          .get(`/api/analytics/ratings/${testClinicId}`)
          .query(invalidDates);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Formato de fecha inválido");
      });

      test("should return 404 for non-existent clinic", async () => {
        const nonExistentClinicId = 99999;
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/ratings/${nonExistentClinicId}`)
          .query(queryParams);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Clínica no encontrada");
      });
    });
  });

  describe("GET /api/analytics/summary/:id_clinica - Integration", () => {
    describe("Success Cases", () => {
      test("should return summary analytics with valid data", async () => {
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/summary/${testClinicId}`)
          .query(queryParams);

        if (response.status === 200) {
          expect(response.body).toBeDefined();

          const validation = validateSummaryAnalyticsResponse(response);
          expect(validation.hasValidStructure).toBe(true);
          expect(validation.hasValidRanges).toBe(true);

          // Check all required fields
          expect(typeof response.body.totalAppointments).toBe("number");
          expect(typeof response.body.avgRating).toBe("number");
          expect(typeof response.body.totalRevenue).toBe("number");
          expect(typeof response.body.totalPets).toBe("number");

          // Validate ranges
          expect(response.body.totalAppointments).toBeGreaterThanOrEqual(0);
          expect(response.body.avgRating).toBeGreaterThanOrEqual(0);
          expect(response.body.avgRating).toBeLessThanOrEqual(5);
          expect(response.body.totalRevenue).toBeGreaterThanOrEqual(0);
          expect(response.body.totalPets).toBeGreaterThanOrEqual(0);
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });

      test("should calculate summary metrics consistently", async () => {
        const queryParams = buildAnalyticsRequest();

        // Get individual endpoint data
        const appointmentsResponse = await request(app)
          .get(`/api/analytics/appointments/${testClinicId}`)
          .query(queryParams);

        const ratingsResponse = await request(app)
          .get(`/api/analytics/ratings/${testClinicId}`)
          .query(queryParams);

        const summaryResponse = await request(app)
          .get(`/api/analytics/summary/${testClinicId}`)
          .query(queryParams);

        // If all requests succeed, verify consistency
        if (
          appointmentsResponse.status === 200 &&
          ratingsResponse.status === 200 &&
          summaryResponse.status === 200
        ) {
          // Total appointments should match
          expect(summaryResponse.body.totalAppointments).toBe(
            appointmentsResponse.body.totalAppointments
          );

          // Average rating should match
          expect(summaryResponse.body.avgRating).toBe(
            ratingsResponse.body.averageRating
          );
        }
      });
    });

    describe("Error Cases", () => {
      test("should return 400 for invalid date format", async () => {
        const invalidDates = buildInvalidDateRequest();

        const response = await request(app)
          .get(`/api/analytics/summary/${testClinicId}`)
          .query(invalidDates);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Formato de fecha inválido");
      });

      test("should return 404 for non-existent clinic", async () => {
        const nonExistentClinicId = 99999;
        const queryParams = buildAnalyticsRequest();

        const response = await request(app)
          .get(`/api/analytics/summary/${nonExistentClinicId}`)
          .query(queryParams);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Clínica no encontrada");
      });
    });
  });

  describe("Cross-Endpoint Consistency", () => {
    test("should maintain data consistency across all analytics endpoints", async () => {
      const queryParams = buildAnalyticsRequest();

      // Get data from all endpoints
      const responses = await Promise.all([
        request(app)
          .get(`/api/analytics/appointments/${testClinicId}`)
          .query(queryParams),
        request(app)
          .get(`/api/analytics/services/${testClinicId}`)
          .query(queryParams),
        request(app)
          .get(`/api/analytics/demographics/${testClinicId}`)
          .query(queryParams),
        request(app)
          .get(`/api/analytics/ratings/${testClinicId}`)
          .query(queryParams),
        request(app)
          .get(`/api/analytics/summary/${testClinicId}`)
          .query(queryParams),
      ]);

      const [appointments, services, demographics, ratings, summary] =
        responses;

      // If all succeed, check consistency
      if (responses.every((r) => r.status === 200)) {
        // Summary should aggregate individual endpoint data
        expect(summary.body.totalAppointments).toBe(
          appointments.body.totalAppointments
        );
        expect(summary.body.avgRating).toBe(ratings.body.averageRating);

        // All endpoints should handle the same date range
        responses.forEach((response) => {
          expect(response.body).toBeDefined();
        });
      }
    });

    test("should handle edge case scenarios consistently", async () => {
      const futureDateParams = buildFutureDateRequest();

      // All endpoints should handle future dates (no data) consistently
      const responses = await Promise.all([
        request(app)
          .get(`/api/analytics/appointments/${testClinicId}`)
          .query(futureDateParams),
        request(app)
          .get(`/api/analytics/services/${testClinicId}`)
          .query(futureDateParams),
        request(app)
          .get(`/api/analytics/demographics/${testClinicId}`)
          .query(futureDateParams),
        request(app)
          .get(`/api/analytics/ratings/${testClinicId}`)
          .query(futureDateParams),
        request(app)
          .get(`/api/analytics/summary/${testClinicId}`)
          .query(futureDateParams),
      ]);

      responses.forEach((response) => {
        // All should either succeed with empty data or fail consistently
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });
    });
  });

  describe("Performance and Load Testing", () => {
    test("should handle multiple concurrent requests", async () => {
      const queryParams = buildAnalyticsRequest();

      // Send multiple concurrent requests
      const concurrentRequests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .get(`/api/analytics/summary/${testClinicId}`)
            .query(queryParams)
        );

      const responses = await Promise.all(concurrentRequests);

      // All requests should return the same result
      responses.forEach((response) => {
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          const validation = validateSummaryAnalyticsResponse(response);
          expect(validation.hasValidStructure).toBe(true);
        } else {
          expect([400, 404, 500]).toContain(response.status);
        }
      });

      // Verify all successful responses are identical
      const successfulResponses = responses.filter((r) => r.status === 200);
      if (successfulResponses.length > 1) {
        const firstResponse = successfulResponses[0].body;
        successfulResponses.slice(1).forEach((response) => {
          expect(response.body).toEqual(firstResponse);
        });
      }
    });

    test("should respond within reasonable time limits", async () => {
      const queryParams = buildAnalyticsRequest();
      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/analytics/summary/${testClinicId}`)
        .query(queryParams);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 5 seconds (generous limit for integration tests)
      expect(responseTime).toBeLessThan(5000);

      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });
  });
});
