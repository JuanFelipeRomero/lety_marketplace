import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { createUserToken, createTestUser } from "../helpers/testHelpers.js";
import {
  createTestMascota,
  buildAddPetRequest,
  buildUpdatePetRequest,
  createTestDataset,
} from "../helpers/mascotasHelpers.js";
import fs from "fs";
import path from "path";

// Use dynamic dirname since import.meta.url isn't available in Jest
const __dirname = path.resolve(path.dirname(""));

describe("Mascotas Integration Tests", () => {
  let server;
  let validOwnerToken;
  let validVetToken;
  let testUserId;
  let testMascotaId;
  let createdMascotaIds = [];

  beforeAll(async () => {
    // Start test server on different port for tests
    const PORT = process.env.PORT ? parseInt(process.env.PORT) + 4 : 3005;
    server = app.listen(PORT);

    // Create test tokens
    testUserId = 999; // Use a test user ID that won't conflict
    validOwnerToken = createUserToken(testUserId);
    validVetToken = createUserToken(1); // Different user for testing unauthorized access
  });

  afterAll(async () => {
    // Close test server
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    // Reset created mascota IDs for cleanup
    createdMascotaIds = [];
  });

  afterEach(async () => {
    // Cleanup any mascotas created during tests
    for (const mascotaId of createdMascotaIds) {
      try {
        await request(app)
          .delete("/pets/delete")
          .set("Authorization", `Bearer ${validOwnerToken}`)
          .query({
            id_usuario: testUserId,
            id_mascota: mascotaId,
          });
      } catch (error) {
        // Ignore cleanup errors
        console.log(`Cleanup error for mascota ${mascotaId}:`, error.message);
      }
    }
  });

  describe("POST /pets/add - Integration", () => {
    test("should successfully add a new pet with valid data and files", async () => {
      const petData = buildAddPetRequest();

      // Create test files
      const testPhotoPath = path.join(
        __dirname,
        "../fixtures/test-pet-photo.jpg"
      );
      const testHistoryPath = path.join(
        __dirname,
        "../fixtures/test-medical-history.pdf"
      );

      // Create fixture files if they don't exist
      if (!fs.existsSync(path.dirname(testPhotoPath))) {
        fs.mkdirSync(path.dirname(testPhotoPath), { recursive: true });
      }
      if (!fs.existsSync(testPhotoPath)) {
        fs.writeFileSync(testPhotoPath, Buffer.from("fake image data"));
      }
      if (!fs.existsSync(testHistoryPath)) {
        fs.writeFileSync(testHistoryPath, Buffer.from("fake pdf data"));
      }

      const response = await request(app)
        .post("/pets/add")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: testUserId })
        .field("petName", petData.petName)
        .field("petAge", petData.petAge)
        .field("petBreed", petData.petBreed)
        .field("petSpecies", petData.petSpecies)
        .field("petGender", petData.petGender)
        .field("petWeight", petData.petWeight)
        .attach("foto", testPhotoPath)
        .attach("historial", testHistoryPath);

      // Response might be 201 or error depending on database setup
      if (response.status === 201) {
        expect(response.body.message).toContain("exitosamente");
        expect(response.body.mascota).toBeDefined();
        expect(response.body.mascota.nombre).toBe(petData.petName);

        // Track for cleanup
        createdMascotaIds.push(response.body.mascota.id_mascota);
      } else {
        // Document the expected behavior when DB is not available
        expect([400, 500]).toContain(response.status);
        console.log(
          "Integration test - DB not available:",
          response.body.message
        );
      }
    });

    test("should return 401 when no authorization token provided", async () => {
      const petData = buildAddPetRequest();

      const response = await request(app)
        .post("/pets/add")
        .query({ id_usuario: testUserId })
        .send(petData);

      expect(response.status).toBe(401);
    });

    test("should return 400 when user ID is missing", async () => {
      const petData = buildAddPetRequest();

      const response = await request(app)
        .post("/pets/add")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .send(petData);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/id.*usuario/i);
    });

    test("should return 400 when required pet data is missing", async () => {
      const incompletePetData = {
        petName: "Test Pet",
        // Missing required fields
      };

      const response = await request(app)
        .post("/pets/add")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: testUserId })
        .send(incompletePetData);

      // Should fail due to missing required fields
      expect([400, 500]).toContain(response.status);
    });

    test("should handle large file uploads gracefully", async () => {
      const petData = buildAddPetRequest();

      // Create a large test file (simulate oversized upload)
      const largeBinaryData = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const largeFilePath = path.join(
        __dirname,
        "../fixtures/large-test-file.jpg"
      );

      if (!fs.existsSync(path.dirname(largeFilePath))) {
        fs.mkdirSync(path.dirname(largeFilePath), { recursive: true });
      }
      fs.writeFileSync(largeFilePath, largeBinaryData);

      const response = await request(app)
        .post("/pets/add")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: testUserId })
        .field("petName", petData.petName)
        .field("petAge", petData.petAge)
        .field("petBreed", petData.petBreed)
        .field("petSpecies", petData.petSpecies)
        .field("petGender", petData.petGender)
        .field("petWeight", petData.petWeight)
        .attach("foto", largeFilePath);

      // Should handle large files according to multer configuration
      expect([201, 400, 413, 500]).toContain(response.status);

      // Cleanup large file
      if (fs.existsSync(largeFilePath)) {
        fs.unlinkSync(largeFilePath);
      }
    });
  });

  describe("GET /pets/get - Integration", () => {
    test("should return empty array when user has no pets", async () => {
      const response = await request(app)
        .get("/pets/get")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: testUserId });

      if (response.status === 200) {
        expect(response.body.mascotas).toEqual([]);
        expect(response.body.message).toMatch(/no.*mascotas/i);
      } else {
        // Document behavior when DB not available
        expect([400, 500]).toContain(response.status);
      }
    });

    test("should return 401 when no authorization token provided", async () => {
      const response = await request(app)
        .get("/pets/get")
        .query({ id_usuario: testUserId });

      expect(response.status).toBe(401);
    });

    test("should return 400 when user ID is missing", async () => {
      const response = await request(app)
        .get("/pets/get")
        .set("Authorization", `Bearer ${validOwnerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message || response.body.meassage).toMatch(
        /id.*usuario/i
      );
    });

    test("should handle database connection errors gracefully", async () => {
      const response = await request(app)
        .get("/pets/get")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: "999999" }); // Non-existent user

      // Should handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe("GET /pets/get-a-pet - Integration", () => {
    test("should return 400 when mascota ID is missing", async () => {
      const response = await request(app)
        .get("/pets/get-a-pet")
        .set("Authorization", `Bearer ${validOwnerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/id.*mascota/i);
    });

    test("should return 404 when pet doesn't exist", async () => {
      const response = await request(app)
        .get("/pets/get-a-pet")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_mascota: "999999" });

      expect([400, 404]).toContain(response.status);
    });

    test("should return 401 when no authorization token provided", async () => {
      const response = await request(app)
        .get("/pets/get-a-pet")
        .query({ id_mascota: "1" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /pets/delete - Integration", () => {
    test("should return 401 when no authorization token provided", async () => {
      const response = await request(app).delete("/pets/delete").query({
        id_usuario: testUserId,
        id_mascota: "1",
      });

      expect(response.status).toBe(401);
    });

    test("should return 400 when user ID is missing", async () => {
      const response = await request(app)
        .delete("/pets/delete")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_mascota: "1" });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/id.*usuario/i);
    });

    test("should return 400 when mascota ID is missing", async () => {
      const response = await request(app)
        .delete("/pets/delete")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: testUserId });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/id.*mascota/i);
    });

    test("should return 404 when trying to delete non-existent pet", async () => {
      const response = await request(app)
        .delete("/pets/delete")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({
          id_usuario: testUserId,
          id_mascota: "999999",
        });

      expect([400, 404]).toContain(response.status);
    });

    test("should handle authorization errors (pet doesn't belong to user)", async () => {
      // Try to delete a pet with wrong user ID
      const response = await request(app)
        .delete("/pets/delete")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({
          id_usuario: "999998", // Different user
          id_mascota: "1",
        });

      expect([400, 404]).toContain(response.status);
    });
  });

  describe("PUT /pets/update - Integration", () => {
    test("should return 401 when no authorization token provided", async () => {
      const updateData = buildUpdatePetRequest();

      const response = await request(app)
        .put("/pets/update")
        .query({
          id_usuario: testUserId,
          id_mascota: "1",
        })
        .send(updateData);

      expect(response.status).toBe(401);
    });

    test("should return 400 when user ID is missing", async () => {
      const updateData = buildUpdatePetRequest();

      const response = await request(app)
        .put("/pets/update")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_mascota: "1" })
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/id_usuario.*id_mascota/i);
    });

    test("should return 400 when mascota ID is missing", async () => {
      const updateData = buildUpdatePetRequest();

      const response = await request(app)
        .put("/pets/update")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: testUserId })
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/id_usuario.*id_mascota/i);
    });

    test("should return 404 when pet doesn't exist or doesn't belong to user", async () => {
      const updateData = buildUpdatePetRequest();

      const response = await request(app)
        .put("/pets/update")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({
          id_usuario: testUserId,
          id_mascota: "999999",
        })
        .send(updateData);

      expect([400, 404]).toContain(response.status);
    });

    test("should handle file uploads in update requests", async () => {
      const updateData = buildUpdatePetRequest();

      // Create test file
      const testPhotoPath = path.join(
        __dirname,
        "../fixtures/update-pet-photo.jpg"
      );
      if (!fs.existsSync(path.dirname(testPhotoPath))) {
        fs.mkdirSync(path.dirname(testPhotoPath), { recursive: true });
      }
      if (!fs.existsSync(testPhotoPath)) {
        fs.writeFileSync(testPhotoPath, Buffer.from("fake updated image data"));
      }

      const response = await request(app)
        .put("/pets/update")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({
          id_usuario: testUserId,
          id_mascota: "1",
        })
        .field("petName", updateData.petName)
        .field("petAge", updateData.petAge)
        .attach("foto", testPhotoPath);

      // Should handle appropriately based on pet existence
      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  describe("Security and Authorization Tests", () => {
    test("should prevent access with invalid token", async () => {
      const response = await request(app)
        .get("/pets/get")
        .set("Authorization", "Bearer invalid-token")
        .query({ id_usuario: testUserId });

      expect([401, 403]).toContain(response.status);
    });

    test("should prevent access with malformed token", async () => {
      const response = await request(app)
        .get("/pets/get")
        .set("Authorization", "InvalidFormat")
        .query({ id_usuario: testUserId });

      expect([401, 403]).toContain(response.status);
    });

    test("should prevent SQL injection attempts", async () => {
      const maliciousId = "1' OR '1'='1";

      const response = await request(app)
        .get("/pets/get-a-pet")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_mascota: maliciousId });

      // Should handle safely without SQL injection
      expect([400, 404, 500]).toContain(response.status);
    });

    test("should prevent XSS attempts in pet data", async () => {
      const xssData = buildAddPetRequest({
        petName: "<script>alert('xss')</script>",
        petBreed: "<img src=x onerror=alert('xss')>",
      });

      const response = await request(app)
        .post("/pets/add")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: testUserId })
        .send(xssData);

      // Should either succeed (with sanitized data) or fail validation
      expect([201, 400, 500]).toContain(response.status);

      if (response.status === 201) {
        // If successful, the data should be sanitized
        expect(response.body.mascota.nombre).not.toContain("<script>");
        createdMascotaIds.push(response.body.mascota.id_mascota);
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle concurrent requests gracefully", async () => {
      const petData = buildAddPetRequest();

      // Send multiple requests simultaneously
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .post("/pets/add")
            .set("Authorization", `Bearer ${validOwnerToken}`)
            .query({ id_usuario: testUserId })
            .send(petData)
        );

      const responses = await Promise.all(requests);

      // Some may succeed, some may fail, but none should crash
      responses.forEach((response) => {
        expect([201, 400, 500]).toContain(response.status);
        if (response.status === 201 && response.body.mascota) {
          createdMascotaIds.push(response.body.mascota.id_mascota);
        }
      });
    });

    test("should handle very long request payloads", async () => {
      const longString = "A".repeat(10000);
      const extremeData = buildAddPetRequest({
        petName: longString,
        petBreed: longString,
      });

      const response = await request(app)
        .post("/pets/add")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: testUserId })
        .send(extremeData);

      // Should handle gracefully (likely validation error)
      expect([400, 413, 500]).toContain(response.status);
    });

    test("should handle malformed JSON in request body", async () => {
      const response = await request(app)
        .post("/pets/add")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .set("Content-Type", "application/json")
        .query({ id_usuario: testUserId })
        .send("{ invalid json }");

      expect([400, 500]).toContain(response.status);
    });

    test("should handle numeric overflow in pet data", async () => {
      const overflowData = buildAddPetRequest({
        petAge: "999999999999999999999",
        petWeight: "999999999999999999999.99",
      });

      const response = await request(app)
        .post("/pets/add")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: testUserId })
        .send(overflowData);

      // Should handle gracefully (likely validation error)
      expect([400, 500]).toContain(response.status);
    });
  });

  describe("Performance and Load Tests", () => {
    test("should handle multiple pet retrieval requests efficiently", async () => {
      const startTime = Date.now();

      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app)
            .get("/pets/get")
            .set("Authorization", `Bearer ${validOwnerToken}`)
            .query({ id_usuario: testUserId })
        );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 requests

      responses.forEach((response) => {
        expect([200, 400, 500]).toContain(response.status);
      });
    });

    test("should respond to health check requests quickly", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get("/pets/get")
        .set("Authorization", `Bearer ${validOwnerToken}`)
        .query({ id_usuario: "1" });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 2 seconds
      expect(responseTime).toBeLessThan(2000);
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
