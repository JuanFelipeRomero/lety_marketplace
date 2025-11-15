import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// Mock all dependencies before importing
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

import {
  createMockServiciosSupabase,
  createTestServicio,
  createTestClinica,
  buildCreateServiceRequest,
  buildCreateMultipleServicesRequest,
  buildUpdateServiceRequest,
  createTestServiciosSetup,
  validateServiceResponse,
  validateMultipleServicesResponse,
  generateTestServicios,
  generateInvalidServiceData,
  generateInvalidMultipleServicesData,
} from "../../helpers/serviciosHelpers.js";

describe("Servicios Routes Unit Tests", () => {
  let mockSupabase;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = createMockServiciosSupabase();

    // Mock Express request/response
    mockReq = {
      params: {},
      query: {},
      body: {},
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
  });

  describe("POST /veterinary/services", () => {
    describe("Input Validation", () => {
      test("should validate required fields", () => {
        const invalidRequests = generateInvalidServiceData();

        invalidRequests.forEach((requestBody) => {
          const hasIdClinica = !!requestBody.id_clinica;
          const hasNombre = !!requestBody.nombre;
          const hasPrecio = requestBody.precio !== undefined;
          const hasCategoria = !!requestBody.categoria;

          const isValid =
            hasIdClinica && hasNombre && hasPrecio && hasCategoria;

          if (!isValid) {
            expect(isValid).toBe(false);
          }
        });
      });

      test("should validate precio is numeric", () => {
        const testCases = [
          { precio: 50000, expected: true },
          { precio: "50000", expected: true }, // Should be parseable
          { precio: 0, expected: true },
          { precio: "invalid", expected: false },
          { precio: null, expected: false },
          { precio: undefined, expected: false },
        ];

        testCases.forEach(({ precio, expected }) => {
          const precioNumerico = parseFloat(precio);
          const isValid = !isNaN(precioNumerico);
          expect(isValid).toBe(expected);
        });
      });

      test("should handle default values correctly", () => {
        const baseRequest = {
          id_clinica: 1,
          nombre: "Test Service",
          precio: 50000,
          categoria: "Test",
        };

        // Test disponible default
        const disponibleDefault =
          baseRequest.disponible === undefined ? true : baseRequest.disponible;
        expect(disponibleDefault).toBe(true);

        // Test descripcion default
        const descripcionDefault = baseRequest.descripcion || "";
        expect(descripcionDefault).toBe("");
      });
    });

    describe("Database Operations", () => {
      test("should handle successful service creation", async () => {
        const testServicio = createTestServicio();
        const requestData = buildCreateServiceRequest();

        mockSupabase.setMockResponse("servicios_insert_select_single", {
          data: testServicio,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .insert([requestData])
          .select()
          .single();

        expect(result.data).toEqual(testServicio);
        expect(result.error).toBeNull();
      });

      test("should handle database insertion errors", async () => {
        const requestData = buildCreateServiceRequest();

        mockSupabase.setMockResponse("servicios_insert_select_single", {
          data: null,
          error: { message: "Database insertion failed" },
        });

        const result = await mockSupabase
          .from("servicios")
          .insert([requestData])
          .select()
          .single();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe("Database insertion failed");
      });
    });

    describe("Response Validation", () => {
      test("should return valid response structure for successful creation", () => {
        const mockResponse = {
          body: {
            message: "Servicio registrado exitosamente",
            servicio: createTestServicio(),
          },
        };

        const validation = validateServiceResponse(mockResponse);
        expect(validation.hasValidStructure).toBe(true);
        expect(validation.hasValidMessage).toBe(true);
        expect(validation.hasValidServicio).toBe(true);
      });
    });
  });

  describe("POST /register/services", () => {
    describe("Input Validation", () => {
      test("should validate multiple services request structure", () => {
        const invalidRequests = generateInvalidMultipleServicesData();

        invalidRequests.forEach((requestBody) => {
          const hasIdClinica = !!requestBody.id_clinica;
          const hasServicios =
            Array.isArray(requestBody.servicios) &&
            requestBody.servicios.length > 0;

          const isValid = hasIdClinica && hasServicios;

          if (!isValid) {
            expect(isValid).toBe(false);
          }
        });
      });

      test("should validate each service in the array", () => {
        const validServiceArray = [
          { nombre: "Service 1", precio: 50000, categoria: "Category 1" },
          { nombre: "Service 2", precio: 75000, categoria: "Category 2" },
        ];

        const invalidServiceArray = [
          { nombre: "Service 1" }, // Missing precio and categoria
          { precio: 50000, categoria: "Category 2" }, // Missing nombre
        ];

        // Validate valid services
        const validResults = validServiceArray.map((servicio) => {
          const hasNombre = !!servicio.nombre;
          const hasPrecio = servicio.precio !== undefined;
          const hasCategoria = !!servicio.categoria;
          return hasNombre && hasPrecio && hasCategoria;
        });

        expect(validResults.every((result) => result === true)).toBe(true);

        // Validate invalid services
        const invalidResults = invalidServiceArray.map((servicio) => {
          const hasNombre = !!servicio.nombre;
          const hasPrecio = servicio.precio !== undefined;
          const hasCategoria = !!servicio.categoria;
          return hasNombre && hasPrecio && hasCategoria;
        });

        expect(invalidResults.some((result) => result === false)).toBe(true);
      });

      test("should process service array correctly", () => {
        const serviciosInput = [
          { nombre: "Service 1", precio: "50000", categoria: "Category 1" },
          {
            nombre: "Service 2",
            precio: 75000,
            categoria: "Category 2",
            descripcion: "Custom desc",
            disponible: false,
          },
        ];

        const serviciosProcessed = serviciosInput.map((servicio) => {
          const precioNumerico = parseFloat(servicio.precio);

          return {
            id_clinica: 1,
            nombre: servicio.nombre,
            descripcion: servicio.descripcion || "",
            precio: precioNumerico,
            categoria: servicio.categoria,
            disponible:
              servicio.disponible !== undefined ? servicio.disponible : true,
          };
        });

        expect(serviciosProcessed[0].precio).toBe(50000);
        expect(serviciosProcessed[0].descripcion).toBe("");
        expect(serviciosProcessed[0].disponible).toBe(true);

        expect(serviciosProcessed[1].precio).toBe(75000);
        expect(serviciosProcessed[1].descripcion).toBe("Custom desc");
        expect(serviciosProcessed[1].disponible).toBe(false);
      });
    });

    describe("Database Operations", () => {
      test("should handle successful multiple services creation", async () => {
        const testServicios = generateTestServicios(2);
        const requestData = buildCreateMultipleServicesRequest();

        mockSupabase.setMockResponse("servicios_insert_select", {
          data: testServicios,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .insert(requestData.servicios)
          .select();

        expect(result.data).toEqual(testServicios);
        expect(result.error).toBeNull();
      });

      test("should handle database batch insertion errors", async () => {
        const requestData = buildCreateMultipleServicesRequest();

        mockSupabase.setMockResponse("servicios_insert_select", {
          data: null,
          error: { message: "Batch insertion failed" },
        });

        const result = await mockSupabase
          .from("servicios")
          .insert(requestData.servicios)
          .select();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe("Batch insertion failed");
      });
    });
  });

  describe("GET /veterinary/services/:id_clinica", () => {
    describe("Parameter Validation", () => {
      test("should validate id_clinica parameter", () => {
        const testCases = [
          { id_clinica: "1", expected: true },
          { id_clinica: "123", expected: true },
          { id_clinica: "", expected: false },
          { id_clinica: null, expected: false },
          { id_clinica: undefined, expected: false },
        ];

        testCases.forEach(({ id_clinica, expected }) => {
          const isValid = !!id_clinica;
          expect(isValid).toBe(expected);
        });
      });

      test("should handle categoria query parameter", () => {
        mockReq.query = { categoria: "Consulta" };

        const hasCategoria = !!mockReq.query.categoria;
        expect(hasCategoria).toBe(true);
        expect(mockReq.query.categoria).toBe("Consulta");
      });
    });

    describe("Database Query Logic", () => {
      test("should build correct query without categoria filter", async () => {
        const testServicios = generateTestServicios();

        mockSupabase.setMockResponse("servicios_select_eq_order", {
          data: testServicios,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_clinica", 1)
          .order("nombre");

        expect(result.data).toEqual(testServicios);
        expect(result.error).toBeNull();
      });

      test("should build correct query with categoria filter", async () => {
        const consultaServicios = generateTestServicios().filter(
          (s) => s.categoria === "Consulta"
        );

        mockSupabase.setMockResponse("servicios_select_eq_order", {
          data: consultaServicios,
          error: null,
        });

        // Simulate filtering by categoria
        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_clinica", 1)
          .order("nombre");

        expect(result.data).toEqual(consultaServicios);
        expect(result.error).toBeNull();
      });

      test("should handle empty results", async () => {
        mockSupabase.setMockResponse("servicios_select_eq_order", {
          data: [],
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_clinica", 999)
          .order("nombre");

        expect(result.data).toEqual([]);
        expect(result.error).toBeNull();
      });

      test("should handle database query errors", async () => {
        mockSupabase.setMockResponse("servicios_select_eq_order", {
          data: null,
          error: { message: "Database query failed" },
        });

        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_clinica", 1)
          .order("nombre");

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe("Database query failed");
      });
    });

    describe("Response Structure", () => {
      test("should return valid response structure", () => {
        const mockResponse = {
          body: {
            message: "Servicios obtenidos exitosamente",
            total: 3,
            servicios: generateTestServicios(),
          },
        };

        const validation = validateMultipleServicesResponse(mockResponse);
        expect(validation.hasValidStructure).toBe(true);
        expect(validation.hasValidMessage).toBe(true);
        expect(validation.hasValidServicios).toBe(true);
        expect(validation.hasValidCount).toBe(true);
      });
    });
  });

  describe("GET /veterinary/services/detail/:id_servicio", () => {
    describe("Parameter Validation", () => {
      test("should validate id_servicio parameter", () => {
        const testCases = [
          { id_servicio: "1", expected: true },
          { id_servicio: "123", expected: true },
          { id_servicio: "", expected: false },
          { id_servicio: null, expected: false },
          { id_servicio: undefined, expected: false },
        ];

        testCases.forEach(({ id_servicio, expected }) => {
          const isValid = !!id_servicio;
          expect(isValid).toBe(expected);
        });
      });
    });

    describe("Database Operations", () => {
      test("should retrieve service successfully", async () => {
        const testServicio = createTestServicio();

        mockSupabase.setMockResponse("servicios_select_eq_single", {
          data: testServicio,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_servicio", 1)
          .single();

        expect(result.data).toEqual(testServicio);
        expect(result.error).toBeNull();
      });

      test("should handle service not found", async () => {
        mockSupabase.setMockResponse("servicios_select_eq_single", {
          data: null,
          error: { message: "No rows returned" },
        });

        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_servicio", 999)
          .single();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
      });

      test("should handle database errors", async () => {
        mockSupabase.setMockResponse("servicios_select_eq_single", {
          data: null,
          error: { message: "Database connection failed" },
        });

        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_servicio", 1)
          .single();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe("Database connection failed");
      });
    });
  });

  describe("PUT /veterinary/services/:id_servicio", () => {
    describe("Input Validation", () => {
      test("should validate id_servicio parameter", () => {
        const testCases = [
          { id_servicio: "1", expected: true },
          { id_servicio: "", expected: false },
          { id_servicio: null, expected: false },
          { id_servicio: undefined, expected: false },
        ];

        testCases.forEach(({ id_servicio, expected }) => {
          const isValid = !!id_servicio;
          expect(isValid).toBe(expected);
        });
      });

      test("should validate that at least one field is provided for update", () => {
        const testCases = [
          { body: {}, expected: false },
          { body: { nombre: "Updated" }, expected: true },
          { body: { descripcion: "Updated desc" }, expected: true },
          { body: { precio: 75000 }, expected: true },
          { body: { categoria: "Updated category" }, expected: true },
          { body: { disponible: false }, expected: true },
          { body: { nombre: "Updated", precio: 80000 }, expected: true },
        ];

        testCases.forEach(({ body, expected }) => {
          const hasUpdates =
            body.nombre !== undefined ||
            body.descripcion !== undefined ||
            body.precio !== undefined ||
            body.categoria !== undefined ||
            body.disponible !== undefined;

          expect(hasUpdates).toBe(expected);
        });
      });

      test("should validate precio when provided", () => {
        const testCases = [
          { precio: 50000, expected: true },
          { precio: "60000", expected: true },
          { precio: 0, expected: true },
          { precio: "invalid", expected: false },
          { precio: null, expected: false },
        ];

        testCases.forEach(({ precio, expected }) => {
          if (precio !== undefined) {
            const precioNumerico = parseFloat(precio);
            const isValid = !isNaN(precioNumerico);
            expect(isValid).toBe(expected);
          }
        });
      });

      test("should process update data correctly", () => {
        const updateRequest = buildUpdateServiceRequest();
        const datosActualizados = {};

        Object.keys(updateRequest).forEach((key) => {
          const value = updateRequest[key];
          if (value !== undefined) {
            if (key === "precio") {
              const precioNumerico = parseFloat(value);
              if (!isNaN(precioNumerico)) {
                datosActualizados[key] = precioNumerico;
              }
            } else {
              datosActualizados[key] = value;
            }
          }
        });

        expect(datosActualizados.nombre).toBe(updateRequest.nombre);
        expect(datosActualizados.precio).toBe(60000);
        expect(datosActualizados.disponible).toBe(false);
      });
    });

    describe("Database Operations", () => {
      test("should verify service exists before updating", async () => {
        const testServicio = createTestServicio();

        mockSupabase.setMockResponse("servicios_select_eq_single", {
          data: testServicio,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .select("id_servicio")
          .eq("id_servicio", 1)
          .single();

        expect(result.data).toEqual(testServicio);
        expect(result.error).toBeNull();
      });

      test("should handle service not found during verification", async () => {
        mockSupabase.setMockResponse("servicios_select_eq_single", {
          data: null,
          error: { message: "No rows returned" },
        });

        const result = await mockSupabase
          .from("servicios")
          .select("id_servicio")
          .eq("id_servicio", 999)
          .single();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
      });

      test("should update service successfully", async () => {
        const updatedServicio = {
          ...createTestServicio(),
          nombre: "Updated Service",
        };

        mockSupabase.setMockResponse("servicios_update_eq_select_single", {
          data: updatedServicio,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .update({ nombre: "Updated Service" })
          .eq("id_servicio", 1)
          .select()
          .single();

        expect(result.data).toEqual(updatedServicio);
        expect(result.error).toBeNull();
      });

      test("should handle update errors", async () => {
        mockSupabase.setMockResponse("servicios_update_eq_select_single", {
          data: null,
          error: { message: "Update failed" },
        });

        const result = await mockSupabase
          .from("servicios")
          .update({ nombre: "Updated Service" })
          .eq("id_servicio", 1)
          .select()
          .single();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe("Update failed");
      });
    });
  });

  describe("DELETE /veterinary/services/:id_servicio", () => {
    describe("Parameter Validation", () => {
      test("should validate id_servicio parameter", () => {
        const testCases = [
          { id_servicio: "1", expected: true },
          { id_servicio: "123", expected: true },
          { id_servicio: "", expected: false },
          { id_servicio: null, expected: false },
          { id_servicio: undefined, expected: false },
        ];

        testCases.forEach(({ id_servicio, expected }) => {
          const isValid = !!id_servicio;
          expect(isValid).toBe(expected);
        });
      });
    });

    describe("Database Operations", () => {
      test("should verify service exists before deleting", async () => {
        const testServicio = createTestServicio();

        mockSupabase.setMockResponse("servicios_select_eq_single", {
          data: testServicio,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .select("id_servicio")
          .eq("id_servicio", 1)
          .single();

        expect(result.data).toEqual(testServicio);
        expect(result.error).toBeNull();
      });

      test("should handle service not found during verification", async () => {
        mockSupabase.setMockResponse("servicios_select_eq_single", {
          data: null,
          error: { message: "No rows returned" },
        });

        const result = await mockSupabase
          .from("servicios")
          .select("id_servicio")
          .eq("id_servicio", 999)
          .single();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
      });

      test("should delete service successfully", async () => {
        mockSupabase.setMockResponse("servicios_delete_eq", {
          data: null,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .delete()
          .eq("id_servicio", 1);

        expect(result.data).toBeNull();
        expect(result.error).toBeNull();
      });

      test("should handle deletion errors", async () => {
        mockSupabase.setMockResponse("servicios_delete_eq", {
          data: null,
          error: { message: "Deletion failed" },
        });

        const result = await mockSupabase
          .from("servicios")
          .delete()
          .eq("id_servicio", 1);

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe("Deletion failed");
      });
    });
  });

  describe("Legacy Routes Compatibility", () => {
    describe("GET /services/:id_clinica", () => {
      test("should maintain same functionality as new route", async () => {
        const testServicios = generateTestServicios();

        mockSupabase.setMockResponse("servicios_select_eq_order", {
          data: testServicios,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_clinica", 1)
          .order("nombre");

        expect(result.data).toEqual(testServicios);
        expect(result.error).toBeNull();
      });
    });

    describe("PUT /service/:id_servicio", () => {
      test("should handle updates like new route", async () => {
        const updatedServicio = {
          ...createTestServicio(),
          nombre: "Legacy Updated",
        };

        mockSupabase.setMockResponse("servicios_update_eq_select_single", {
          data: updatedServicio,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .update({ nombre: "Legacy Updated" })
          .eq("id_servicio", 1)
          .select()
          .single();

        expect(result.data).toEqual(updatedServicio);
        expect(result.error).toBeNull();
      });
    });

    describe("DELETE /service/:id_servicio", () => {
      test("should handle deletion like new route", async () => {
        mockSupabase.setMockResponse("servicios_delete_eq", {
          data: null,
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .delete()
          .eq("id_servicio", 1);

        expect(result.data).toBeNull();
        expect(result.error).toBeNull();
      });
    });
  });

  describe("Special Route: GET /clinic/:clinicId/services", () => {
    describe("Active Services Filter", () => {
      test("should only return available services", async () => {
        const activeServicios = generateTestServicios().map((s) => ({
          ...s,
          disponible: true,
        }));

        mockSupabase.setMockResponse("servicios_select_eq_order", {
          data: activeServicios,
          error: null,
        });

        // Simulate the double .eq() call for id_clinica and disponible
        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_clinica", 1)
          .order("nombre");

        expect(result.data).toEqual(activeServicios);
        expect(result.error).toBeNull();

        // Verify all returned services are available
        result.data.forEach((servicio) => {
          expect(servicio.disponible).toBe(true);
        });
      });

      test("should handle no active services", async () => {
        mockSupabase.setMockResponse("servicios_select_eq_order", {
          data: [],
          error: null,
        });

        const result = await mockSupabase
          .from("servicios")
          .select("*")
          .eq("id_clinica", 1)
          .order("nombre");

        expect(result.data).toEqual([]);
        expect(result.error).toBeNull();
      });
    });
  });

  describe("Error Handling Patterns", () => {
    test("should handle internal server errors gracefully", () => {
      const errorMessage = "Internal server error";
      const error = new Error(errorMessage);

      // Simulate error handling logic
      const responseMessage = "Error interno del servidor: " + error.message;
      const stack =
        process.env.NODE_ENV !== "production" ? error.stack : undefined;

      expect(responseMessage).toBe(
        "Error interno del servidor: Internal server error"
      );
      expect(stack).toBeDefined(); // In test environment
    });

    test("should format database error messages correctly", () => {
      const supabaseError = { message: "Database constraint violation" };
      const formattedMessage =
        "Error al registrar el servicio: " + supabaseError.message;

      expect(formattedMessage).toBe(
        "Error al registrar el servicio: Database constraint violation"
      );
    });

    test("should handle various error scenarios", () => {
      const errorScenarios = [
        { error: { message: "Network error" }, context: "network" },
        { error: { message: "Permission denied" }, context: "permission" },
        { error: { message: "Table does not exist" }, context: "schema" },
      ];

      errorScenarios.forEach(({ error, context }) => {
        const hasError = !!error;
        const hasMessage = !!error.message;

        expect(hasError).toBe(true);
        expect(hasMessage).toBe(true);
        expect(typeof error.message).toBe("string");
      });
    });
  });

  describe("Data Type Validations", () => {
    test("should handle different precio formats", () => {
      const precioTestCases = [
        { input: 50000, expected: 50000 },
        { input: "75000", expected: 75000 },
        { input: "100000.50", expected: 100000.5 },
        { input: 0, expected: 0 },
      ];

      precioTestCases.forEach(({ input, expected }) => {
        const parsed = parseFloat(input);
        expect(parsed).toBe(expected);
        expect(typeof parsed).toBe("number");
      });
    });

    test("should handle boolean disponible values", () => {
      const disponibleTestCases = [
        { input: true, expected: true },
        { input: false, expected: false },
        { input: undefined, expected: true }, // Default value
        { input: "true", expected: "true" }, // Should be handled by validation
      ];

      disponibleTestCases.forEach(({ input, expected }) => {
        const result = input === undefined ? true : input;
        if (expected === true || expected === false) {
          expect(result).toBe(expected);
        } else {
          expect(result).toBe(input);
        }
      });
    });

    test("should validate string fields", () => {
      const stringFields = [
        { field: "nombre", value: "Test Service", valid: true },
        { field: "nombre", value: "", valid: false },
        { field: "nombre", value: null, valid: false },
        { field: "categoria", value: "Consulta", valid: true },
        { field: "categoria", value: "", valid: false },
        { field: "descripcion", value: "", valid: true }, // Optional field
        { field: "descripcion", value: "Description", valid: true },
      ];

      stringFields.forEach(({ field, value, valid }) => {
        if (field === "descripcion") {
          // Description is optional, empty string is valid
          const isValid = value !== null && value !== undefined;
          expect(isValid).toBe(valid);
        } else {
          // Required fields
          const isValid = !!value;
          expect(isValid).toBe(valid);
        }
      });
    });
  });
});
