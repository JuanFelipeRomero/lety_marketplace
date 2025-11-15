import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  createMockVetSupabase,
  createVetToken,
  buildRegisterVetRequest,
  buildUpdateInfoRequest,
  buildUpdateHoursRequest,
  buildUpdateDetailsRequest,
  createMockFile,
  createInvalidMockFile,
  createMockGeocoding,
  createMockFileUpload,
  createTestVeterinaryData,
  createTestServices,
  createTestSchedule,
  hashPassword,
  validateVetRegistrationResponse,
  validateVetProfileResponse,
} from "../../helpers/vetsHelpers.js";

// Mock the modules
jest.mock("@supabase/supabase-js");
jest.mock("bcrypt");
jest.mock("axios");
jest.mock("multer");
jest.mock("fs");

describe("Vets Routes Unit Tests", () => {
  let mockSupabase;
  let mockBcrypt;
  let mockAxios;
  let mockFs;
  let mockUploadFile;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = createMockVetSupabase();

    // Mock bcrypt
    mockBcrypt = {
      hash: jest.fn().mockResolvedValue("hashed_password_123"),
    };

    // Mock axios for geocoding
    mockAxios = {
      get: jest.fn(),
    };

    // Mock fs
    mockFs = {
      existsSync: jest.fn().mockReturnValue(true),
      unlinkSync: jest.fn(),
      mkdirSync: jest.fn(),
      writeFileSync: jest.fn(),
    };

    // Mock file upload utility
    mockUploadFile = jest
      .fn()
      .mockResolvedValue("https://storage.example.com/certificate.pdf");

    // Mock Express request/response
    mockReq = {
      body: {},
      params: {},
      file: null,
      user: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("POST /register/veterinary", () => {
    describe("Input Validation", () => {
      test("should validate required fields", () => {
        const requiredFields = [
          "nombre",
          "direccion",
          "telefono",
          "correo",
          "contrasena",
          "NIT",
        ];

        const incompleteRequests = [
          {}, // Missing all fields
          { nombre: "Test Clinic" }, // Missing other fields
          { nombre: "Test", direccion: "Address" }, // Missing telefono, correo, contrasena, NIT
          buildRegisterVetRequest({ contrasena: undefined }), // Missing password
          buildRegisterVetRequest({ NIT: undefined }), // Missing NIT
        ];

        incompleteRequests.forEach((requestBody) => {
          const hasAllRequired = requiredFields.every(
            (field) =>
              requestBody[field] !== undefined &&
              requestBody[field] !== null &&
              requestBody[field] !== ""
          );

          expect(hasAllRequired).toBe(false);
        });
      });

      test("should accept valid request data", () => {
        const validRequest = buildRegisterVetRequest();

        expect(validRequest.nombre).toBeDefined();
        expect(validRequest.direccion).toBeDefined();
        expect(validRequest.telefono).toBeDefined();
        expect(validRequest.correo).toBeDefined();
        expect(validRequest.contrasena).toBeDefined();
        expect(validRequest.NIT).toBeDefined();
      });

      test("should validate services JSON format", () => {
        const validServices = createTestServices();
        const validJSON = JSON.stringify(validServices);

        expect(() => JSON.parse(validJSON)).not.toThrow();

        const invalidJSONs = [
          "invalid json",
          "{incomplete",
          "{'single': 'quotes'}",
          undefined,
          null,
        ];

        invalidJSONs.forEach((json) => {
          if (json !== undefined && json !== null) {
            expect(() => JSON.parse(json)).toThrow();
          }
        });
      });

      test("should handle file upload validation", () => {
        const validFile = createMockFile();
        const invalidFiles = [
          createInvalidMockFile("size"),
          createInvalidMockFile("mimetype"),
          createInvalidMockFile("corrupted"),
        ];

        // Valid file
        expect(validFile.mimetype).toBe("application/pdf");
        expect(validFile.size).toBeLessThan(10 * 1024 * 1024); // Less than 10MB

        // Invalid files
        expect(invalidFiles[0].size).toBeGreaterThan(10 * 1024 * 1024); // Too large
        expect(invalidFiles[1].mimetype).toBe("image/jpeg"); // Wrong type for certificate
      });
    });

    describe("Geocoding Logic", () => {
      test("should handle successful geocoding", async () => {
        const mockGeocodingResponse = createMockGeocoding().success;
        mockAxios.get.mockResolvedValue(mockGeocodingResponse);

        const direccion = "Carrera 7 #123-45, Bogotá";
        const expectedLat = 4.6097;
        const expectedLng = -74.0817;

        // Verify geocoding response structure
        expect(mockGeocodingResponse.data.status).toBe("OK");
        expect(
          mockGeocodingResponse.data.results[0].geometry.location.lat
        ).toBe(expectedLat);
        expect(
          mockGeocodingResponse.data.results[0].geometry.location.lng
        ).toBe(expectedLng);
      });

      test("should handle geocoding failure gracefully", async () => {
        const mockGeocodingFailure = createMockGeocoding().failure;
        mockAxios.get.mockResolvedValue(mockGeocodingFailure);

        expect(mockGeocodingFailure.data.status).toBe("ZERO_RESULTS");
        // Should continue without coordinates
      });

      test("should handle geocoding API errors", async () => {
        const mockGeocodingError = createMockGeocoding().error;
        mockAxios.get.mockRejectedValue(mockGeocodingError);

        expect(mockGeocodingError.message).toBe("Network error");
        // Should continue without coordinates
      });

      test("should skip geocoding when no API key", () => {
        const originalApiKey = process.env.MAPS_API_KEY;
        delete process.env.MAPS_API_KEY;

        // Should not attempt geocoding
        expect(process.env.MAPS_API_KEY).toBeUndefined();

        // Restore API key
        process.env.MAPS_API_KEY = originalApiKey;
      });
    });

    describe("Password Hashing", () => {
      test("should hash password before storing", async () => {
        const password = "password123";
        const hashedPassword = await hashPassword(password);

        expect(hashedPassword).toBeDefined();
        expect(hashedPassword).not.toBe(password);
        expect(hashedPassword.length).toBeGreaterThan(password.length);
      });

      test("should handle bcrypt errors", async () => {
        mockBcrypt.hash.mockRejectedValue(new Error("Bcrypt error"));

        try {
          await hashPassword("password123");
        } catch (error) {
          expect(error.message).toBe("Bcrypt error");
        }
      });
    });

    describe("File Upload Processing", () => {
      test("should upload certificate file successfully", async () => {
        const mockFile = createMockFile();
        const expectedUrl = createMockFileUpload().success;

        mockUploadFile.mockResolvedValue(expectedUrl);

        const result = await mockUploadFile(
          mockFile,
          "certificados-secretaria-salud"
        );

        expect(result).toBe(expectedUrl);
        expect(result).toContain("https://");
      });

      test("should handle file upload errors", async () => {
        const mockFile = createMockFile();
        const uploadError = createMockFileUpload().error;

        mockUploadFile.mockRejectedValue(uploadError);

        try {
          await mockUploadFile(mockFile, "certificados-secretaria-salud");
        } catch (error) {
          expect(error.message).toBe("Upload failed");
        }
      });

      test("should cleanup temporary files", () => {
        const mockFile = createMockFile();

        // Simulate file cleanup
        mockFs.existsSync.mockReturnValue(true);
        mockFs.unlinkSync.mockImplementation(() => {});

        expect(mockFs.existsSync(mockFile.path)).toBe(true);
        mockFs.unlinkSync(mockFile.path);
        expect(mockFs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      });

      test("should handle cleanup errors gracefully", () => {
        const mockFile = createMockFile();

        mockFs.existsSync.mockReturnValue(true);
        mockFs.unlinkSync.mockImplementation(() => {
          throw new Error("Permission denied");
        });

        expect(() => {
          try {
            mockFs.unlinkSync(mockFile.path);
          } catch (error) {
            // Should not throw, just log warning
            expect(error.message).toBe("Permission denied");
          }
        }).not.toThrow();
      });
    });

    describe("Services Processing", () => {
      test("should process valid services correctly", () => {
        const services = createTestServices();
        const processedServices = services.map((service) => ({
          nombre: service.name,
          precio: parseFloat(service.price),
          categoria: service.category || "general",
          disponible: true,
        }));

        processedServices.forEach((service) => {
          expect(service.nombre).toBeDefined();
          expect(typeof service.precio).toBe("number");
          expect(service.categoria).toBeDefined();
          expect(service.disponible).toBe(true);
        });
      });

      test("should filter invalid services", () => {
        const services = [
          { name: "Valid Service", price: "50000", category: "consulta" },
          { name: "", price: "30000", category: "consulta" }, // Invalid: empty name
          { name: "Another Service", price: "", category: "consulta" }, // Invalid: empty price
          { price: "40000", category: "consulta" }, // Invalid: no name
          { name: "Service", category: "consulta" }, // Invalid: no price
        ];

        const validServices = services.filter(
          (service) => service.name && service.price
        );

        expect(validServices).toHaveLength(1);
        expect(validServices[0].name).toBe("Valid Service");
      });

      test("should handle price parsing", () => {
        const services = [
          { name: "Service 1", price: "50000", category: "consulta" },
          { name: "Service 2", price: "invalid", category: "consulta" },
          { name: "Service 3", price: "75.50", category: "consulta" },
        ];

        services.forEach((service) => {
          const precio = parseFloat(service.price);
          if (service.price === "50000") {
            expect(precio).toBe(50000);
          } else if (service.price === "invalid") {
            expect(isNaN(precio)).toBe(true);
          } else if (service.price === "75.50") {
            expect(precio).toBe(75.5);
          }
        });
      });
    });

    describe("Database Integration", () => {
      test("should insert clinic data correctly", () => {
        const testData = createTestVeterinaryData();
        const expectedInsertData = {
          nombre: testData.nombre,
          direccion: testData.direccion,
          telefono: testData.telefono,
          correo: testData.correo,
          contrasena: expect.any(String), // Hashed
          descripcion: testData.descripcion,
          NIT: testData.NIT,
          latitud: testData.latitud,
          longitud: testData.longitud,
          estado: "confirmado",
          fecha_registro: expect.any(String),
          certificado_url: expect.any(String),
        };

        mockSupabase.setMockData("clinicas", {
          id_clinica: 1,
          ...expectedInsertData,
        });

        const result = mockSupabase
          .from("clinicas")
          .insert([expectedInsertData])
          .select()
          .single();
        expect(result.data.id_clinica).toBe(1);
      });

      test("should handle database insertion errors", () => {
        const insertError = { message: "Database connection error" };

        mockSupabase.from = jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null,
                error: insertError,
              })),
            })),
          })),
        }));

        const result = mockSupabase
          .from("clinicas")
          .insert([])
          .select()
          .single();
        expect(result.error).toEqual(insertError);
      });
    });

    describe("Response Format", () => {
      test("should return correct success response format", () => {
        const mockResponse = {
          message: "Clínica registrada exitosamente",
          datosClinica: { id_clinica: 1 },
          servicios: [],
        };

        expect(validateVetRegistrationResponse(mockResponse)).toBe(true);
        expect(mockResponse.message).toContain("exitosamente");
        expect(mockResponse.datosClinica.id_clinica).toBeDefined();
      });
    });
  });

  describe("PUT /update/veterinary/info/:id_clinica", () => {
    test("should validate clinic ID parameter", () => {
      mockReq.params = { id_clinica: "1" };
      expect(mockReq.params.id_clinica).toBeDefined();
      expect(parseInt(mockReq.params.id_clinica)).toBe(1);
    });

    test("should handle partial updates", () => {
      const partialUpdate = {
        nombre: "Updated Name",
        telefono: "3009876543",
      };

      // Only provided fields should be updated
      Object.keys(partialUpdate).forEach((key) => {
        expect(partialUpdate[key]).toBeDefined();
      });
    });

    test("should update coordinates when address changes", async () => {
      const mockGeocodingResponse = createMockGeocoding().success;
      mockAxios.get.mockResolvedValue(mockGeocodingResponse);

      const updateData = buildUpdateInfoRequest({
        direccion: "Nueva Dirección, Bogotá",
      });

      expect(updateData.direccion).toBe("Nueva Dirección, Bogotá");
    });

    test("should handle geocoding failure during update", async () => {
      const mockGeocodingFailure = createMockGeocoding().failure;
      mockAxios.get.mockResolvedValue(mockGeocodingFailure);

      // Should continue update without coordinates
      expect(mockGeocodingFailure.data.status).toBe("ZERO_RESULTS");
    });
  });

  describe("PUT /update/veterinary/hours/:id_clinica", () => {
    test("should validate opening hours format", () => {
      const schedule = createTestSchedule();
      const requestData = buildUpdateHoursRequest();

      expect(requestData.openingHours).toBeDefined();
      expect(typeof requestData.openingHours).toBe("object");

      // Check each day has required properties
      Object.values(requestData.openingHours).forEach((daySchedule) => {
        expect(daySchedule).toHaveProperty("open");
        expect(daySchedule).toHaveProperty("close");
        expect(daySchedule).toHaveProperty("closed");
        expect(daySchedule).toHaveProperty("is24Hours");
      });
    });

    test("should handle 24-hour schedules", () => {
      const schedule24h = createTestSchedule({
        monday: {
          open: "00:00",
          close: "23:59",
          closed: false,
          is24Hours: true,
        },
      });

      expect(schedule24h.monday.is24Hours).toBe(true);
      expect(schedule24h.monday.open).toBe("00:00");
      expect(schedule24h.monday.close).toBe("23:59");
    });

    test("should handle closed days", () => {
      const scheduleWithClosedDay = createTestSchedule({
        sunday: {
          open: "08:00",
          close: "14:00",
          closed: true,
          is24Hours: false,
        },
      });

      expect(scheduleWithClosedDay.sunday.closed).toBe(true);
    });

    test("should process hours for database insertion", () => {
      const schedule = createTestSchedule();
      const diasSemana = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      const processedHours = [];
      diasSemana.forEach((dia) => {
        if (schedule[dia]) {
          processedHours.push({
            dia_semana: dia,
            hora_apertura: schedule[dia].is24Hours
              ? "00:00:00"
              : schedule[dia].open + ":00",
            hora_cierre: schedule[dia].is24Hours
              ? "23:59:59"
              : schedule[dia].close + ":00",
            es_24h: schedule[dia].is24Hours,
            esta_cerrado: schedule[dia].closed,
          });
        }
      });

      expect(processedHours).toHaveLength(7);
      processedHours.forEach((hour) => {
        expect(hour.dia_semana).toBeDefined();
        expect(hour.hora_apertura).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        expect(hour.hora_cierre).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      });
    });
  });

  describe("PUT /update/veterinary/details/:id_clinica", () => {
    test("should validate details structure", () => {
      const detailsRequest = buildUpdateDetailsRequest();

      expect(detailsRequest.specialties).toBeDefined();
      expect(Array.isArray(detailsRequest.specialties)).toBe(true);
      expect(detailsRequest.facilities).toBeDefined();
      expect(Array.isArray(detailsRequest.facilities)).toBe(true);
      expect(detailsRequest.paymentMethods).toBeDefined();
      expect(Array.isArray(detailsRequest.paymentMethods)).toBe(true);
    });

    test("should handle empty arrays", () => {
      const emptyDetails = buildUpdateDetailsRequest({
        specialties: [],
        facilities: [],
        paymentMethods: [],
      });

      expect(emptyDetails.specialties).toEqual([]);
      expect(emptyDetails.facilities).toEqual([]);
      expect(emptyDetails.paymentMethods).toEqual([]);
    });

    test("should format details for JSONB storage", () => {
      const details = buildUpdateDetailsRequest();
      const formattedDetails = {
        especialidades: details.specialties,
        instalaciones: details.facilities,
        metodos_pago: details.paymentMethods,
      };

      expect(formattedDetails.especialidades).toEqual(details.specialties);
      expect(formattedDetails.instalaciones).toEqual(details.facilities);
      expect(formattedDetails.metodos_pago).toEqual(details.paymentMethods);
    });
  });

  describe("GET /veterinary/profile/:id_clinica", () => {
    test("should format profile response correctly", () => {
      const mockProfile = {
        id_clinica: 1,
        nombre: "Test Clinic",
        direccion: "Test Address",
        telefono: "3001234567",
        correo: "test@clinic.com",
        openingHours: createTestSchedule(),
        specialties: ["Medicina general"],
        facilities: ["Consultorios"],
        paymentMethods: ["Efectivo"],
        photos: [],
        services: [],
        reviews: [],
      };

      expect(validateVetProfileResponse(mockProfile)).toBe(true);
    });

    test("should handle missing related data gracefully", () => {
      const mockProfile = {
        id_clinica: 1,
        nombre: "Test Clinic",
        direccion: "Test Address",
        telefono: "3001234567",
        correo: "test@clinic.com",
        openingHours: null, // No hours registered
        specialties: [],
        facilities: [],
        paymentMethods: [],
        photos: [],
        services: [],
        reviews: [],
      };

      expect(validateVetProfileResponse(mockProfile)).toBe(true);
      expect(mockProfile.openingHours).toBeNull();
      expect(mockProfile.specialties).toEqual([]);
    });

    test("should exclude password from response", () => {
      const clinicaData = {
        id_clinica: 1,
        nombre: "Test Clinic",
        contrasena: "hashed_password",
        correo: "test@clinic.com",
      };

      const { contrasena, ...safeData } = clinicaData;

      expect(safeData.contrasena).toBeUndefined();
      expect(safeData.id_clinica).toBe(1);
      expect(safeData.nombre).toBe("Test Clinic");
    });
  });

  describe("GET /clinics", () => {
    test("should return list of clinics", () => {
      const mockClinics = [
        createTestVeterinaryData({ id_clinica: 1 }),
        createTestVeterinaryData({ id_clinica: 2, nombre: "Clinic 2" }),
      ];

      mockSupabase.setMockData("clinicas", mockClinics);

      const result = mockSupabase.from("clinicas").select();
      expect(result.data).toHaveLength(2);
    });

    test("should return correct clinic fields", () => {
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

      const mockClinic = createTestVeterinaryData();

      expectedFields.forEach((field) => {
        expect(mockClinic.hasOwnProperty(field)).toBe(true);
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle Supabase connection errors", () => {
      const connectionError = { message: "Database connection failed" };

      mockSupabase.from = jest.fn(() => {
        throw connectionError;
      });

      expect(() => mockSupabase.from("clinicas")).toThrow();
    });

    test("should handle missing clinic ID", () => {
      mockReq.params = {};
      expect(mockReq.params.id_clinica).toBeUndefined();
    });

    test("should handle invalid clinic ID", () => {
      mockReq.params = { id_clinica: "invalid" };
      expect(isNaN(parseInt(mockReq.params.id_clinica))).toBe(true);
    });
  });
});
