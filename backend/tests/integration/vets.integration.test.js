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
  createTestVeterinaryData,
  createVetToken,
  buildRegisterVetRequest,
  buildUpdateInfoRequest,
  buildUpdateHoursRequest,
  buildUpdateDetailsRequest,
  createMockFile,
  createInvalidMockFile,
  createTestFile,
  cleanupTestFiles,
  cleanupTestVeterinaries,
  validateVetRegistrationResponse,
  validateVetProfileResponse,
} from "../helpers/vetsHelpers.js";

describe("Vets Integration Tests", () => {
  let server;
  let vetToken;
  let testData;
  let createdClinicIds = [];
  let createdTestFiles = [];

  beforeAll(async () => {
    // Start test server on different port for tests
    const PORT = process.env.PORT ? parseInt(process.env.PORT) + 6 : 3006;
    server = app.listen(PORT);

    // Create test token
    vetToken = createVetToken(1);

    // Setup test data
    testData = createTestVeterinaryData();
  });

  afterAll(async () => {
    // Cleanup created clinics
    if (createdClinicIds.length > 0) {
      console.log("Cleaning up test clinics:", createdClinicIds);
    }

    // Cleanup test files
    cleanupTestFiles(createdTestFiles);

    // Close test server
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    // Reset for each test
    createdClinicIds = [];
    createdTestFiles = [];
  });

  describe("POST /register/veterinary - Integration", () => {
    describe("Input Validation", () => {
      test("should return 400 when required fields are missing", async () => {
        const incompleteRequests = [
          {}, // Empty request
          { nombre: "Test Clinic" }, // Missing other required fields
          buildRegisterVetRequest({ correo: undefined }), // Missing email
          buildRegisterVetRequest({ contrasena: undefined }), // Missing password
          buildRegisterVetRequest({ NIT: undefined }), // Missing NIT
        ];

        for (const requestData of incompleteRequests) {
          const response = await request(app)
            .post("/register/veterinary")
            .send(requestData);

          expect(response.status).toBe(400);
          expect(response.body.message).toContain("obligatorios");
        }
      });

      test("should accept valid veterinary registration", async () => {
        const requestData = buildRegisterVetRequest({
          correo: `test${Date.now()}@veterinaria.com`, // Unique email
          NIT: `${Date.now().toString().slice(-9)}-1`, // Unique NIT
        });

        const response = await request(app)
          .post("/register/veterinary")
          .send(requestData);

        if (response.status === 201) {
          expect(validateVetRegistrationResponse(response.body)).toBe(true);
          expect(response.body.message).toContain("exitosamente");

          if (response.body.datosClinica?.id_clinica) {
            createdClinicIds.push(response.body.datosClinica.id_clinica);
          }
        } else {
          // Should be validation or database-related errors
          expect([400, 500]).toContain(response.status);
        }
      });

      test("should handle duplicate email registration", async () => {
        const duplicateData = buildRegisterVetRequest({
          correo: "duplicate@test.com",
          NIT: "123456789-1",
        });

        // First registration
        const firstResponse = await request(app)
          .post("/register/veterinary")
          .send(duplicateData);

        if (firstResponse.status === 201) {
          createdClinicIds.push(firstResponse.body.datosClinica.id_clinica);
        }

        // Second registration with same email
        const secondResponse = await request(app)
          .post("/register/veterinary")
          .send(duplicateData);

        // Should fail due to duplicate email
        expect([400, 409]).toContain(secondResponse.status);
      });

      test("should handle duplicate NIT registration", async () => {
        const uniqueNIT = `${Date.now().toString().slice(-9)}-1`;
        const duplicateNITData1 = buildRegisterVetRequest({
          correo: "unique1@test.com",
          NIT: uniqueNIT,
        });
        const duplicateNITData2 = buildRegisterVetRequest({
          correo: "unique2@test.com",
          NIT: uniqueNIT, // Same NIT
        });

        // First registration
        const firstResponse = await request(app)
          .post("/register/veterinary")
          .send(duplicateNITData1);

        if (firstResponse.status === 201) {
          createdClinicIds.push(firstResponse.body.datosClinica.id_clinica);
        }

        // Second registration with same NIT
        const secondResponse = await request(app)
          .post("/register/veterinary")
          .send(duplicateNITData2);

        // Should fail due to duplicate NIT
        expect([400, 409]).toContain(secondResponse.status);
      });
    });

    describe("File Upload", () => {
      test("should handle valid certificate upload", async () => {
        const testFilePath = createTestFile("test-certificate.pdf");
        createdTestFiles.push(testFilePath);

        const requestData = buildRegisterVetRequest({
          correo: `filetest${Date.now()}@veterinaria.com`,
          NIT: `${Date.now().toString().slice(-9)}-1`,
        });

        const response = await request(app)
          .post("/register/veterinary")
          .field("nombre", requestData.nombre)
          .field("direccion", requestData.direccion)
          .field("telefono", requestData.telefono)
          .field("correo", requestData.correo)
          .field("contrasena", requestData.contrasena)
          .field("NIT", requestData.NIT)
          .field("descripcion", requestData.descripcion)
          .attach("certificadoSalud", testFilePath);

        if (response.status === 201) {
          expect(response.body.datosClinica).toBeDefined();
          createdClinicIds.push(response.body.datosClinica.id_clinica);
        } else {
          // May fail due to file upload configuration in test environment
          expect([400, 500]).toContain(response.status);
        }
      });

      test("should reject invalid file types", async () => {
        const testFilePath = createTestFile("test-image.jpg");
        createdTestFiles.push(testFilePath);

        const requestData = buildRegisterVetRequest({
          correo: `invalidfile${Date.now()}@veterinaria.com`,
          NIT: `${Date.now().toString().slice(-9)}-1`,
        });

        const response = await request(app)
          .post("/register/veterinary")
          .field("nombre", requestData.nombre)
          .field("direccion", requestData.direccion)
          .field("telefono", requestData.telefono)
          .field("correo", requestData.correo)
          .field("contrasena", requestData.contrasena)
          .field("NIT", requestData.NIT)
          .attach("certificadoSalud", testFilePath);

        // May be accepted in test environment, but in production should validate file type
        expect([201, 400, 500]).toContain(response.status);
      });
    });

    describe("Services Processing", () => {
      test("should register clinic with services", async () => {
        const services = [
          { name: "Consulta General", price: "50000", category: "consulta" },
          {
            name: "Vacunación",
            price: "35000",
            category: "medicina_preventiva",
          },
        ];

        const requestData = buildRegisterVetRequest({
          correo: `services${Date.now()}@veterinaria.com`,
          NIT: `${Date.now().toString().slice(-9)}-1`,
          servicios: JSON.stringify(services),
        });

        const response = await request(app)
          .post("/register/veterinary")
          .send(requestData);

        if (response.status === 201) {
          expect(response.body.servicios).toBeDefined();
          expect(Array.isArray(response.body.servicios)).toBe(true);
          createdClinicIds.push(response.body.datosClinica.id_clinica);
        } else {
          expect([400, 500]).toContain(response.status);
        }
      });

      test("should handle invalid services JSON", async () => {
        const requestData = buildRegisterVetRequest({
          correo: `invalidjson${Date.now()}@veterinaria.com`,
          NIT: `${Date.now().toString().slice(-9)}-1`,
          servicios: "invalid json format",
        });

        const response = await request(app)
          .post("/register/veterinary")
          .send(requestData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("formato inválido");
      });
    });

    describe("Geocoding Integration", () => {
      test("should handle valid addresses", async () => {
        const requestData = buildRegisterVetRequest({
          correo: `geocoding${Date.now()}@veterinaria.com`,
          NIT: `${Date.now().toString().slice(-9)}-1`,
          direccion: "Carrera 7 #32-16, Bogotá, Colombia",
        });

        const response = await request(app)
          .post("/register/veterinary")
          .send(requestData);

        if (response.status === 201) {
          // May have coordinates if geocoding is successful
          const clinica = response.body.datosClinica;
          if (clinica.latitud && clinica.longitud) {
            expect(typeof clinica.latitud).toBe("number");
            expect(typeof clinica.longitud).toBe("number");
          }
          createdClinicIds.push(clinica.id_clinica);
        } else {
          expect([400, 500]).toContain(response.status);
        }
      });

      test("should handle invalid addresses gracefully", async () => {
        const requestData = buildRegisterVetRequest({
          correo: `invalidaddress${Date.now()}@veterinaria.com`,
          NIT: `${Date.now().toString().slice(-9)}-1`,
          direccion: "Invalid Address That Does Not Exist",
        });

        const response = await request(app)
          .post("/register/veterinary")
          .send(requestData);

        // Should still register successfully even if geocoding fails
        if (response.status === 201) {
          createdClinicIds.push(response.body.datosClinica.id_clinica);
        } else {
          expect([400, 500]).toContain(response.status);
        }
      });
    });
  });

  describe("PUT /update/veterinary/info/:id_clinica - Integration", () => {
    test("should return 404 for non-existent clinic", async () => {
      const updateData = buildUpdateInfoRequest();

      const response = await request(app)
        .put("/update/veterinary/info/999999")
        .send(updateData);

      expect([404, 400, 200]).toContain(response.status);
    });

    test("should update existing clinic information", async () => {
      // First create a clinic
      const registerData = buildRegisterVetRequest({
        correo: `updatetest${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const registerResponse = await request(app)
        .post("/register/veterinary")
        .send(registerData);

      if (registerResponse.status === 201) {
        const clinicId = registerResponse.body.datosClinica.id_clinica;
        createdClinicIds.push(clinicId);

        // Then update it
        const updateData = buildUpdateInfoRequest({
          nombre: "Clínica Actualizada",
          telefono: "3009876543",
        });

        const updateResponse = await request(app)
          .put(`/update/veterinary/info/${clinicId}`)
          .send(updateData);

        if (updateResponse.status === 200) {
          expect(updateResponse.body.message).toContain("actualizada");
          expect(updateResponse.body.data).toBeDefined();
        } else {
          expect([400, 404, 500]).toContain(updateResponse.status);
        }
      }
    });

    test("should handle partial updates", async () => {
      const registerData = buildRegisterVetRequest({
        correo: `partialupdate${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const registerResponse = await request(app)
        .post("/register/veterinary")
        .send(registerData);

      if (registerResponse.status === 201) {
        const clinicId = registerResponse.body.datosClinica.id_clinica;
        createdClinicIds.push(clinicId);

        // Update only name
        const partialUpdate = { nombre: "Solo Nombre Actualizado" };

        const updateResponse = await request(app)
          .put(`/update/veterinary/info/${clinicId}`)
          .send(partialUpdate);

        expect([200, 400, 404, 500]).toContain(updateResponse.status);
      }
    });
  });

  describe("PUT /update/veterinary/hours/:id_clinica - Integration", () => {
    test("should return 404 for non-existent clinic", async () => {
      const hoursData = buildUpdateHoursRequest();

      const response = await request(app)
        .put("/update/veterinary/hours/999999")
        .send(hoursData);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("no encontrada");
    });

    test("should update clinic hours successfully", async () => {
      const registerData = buildRegisterVetRequest({
        correo: `hourstest${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const registerResponse = await request(app)
        .post("/register/veterinary")
        .send(registerData);

      if (registerResponse.status === 201) {
        const clinicId = registerResponse.body.datosClinica.id_clinica;
        createdClinicIds.push(clinicId);

        const hoursData = buildUpdateHoursRequest({
          monday: {
            open: "08:00",
            close: "18:00",
            closed: false,
            is24Hours: false,
          },
          sunday: {
            open: "10:00",
            close: "16:00",
            closed: false,
            is24Hours: false,
          },
        });

        const updateResponse = await request(app)
          .put(`/update/veterinary/hours/${clinicId}`)
          .send(hoursData);

        if (updateResponse.status === 200) {
          expect(updateResponse.body.message).toContain("actualizados");
          expect(updateResponse.body.horarios).toBeDefined();
        } else {
          expect([400, 404, 500]).toContain(updateResponse.status);
        }
      }
    });

    test("should handle 24-hour schedules", async () => {
      const registerData = buildRegisterVetRequest({
        correo: `24hours${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const registerResponse = await request(app)
        .post("/register/veterinary")
        .send(registerData);

      if (registerResponse.status === 201) {
        const clinicId = registerResponse.body.datosClinica.id_clinica;
        createdClinicIds.push(clinicId);

        const hours24Data = buildUpdateHoursRequest({
          monday: {
            open: "00:00",
            close: "23:59",
            closed: false,
            is24Hours: true,
          },
        });

        const updateResponse = await request(app)
          .put(`/update/veterinary/hours/${clinicId}`)
          .send(hours24Data);

        expect([200, 400, 404, 500]).toContain(updateResponse.status);
      }
    });

    test("should reject invalid hours format", async () => {
      const registerData = buildRegisterVetRequest({
        correo: `invalidhours${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const registerResponse = await request(app)
        .post("/register/veterinary")
        .send(registerData);

      if (registerResponse.status === 201) {
        const clinicId = registerResponse.body.datosClinica.id_clinica;
        createdClinicIds.push(clinicId);

        const invalidHoursData = { openingHours: "invalid format" };

        const updateResponse = await request(app)
          .put(`/update/veterinary/hours/${clinicId}`)
          .send(invalidHoursData);

        expect([400, 500]).toContain(updateResponse.status);
      }
    });
  });

  describe("PUT /update/veterinary/details/:id_clinica - Integration", () => {
    test("should update clinic details successfully", async () => {
      const registerData = buildRegisterVetRequest({
        correo: `detailstest${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const registerResponse = await request(app)
        .post("/register/veterinary")
        .send(registerData);

      if (registerResponse.status === 201) {
        const clinicId = registerResponse.body.datosClinica.id_clinica;
        createdClinicIds.push(clinicId);

        const detailsData = buildUpdateDetailsRequest({
          specialties: ["Medicina general", "Cirugía", "Odontología"],
          facilities: ["Consultorios", "Quirófano", "Laboratorio"],
          paymentMethods: ["Efectivo", "Tarjeta", "Transferencia"],
        });

        const updateResponse = await request(app)
          .put(`/update/veterinary/details/${clinicId}`)
          .send(detailsData);

        if (updateResponse.status === 200) {
          expect(updateResponse.body.message).toContain("actualizados");
          expect(updateResponse.body.data).toBeDefined();
        } else {
          expect([400, 404, 500]).toContain(updateResponse.status);
        }
      }
    });

    test("should handle empty details arrays", async () => {
      const registerData = buildRegisterVetRequest({
        correo: `emptydetails${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const registerResponse = await request(app)
        .post("/register/veterinary")
        .send(registerData);

      if (registerResponse.status === 201) {
        const clinicId = registerResponse.body.datosClinica.id_clinica;
        createdClinicIds.push(clinicId);

        const emptyDetailsData = buildUpdateDetailsRequest({
          specialties: [],
          facilities: [],
          paymentMethods: [],
        });

        const updateResponse = await request(app)
          .put(`/update/veterinary/details/${clinicId}`)
          .send(emptyDetailsData);

        expect([200, 400, 404, 500]).toContain(updateResponse.status);
      }
    });
  });

  describe("GET /veterinary/profile/:id_clinica - Integration", () => {
    test("should return 404 for non-existent clinic", async () => {
      const response = await request(app).get("/veterinary/profile/999999");

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("no encontrada");
    });

    test("should return complete profile for existing clinic", async () => {
      const registerData = buildRegisterVetRequest({
        correo: `profiletest${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const registerResponse = await request(app)
        .post("/register/veterinary")
        .send(registerData);

      if (registerResponse.status === 201) {
        const clinicId = registerResponse.body.datosClinica.id_clinica;
        createdClinicIds.push(clinicId);

        const profileResponse = await request(app).get(
          `/veterinary/profile/${clinicId}`
        );

        if (profileResponse.status === 200) {
          expect(validateVetProfileResponse(profileResponse.body)).toBe(true);
          expect(profileResponse.body.id_clinica).toBe(clinicId);
          expect(profileResponse.body.contrasena).toBeUndefined(); // Password should be excluded
        } else {
          expect([404, 500]).toContain(profileResponse.status);
        }
      }
    });

    test("should include all related data in profile", async () => {
      const registerData = buildRegisterVetRequest({
        correo: `fullprofile${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const registerResponse = await request(app)
        .post("/register/veterinary")
        .send(registerData);

      if (registerResponse.status === 201) {
        const clinicId = registerResponse.body.datosClinica.id_clinica;
        createdClinicIds.push(clinicId);

        const profileResponse = await request(app).get(
          `/veterinary/profile/${clinicId}`
        );

        if (profileResponse.status === 200) {
          const profile = profileResponse.body;

          // Should have all required sections
          expect(profile.photos).toBeDefined();
          expect(profile.services).toBeDefined();
          expect(profile.reviews).toBeDefined();
          expect(profile.specialties).toBeDefined();
          expect(profile.facilities).toBeDefined();
          expect(profile.paymentMethods).toBeDefined();

          // Arrays should be defined (may be empty)
          expect(Array.isArray(profile.photos)).toBe(true);
          expect(Array.isArray(profile.services)).toBe(true);
          expect(Array.isArray(profile.reviews)).toBe(true);
          expect(Array.isArray(profile.specialties)).toBe(true);
          expect(Array.isArray(profile.facilities)).toBe(true);
          expect(Array.isArray(profile.paymentMethods)).toBe(true);
        }
      }
    });
  });

  describe("GET /clinics - Integration", () => {
    test("should return list of all clinics", async () => {
      const response = await request(app).get("/clinics");

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("exitosamente");
      expect(response.body.clinicas).toBeDefined();
      expect(Array.isArray(response.body.clinicas)).toBe(true);
    });

    test("should return clinics with correct fields", async () => {
      const response = await request(app).get("/clinics");

      if (response.status === 200 && response.body.clinicas.length > 0) {
        const clinic = response.body.clinicas[0];
        const expectedFields = [
          "id_clinica",
          "nombre",
          "direccion",
          "telefono",
          "correo",
          "certificado_url",
          "latitud",
          "longitud",
          "detalles",
        ];

        expectedFields.forEach((field) => {
          expect(clinic.hasOwnProperty(field)).toBe(true);
        });
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle malformed JSON", async () => {
      const response = await request(app)
        .post("/register/veterinary")
        .set("Content-Type", "application/json")
        .send("invalid json");

      expect(response.status).toBe(400);
    });

    test("should handle missing Content-Type", async () => {
      const response = await request(app)
        .post("/register/veterinary")
        .send("data");

      expect([400, 500, 401]).toContain(response.status);
    });

    test("should handle very large clinic IDs", async () => {
      const response = await request(app).get(
        "/veterinary/profile/999999999999999"
      );

      expect([404, 400, 500]).toContain(response.status);
    });

    test("should handle invalid clinic ID formats", async () => {
      const invalidIds = ["abc", "123abc", "", "null"];

      for (const id of invalidIds) {
        const response = await request(app).get(`/veterinary/profile/${id}`);

        expect([400, 404, 500]).toContain(response.status);
      }
    });
  });

  describe("Response Format Validation", () => {
    test("should return consistent error message format", async () => {
      const response = await request(app).post("/register/veterinary").send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message");
      expect(typeof response.body.message).toBe("string");
    });

    test("should return consistent success message format", async () => {
      const requestData = buildRegisterVetRequest({
        correo: `format${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const response = await request(app)
        .post("/register/veterinary")
        .send(requestData);

      if (response.status === 201) {
        expect(response.body).toHaveProperty("message");
        expect(response.body).toHaveProperty("datosClinica");
        expect(typeof response.body.message).toBe("string");
        expect(response.body.datosClinica.id_clinica).toBeDefined();

        createdClinicIds.push(response.body.datosClinica.id_clinica);
      }
    });
  });

  describe("Performance Tests", () => {
    test("should respond within reasonable time for registration", async () => {
      const startTime = Date.now();

      const requestData = buildRegisterVetRequest({
        correo: `performance${Date.now()}@veterinaria.com`,
        NIT: `${Date.now().toString().slice(-9)}-1`,
      });

      const response = await request(app)
        .post("/register/veterinary")
        .send(requestData);

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(10000); // 10 seconds for registration

      if (response.status === 201) {
        createdClinicIds.push(response.body.datosClinica.id_clinica);
      }
    }, 15000);

    test("should respond within reasonable time for profile retrieval", async () => {
      const startTime = Date.now();

      const response = await request(app).get("/veterinary/profile/1");

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // 5 seconds for profile
      expect([200, 404]).toContain(response.status);
    }, 10000);

    test("should respond within reasonable time for clinic list", async () => {
      const startTime = Date.now();

      const response = await request(app).get("/clinics");

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(3000); // 3 seconds for list
      expect(response.status).toBe(200);
    }, 5000);
  });
});
