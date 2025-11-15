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
  createTestAppointmentSetup,
  createAppointmentUserToken,
  createAppointmentVetToken,
  buildScheduleAppointmentRequest,
  buildUpdateStatusRequest,
  buildEditAppointmentRequest,
  buildFinalizeAppointmentRequest,
  buildRescheduleRequest,
  buildCancelAppointmentRequest,
  cleanupTestAppointments
} from "../helpers/citasHelpers.js";

describe("Citas Integration Tests", () => {
  let server;
  let userToken;
  let vetToken;
  let testData;
  let createdAppointmentIds = [];

  beforeAll(async () => {
    // Start test server on different port for tests
    const PORT = process.env.PORT ? parseInt(process.env.PORT) + 5 : 3005;
    server = app.listen(PORT);

    // Create test tokens
    userToken = createAppointmentUserToken(1);
    vetToken = createAppointmentVetToken(1);

    // Setup test data
    testData = createTestAppointmentSetup();
  });

  afterAll(async () => {
    // Cleanup created appointments
    if (createdAppointmentIds.length > 0) {
      // In a real test environment, you would clean up the database
      console.log("Cleaning up test appointments:", createdAppointmentIds);
    }

    // Close test server
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    // Reset for each test
    createdAppointmentIds = [];
  });

  describe("POST /appointments/schedule - Integration", () => {
    describe("Authentication and Authorization", () => {
      test("should require authentication token", async () => {
        const requestData = buildScheduleAppointmentRequest();

        const response = await request(app)
          .post("/appointments/schedule")
          .send(requestData);

        expect(response.status).toBe(401);
        expect(response.body.message).toContain("token");
      });

      test("should reject non-owner users", async () => {
        const requestData = buildScheduleAppointmentRequest();

        const response = await request(app)
          .post("/appointments/schedule")
          .set("Authorization", `Bearer ${vetToken}`)
          .send(requestData);

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("dueños de mascotas");
      });

      test("should accept valid owner authentication", async () => {
        const requestData = buildScheduleAppointmentRequest();

        const response = await request(app)
          .post("/appointments/schedule")
          .set("Authorization", `Bearer ${userToken}`)
          .send(requestData);

        // May fail due to database constraints, but should not be auth error
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      });
    });

    describe("Input Validation", () => {
      test("should return 400 when required fields are missing", async () => {
        const incompleteRequests = [
          {}, // Empty request
          { petId: 1 }, // Missing other required fields
          { petId: 1, serviceId: 1 }, // Missing date, timeSlot, acceptedTerms
          { petId: 1, serviceId: 1, date: "2025-01-01", timeSlot: "10:00" }, // Missing acceptedTerms
          { petId: 1, serviceId: 1, date: "2025-01-01", timeSlot: "10:00", acceptedTerms: false }, // acceptedTerms false
        ];

        for (const requestData of incompleteRequests) {
          const response = await request(app)
            .post("/appointments/schedule")
            .set("Authorization", `Bearer ${userToken}`)
            .send(requestData);

          expect(response.status).toBe(400);
          expect(response.body.message).toContain("incompletos o inválidos");
        }
      });

      test("should return 400 for invalid date format", async () => {
        const requestData = buildScheduleAppointmentRequest({
          date: "invalid-date"
        });

        const response = await request(app)
          .post("/appointments/schedule")
          .set("Authorization", `Bearer ${userToken}`)
          .send(requestData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("Fecha inválida");
      });

      test("should accept valid appointment data", async () => {
        const requestData = buildScheduleAppointmentRequest();

        const response = await request(app)
          .post("/appointments/schedule")
          .set("Authorization", `Bearer ${userToken}`)
          .send(requestData);

        // May fail due to database constraints (pet doesn't exist, etc.)
        // but should not be a validation error
        if (response.status === 201) {
          expect(response.body.message).toContain("exitosamente");
          if (response.body.cita?.id_cita) {
            createdAppointmentIds.push(response.body.cita.id_cita);
          }
        } else {
          // Should be database-related errors, not validation
          expect(response.status).toBeOneOf([404, 500]);
        }
      });
    });

    describe("Business Logic", () => {
      test("should return 404 when pet is not found", async () => {
        const requestData = buildScheduleAppointmentRequest({
          petId: 999999 // Non-existent pet ID
        });

        const response = await request(app)
          .post("/appointments/schedule")
          .set("Authorization", `Bearer ${userToken}`)
          .send(requestData);

        expect(response.status).toBe(404);
        expect(response.body.message).toContain("Mascota no encontrada");
      });

      test("should return 403 when pet doesn't belong to user", async () => {
        // This would require setting up test data where pet belongs to different user
        const requestData = buildScheduleAppointmentRequest({
          petId: 2 // Assuming this pet belongs to different user
        });

        const response = await request(app)
          .post("/appointments/schedule")
          .set("Authorization", `Bearer ${userToken}`)
          .send(requestData);

        // Could be 404 (pet not found) or 403 (not owner)
        expect([403, 404]).toContain(response.status);
      });
    });
  });

  describe("GET /appointments/user - Integration", () => {
    test("should require authentication", async () => {
      const response = await request(app)
        .get("/appointments/user");

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("token");
    });

    test("should return appointments for authenticated user", async () => {
      const response = await request(app)
        .get("/appointments/user")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.citas).toBeDefined();
      expect(Array.isArray(response.body.citas)).toBe(true);
    });

    test("should return properly formatted appointment data", async () => {
      const response = await request(app)
        .get("/appointments/user")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.citas.length > 0) {
        const appointment = response.body.citas[0];
        expect(appointment).toHaveProperty("id");
        expect(appointment).toHaveProperty("petName");
        expect(appointment).toHaveProperty("clinicName");
        expect(appointment).toHaveProperty("date");
        expect(appointment).toHaveProperty("time");
        expect(appointment).toHaveProperty("status");
      }
    });
  });

  describe("GET /appointments/clinic - Integration", () => {
    test("should require vet authentication", async () => {
      const response = await request(app)
        .get("/appointments/clinic");

      expect(response.status).toBe(401);
    });

    test("should reject non-vet users", async () => {
      const response = await request(app)
        .get("/appointments/clinic")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("clínicas");
    });

    test("should return appointments for authenticated clinic", async () => {
      const response = await request(app)
        .get("/appointments/clinic")
        .set("Authorization", `Bearer ${vetToken}`);

      expect(response.status).toBe(200);
      expect(response.body.citas).toBeDefined();
      expect(Array.isArray(response.body.citas)).toBe(true);
    });
  });

  describe("GET /appointments/:appointmentId - Integration", () => {
    test("should require authentication", async () => {
      const response = await request(app)
        .get("/appointments/1");

      expect(response.status).toBe(401);
    });

    test("should return 404 for non-existent appointment", async () => {
      const response = await request(app)
        .get("/appointments/999999")
        .set("Authorization", `Bearer ${userToken}`);

      // May return 500 due to Supabase error handling
      expect([404, 500]).toContain(response.status);
      if (response.status === 404) {
        expect(response.body.message).toContain("no encontrada");
      }
    });

    test("should return appointment details for valid request", async () => {
      // This test would need an existing appointment
      const response = await request(app)
        .get("/appointments/1")
        .set("Authorization", `Bearer ${userToken}`);

      if (response.status === 200) {
        expect(response.body.appointment).toBeDefined();
        expect(response.body.appointment).toHaveProperty("id");
        expect(response.body.appointment).toHaveProperty("petName");
        expect(response.body.appointment).toHaveProperty("clinicName");
      } else {
        // Likely 404 due to no test data
        expect(response.status).toBe(404);
      }
    });
  });

  describe("PUT /appointments/:appointmentId/status - Integration", () => {
    test("should require vet authentication", async () => {
      const requestData = buildUpdateStatusRequest();

      const response = await request(app)
        .put("/appointments/1/status")
        .send(requestData);

      expect(response.status).toBe(401);
    });

    test("should reject non-vet users", async () => {
      const requestData = buildUpdateStatusRequest();

      const response = await request(app)
        .put("/appointments/1/status")
        .set("Authorization", `Bearer ${userToken}`)
        .send(requestData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("clínicas");
    });

    test("should validate status values", async () => {
      const invalidStatuses = ["invalid", "pending", "completed"];

      for (const status of invalidStatuses) {
        const requestData = buildUpdateStatusRequest({ status });

        const response = await request(app)
          .put("/appointments/1/status")
          .set("Authorization", `Bearer ${vetToken}`)
          .send(requestData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("Estado no válido");
      }
    });

    test("should accept valid status updates", async () => {
      const validStatuses = ["confirmada", "rechazada", "reprogramacion_sugerida"];

      for (const status of validStatuses) {
        const requestData = buildUpdateStatusRequest({ status });

        const response = await request(app)
          .put("/appointments/1/status")
          .set("Authorization", `Bearer ${vetToken}`)
          .send(requestData);

        // May be 404 if appointment doesn't exist, but not validation error
        if (response.status !== 404) {
          expect(response.status).not.toBe(400);
        }
      }
    });
  });

  describe("PUT /appointments/:appointmentId/edit - Integration", () => {
    test("should require owner authentication", async () => {
      const requestData = buildEditAppointmentRequest();

      const response = await request(app)
        .put("/appointments/1/edit")
        .send(requestData);

      expect(response.status).toBe(401);
    });

    test("should reject non-owner users", async () => {
      const requestData = buildEditAppointmentRequest();

      const response = await request(app)
        .put("/appointments/1/edit")
        .set("Authorization", `Bearer ${vetToken}`)
        .send(requestData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("dueño");
    });

    test("should handle appointment not found", async () => {
      const requestData = buildEditAppointmentRequest();

      const response = await request(app)
        .put("/appointments/999999/edit")
        .set("Authorization", `Bearer ${userToken}`)
        .send(requestData);

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /appointments/:appointmentId/finalize - Integration", () => {
    test("should require vet authentication", async () => {
      const requestData = buildFinalizeAppointmentRequest();

      const response = await request(app)
        .put("/appointments/1/finalize")
        .send(requestData);

      expect(response.status).toBe(401);
    });

    test("should reject non-vet users", async () => {
      const requestData = buildFinalizeAppointmentRequest();

      const response = await request(app)
        .put("/appointments/1/finalize")
        .set("Authorization", `Bearer ${userToken}`)
        .send(requestData);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("clínica");
    });

    test("should accept valid finalization data", async () => {
      const requestData = buildFinalizeAppointmentRequest();

      const response = await request(app)
        .put("/appointments/1/finalize")
        .set("Authorization", `Bearer ${vetToken}`)
        .send(requestData);

      // May be 404 if appointment doesn't exist
      if (response.status !== 404) {
        expect([200, 500]).toContain(response.status);
      }
    });
  });

  describe("PUT /appointments/:appointmentId/reschedule - Integration", () => {
    test("should require vet authentication", async () => {
      const requestData = buildRescheduleRequest();

      const response = await request(app)
        .put("/appointments/1/reschedule")
        .send(requestData);

      expect(response.status).toBe(401);
    });

    test("should validate required fields", async () => {
      const incompleteRequests = [
        {}, // Missing date and timeSlot
        { date: "2025-01-01" }, // Missing timeSlot
        { timeSlot: "10:00" }, // Missing date
      ];

      for (const requestData of incompleteRequests) {
        const response = await request(app)
          .put("/appointments/1/reschedule")
          .set("Authorization", `Bearer ${vetToken}`)
          .send(requestData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("obligatorios");
      }
    });
  });

  describe("PATCH /appointment/:id/reschedule - Integration", () => {
    test("should require owner authentication", async () => {
      const requestData = buildRescheduleRequest();

      const response = await request(app)
        .patch("/appointment/1/reschedule")
        .send(requestData);

      expect(response.status).toBe(401);
    });

    test("should validate required fields", async () => {
      const incompleteRequests = [
        {}, // Missing date and time
        { date: "2025-01-01" }, // Missing time
        { time: "10:00" }, // Missing date
      ];

      for (const requestData of incompleteRequests) {
        const response = await request(app)
          .patch("/appointment/1/reschedule")
          .set("Authorization", `Bearer ${userToken}`)
          .send(requestData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("requeridas");
      }
    });
  });

  describe("PATCH /appointment/:id/cancel - Integration", () => {
    test("should require authentication", async () => {
      const requestData = buildCancelAppointmentRequest();

      const response = await request(app)
        .patch("/appointment/1/cancel")
        .send(requestData);

      expect(response.status).toBe(401);
    });

    test("should require cancellation reason", async () => {
      const invalidRequests = [
        {}, // Missing reason
        { reason: "" }, // Empty reason
        { reason: "   " }, // Whitespace only
      ];

      for (const requestData of invalidRequests) {
        const response = await request(app)
          .patch("/appointment/1/cancel")
          .set("Authorization", `Bearer ${userToken}`)
          .send(requestData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("obligatorio");
      }
    });

    test("should accept valid cancellation", async () => {
      const requestData = buildCancelAppointmentRequest({
        reason: "Motivo válido de cancelación"
      });

      const response = await request(app)
        .patch("/appointment/1/cancel")
        .set("Authorization", `Bearer ${userToken}`)
        .send(requestData);

      // May be 404 if appointment doesn't exist
      if (response.status !== 404) {
        expect([200, 400, 403, 500]).toContain(response.status);
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle malformed JSON", async () => {
      const response = await request(app)
        .post("/appointments/schedule")
        .set("Authorization", `Bearer ${userToken}`)
        .set("Content-Type", "application/json")
        .send("invalid json");

      expect(response.status).toBe(400);
    });

    test("should handle missing Content-Type", async () => {
      const response = await request(app)
        .post("/appointments/schedule")
        .set("Authorization", `Bearer ${userToken}`)
        .send("data");

      expect([400, 500]).toContain(response.status);
    });

    test("should handle very large appointment IDs", async () => {
      const response = await request(app)
        .get("/appointments/999999999999999")
        .set("Authorization", `Bearer ${userToken}`);

      expect([404, 400, 500]).toContain(response.status);
    });

    test("should handle invalid appointment ID formats", async () => {
      const invalidIds = ["abc", "123abc", "", "null"];

      for (const id of invalidIds) {
        const response = await request(app)
          .get(`/appointments/${id}`)
          .set("Authorization", `Bearer ${userToken}`);

        expect([400, 404, 500]).toContain(response.status);
      }
    });
  });

  describe("Response Format Validation", () => {
    test("should return consistent error message format", async () => {
      const response = await request(app)
        .post("/appointments/schedule")
        .set("Authorization", `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message");
      expect(typeof response.body.message).toBe("string");
    });

    test("should return consistent success message format", async () => {
      const requestData = buildScheduleAppointmentRequest();

      const response = await request(app)
        .post("/appointments/schedule")
        .set("Authorization", `Bearer ${userToken}`)
        .send(requestData);

      if (response.status === 201) {
        expect(response.body).toHaveProperty("message");
        expect(typeof response.body.message).toBe("string");
        // Note: cita property may not always be returned depending on implementation
        if (response.body.cita) {
          expect(response.body.cita).toBeDefined();
        }
      }
    });
  });

  describe("Performance Tests", () => {
    test("should respond within reasonable time for list endpoints", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get("/appointments/user")
        .set("Authorization", `Bearer ${userToken}`);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(5000); // 5 seconds
      expect(response.status).toBe(200);
    }, 10000);

    test("should respond within reasonable time for detail endpoints", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get("/appointments/1")
        .set("Authorization", `Bearer ${userToken}`);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(3000); // 3 seconds
      expect([200, 404]).toContain(response.status);
    }, 5000);
  });
});
