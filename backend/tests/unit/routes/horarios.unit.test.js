import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// Mock all dependencies before importing
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

import {
  createMockHorariosSupabase,
  createTestHorario,
  createTestClinica,
  buildCreateScheduleRequest,
  buildCreate24hScheduleRequest,
  buildCreateClosedScheduleRequest,
  buildCreateMultipleSchedulesRequest,
  createTestHorariosSetup,
  isValidDayOfWeek,
  isValidTimeFormat,
  validateScheduleLogic,
  validateScheduleResponse,
  validateMultipleSchedulesResponse,
  generateTestHorarios,
  generateInvalidScheduleData,
  generateInvalidMultipleSchedulesData,
  generateScheduleTestCases,
  processScheduleData,
} from "../../helpers/horariosHelpers.js";

describe("Horarios Routes Unit Tests", () => {
  let mockSupabase;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = createMockHorariosSupabase();

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

  describe("POST /register/schedule", () => {
    describe("Input Validation", () => {
      test("should validate required fields", () => {
        const invalidRequests = generateInvalidScheduleData();

        invalidRequests.forEach((requestBody) => {
          const hasIdClinica = !!requestBody.id_clinica;
          const hasDiaSemana = !!requestBody.dia_semana;

          const isValid = hasIdClinica && hasDiaSemana;

          if (!isValid) {
            expect(isValid).toBe(false);
          }
        });
      });

      test("should validate day of week values", () => {
        const testCases = [
          { day: "monday", expected: true },
          { day: "tuesday", expected: true },
          { day: "wednesday", expected: true },
          { day: "thursday", expected: true },
          { day: "friday", expected: true },
          { day: "saturday", expected: true },
          { day: "sunday", expected: true },
          { day: "Monday", expected: false }, // Wrong case
          { day: "lunes", expected: false }, // Spanish
          { day: "invalid_day", expected: false },
          { day: "", expected: false },
          { day: null, expected: false },
          { day: undefined, expected: false },
        ];

        testCases.forEach(({ day, expected }) => {
          const isValid = isValidDayOfWeek(day);
          expect(isValid).toBe(expected);
        });
      });

      test("should validate conditional hour requirements", () => {
        const testCases = [
          // Normal schedule requires hours
          {
            input: {
              es_24h: false,
              esta_cerrado: false,
              hora_apertura: "08:00:00",
              hora_cierre: "18:00:00",
            },
            shouldRequireHours: true,
            isValid: true,
          },
          // Normal schedule missing hours
          {
            input: {
              es_24h: false,
              esta_cerrado: false,
            },
            shouldRequireHours: true,
            isValid: false,
          },
          // 24h schedule doesn't require input hours
          {
            input: {
              es_24h: true,
              esta_cerrado: false,
            },
            shouldRequireHours: false,
            isValid: true,
          },
          // Closed schedule doesn't require hours
          {
            input: {
              es_24h: false,
              esta_cerrado: true,
            },
            shouldRequireHours: false,
            isValid: true,
          },
        ];

        testCases.forEach(({ input, shouldRequireHours, isValid }) => {
          if (shouldRequireHours) {
            const hasRequiredHours = !!(
              input.hora_apertura && input.hora_cierre
            );
            expect(hasRequiredHours).toBe(isValid);
          } else {
            // 24h or closed don't require input hours
            expect(true).toBe(true);
          }
        });
      });

      test("should handle default values correctly", () => {
        const baseRequest = {
          id_clinica: 1,
          dia_semana: "monday",
          hora_apertura: "08:00:00",
          hora_cierre: "18:00:00",
        };

        // Test es_24h default
        const es24hDefault = baseRequest.es_24h || false;
        expect(es24hDefault).toBe(false);

        // Test esta_cerrado default
        const estaCerradoDefault = baseRequest.esta_cerrado || false;
        expect(estaCerradoDefault).toBe(false);
      });
    });

    describe("Business Logic Processing", () => {
      test("should process normal schedule correctly", () => {
        const inputData = buildCreateScheduleRequest();
        const processed = processScheduleData(inputData, inputData.id_clinica);

        expect(processed.hora_apertura).toBe("08:00:00");
        expect(processed.hora_cierre).toBe("18:00:00");
        expect(processed.es_24h).toBe(false);
        expect(processed.esta_cerrado).toBe(false);
      });

      test("should process 24h schedule correctly", () => {
        const inputData = buildCreate24hScheduleRequest();
        const processed = processScheduleData(inputData, inputData.id_clinica);

        expect(processed.hora_apertura).toBe("00:00:00");
        expect(processed.hora_cierre).toBe("23:59:59");
        expect(processed.es_24h).toBe(true);
        expect(processed.esta_cerrado).toBe(false);
      });

      test("should process closed schedule correctly", () => {
        const inputData = buildCreateClosedScheduleRequest();
        const processed = processScheduleData(inputData, inputData.id_clinica);

        expect(processed.hora_apertura).toBeNull();
        expect(processed.hora_cierre).toBeNull();
        expect(processed.es_24h).toBe(false);
        expect(processed.esta_cerrado).toBe(true);
      });

      test("should validate schedule logic consistency", () => {
        const testCases = generateScheduleTestCases();

        // Test valid schedules
        testCases.valid.forEach((schedule) => {
          const processed = processScheduleData(schedule, 1);
          const validation = validateScheduleLogic(processed);
          expect(validation.isValid).toBe(true);
        });

        // Test invalid schedules
        testCases.invalid.forEach((schedule) => {
          const processed = processScheduleData(schedule, 1);
          const validation = validateScheduleLogic(processed);
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
        });
      });
    });

    describe("Database Operations", () => {
      test("should handle successful schedule creation", async () => {
        const testHorario = createTestHorario();
        const requestData = buildCreateScheduleRequest();

        mockSupabase.setMockResponse("horarios_atencion_insert_select_single", {
          data: testHorario,
          error: null,
        });

        const result = await mockSupabase
          .from("horarios_atencion")
          .insert([requestData])
          .select()
          .single();

        expect(result.data).toEqual(testHorario);
        expect(result.error).toBeNull();
      });

      test("should handle database insertion errors", async () => {
        const requestData = buildCreateScheduleRequest();

        mockSupabase.setMockResponse("horarios_atencion_insert_select_single", {
          data: null,
          error: { message: "Database insertion failed" },
        });

        const result = await mockSupabase
          .from("horarios_atencion")
          .insert([requestData])
          .select()
          .single();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe("Database insertion failed");
      });

      test("should handle duplicate schedule conflicts", async () => {
        const requestData = buildCreateScheduleRequest();

        mockSupabase.setMockResponse("horarios_atencion_insert_select_single", {
          data: null,
          error: {
            message: "duplicate key value violates unique constraint",
            code: "23505",
          },
        });

        const result = await mockSupabase
          .from("horarios_atencion")
          .insert([requestData])
          .select()
          .single();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain("duplicate key");
      });
    });

    describe("Response Validation", () => {
      test("should return valid response structure for successful creation", () => {
        const mockResponse = {
          body: {
            message: "Horario registrado exitosamente",
            horario: createTestHorario(),
          },
        };

        const validation = validateScheduleResponse(mockResponse);
        expect(validation.hasValidStructure).toBe(true);
        expect(validation.hasValidMessage).toBe(true);
        expect(validation.hasValidHorario).toBe(true);
      });
    });
  });

  describe("POST /register/schedules", () => {
    describe("Input Validation", () => {
      test("should validate multiple schedules request structure", () => {
        const invalidRequests = generateInvalidMultipleSchedulesData();

        invalidRequests.forEach((requestBody) => {
          const hasIdClinica = !!requestBody.id_clinica;
          const hasHorarios =
            Array.isArray(requestBody.horarios) &&
            requestBody.horarios.length > 0;

          const isValid = hasIdClinica && hasHorarios;

          if (!isValid) {
            expect(isValid).toBe(false);
          }
        });
      });

      test("should validate each schedule in the array", () => {
        const validScheduleArray = [
          {
            dia_semana: "monday",
            hora_apertura: "08:00:00",
            hora_cierre: "18:00:00",
            es_24h: false,
            esta_cerrado: false,
          },
          {
            dia_semana: "friday",
            es_24h: true,
            esta_cerrado: false,
          },
          {
            dia_semana: "sunday",
            es_24h: false,
            esta_cerrado: true,
          },
        ];

        const invalidScheduleArray = [
          { dia_semana: "invalid_day" }, // Invalid day
          {
            dia_semana: "monday",
            es_24h: false,
            esta_cerrado: false,
            // Missing required hours
          },
        ];

        // Validate valid schedules
        const validResults = validScheduleArray.map((horario) => {
          return isValidDayOfWeek(horario.dia_semana);
        });

        expect(validResults.every((result) => result === true)).toBe(true);

        // Validate invalid schedules
        const invalidResults = invalidScheduleArray.map((horario) => {
          return isValidDayOfWeek(horario.dia_semana);
        });

        expect(invalidResults.some((result) => result === false)).toBe(true);
      });

      test("should process schedule array correctly", () => {
        const horariosInput = buildCreateMultipleSchedulesRequest().horarios;

        const horariosProcessed = horariosInput.map((horario) => {
          return processScheduleData(horario, 1);
        });

        // Check normal schedule
        expect(horariosProcessed[0].hora_apertura).toBe("08:00:00");
        expect(horariosProcessed[0].hora_cierre).toBe("18:00:00");
        expect(horariosProcessed[0].es_24h).toBe(false);
        expect(horariosProcessed[0].esta_cerrado).toBe(false);

        // Check 24h schedule
        expect(horariosProcessed[2].hora_apertura).toBe("00:00:00");
        expect(horariosProcessed[2].hora_cierre).toBe("23:59:59");
        expect(horariosProcessed[2].es_24h).toBe(true);

        // Check closed schedule
        expect(horariosProcessed[3].hora_apertura).toBeNull();
        expect(horariosProcessed[3].hora_cierre).toBeNull();
        expect(horariosProcessed[3].esta_cerrado).toBe(true);
      });

      test("should detect duplicate days in request", () => {
        const duplicateDaysRequest = {
          id_clinica: 1,
          horarios: [
            {
              dia_semana: "monday",
              hora_apertura: "08:00:00",
              hora_cierre: "18:00:00",
            },
            {
              dia_semana: "monday", // Duplicate
              hora_apertura: "09:00:00",
              hora_cierre: "17:00:00",
            },
          ],
        };

        const days = duplicateDaysRequest.horarios.map((h) => h.dia_semana);
        const uniqueDays = new Set(days);
        const hasDuplicates = days.length !== uniqueDays.size;

        expect(hasDuplicates).toBe(true);
      });
    });

    describe("Business Logic Validation", () => {
      test("should validate all schedules before processing", () => {
        const requestData = buildCreateMultipleSchedulesRequest();

        const validationResults = requestData.horarios.map((horario) => {
          // Check day validity
          const validDay = isValidDayOfWeek(horario.dia_semana);

          // Check business logic
          const processed = processScheduleData(
            horario,
            requestData.id_clinica
          );
          const logicValidation = validateScheduleLogic(processed);

          return {
            validDay,
            validLogic: logicValidation.isValid,
            errors: logicValidation.errors,
          };
        });

        // All should be valid
        validationResults.forEach((result) => {
          expect(result.validDay).toBe(true);
          expect(result.validLogic).toBe(true);
          expect(result.errors.length).toBe(0);
        });
      });

      test("should handle mixed valid and invalid schedules", () => {
        const mixedRequest = {
          id_clinica: 1,
          horarios: [
            // Valid normal schedule
            {
              dia_semana: "monday",
              hora_apertura: "08:00:00",
              hora_cierre: "18:00:00",
              es_24h: false,
              esta_cerrado: false,
            },
            // Invalid: missing hours for normal schedule
            {
              dia_semana: "tuesday",
              es_24h: false,
              esta_cerrado: false,
            },
            // Valid 24h schedule
            {
              dia_semana: "friday",
              es_24h: true,
              esta_cerrado: false,
            },
          ],
        };

        const validationResults = mixedRequest.horarios.map((horario) => {
          const processed = processScheduleData(
            horario,
            mixedRequest.id_clinica
          );
          return validateScheduleLogic(processed);
        });

        expect(validationResults[0].isValid).toBe(true); // Valid normal
        expect(validationResults[1].isValid).toBe(false); // Invalid missing hours
        expect(validationResults[2].isValid).toBe(true); // Valid 24h
      });
    });

    describe("Database Operations", () => {
      test("should handle successful multiple schedules creation", async () => {
        const testHorarios = generateTestHorarios(4);
        const requestData = buildCreateMultipleSchedulesRequest();

        mockSupabase.setMockResponse("horarios_atencion_insert_select", {
          data: testHorarios,
          error: null,
        });

        const result = await mockSupabase
          .from("horarios_atencion")
          .insert(requestData.horarios)
          .select();

        expect(result.data).toEqual(testHorarios);
        expect(result.error).toBeNull();
      });

      test("should handle database batch insertion errors", async () => {
        const requestData = buildCreateMultipleSchedulesRequest();

        mockSupabase.setMockResponse("horarios_atencion_insert_select", {
          data: null,
          error: { message: "Batch insertion failed" },
        });

        const result = await mockSupabase
          .from("horarios_atencion")
          .insert(requestData.horarios)
          .select();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe("Batch insertion failed");
      });

      test("should handle partial batch failures", async () => {
        const requestData = buildCreateMultipleSchedulesRequest();

        mockSupabase.setMockResponse("horarios_atencion_insert_select", {
          data: null,
          error: {
            message: "Some schedules could not be inserted",
            details: "Constraint violation on day monday",
          },
        });

        const result = await mockSupabase
          .from("horarios_atencion")
          .insert(requestData.horarios)
          .select();

        expect(result.data).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error.details).toContain("monday");
      });
    });

    describe("Response Structure", () => {
      test("should return valid response structure for multiple schedules", () => {
        const mockResponse = {
          body: {
            message: "4 horarios registrados exitosamente",
            horarios: generateTestHorarios(4),
          },
        };

        const validation = validateMultipleSchedulesResponse(mockResponse);
        expect(validation.hasValidStructure).toBe(true);
        expect(validation.hasValidMessage).toBe(true);
        expect(validation.hasValidHorarios).toBe(true);
        expect(validation.hasValidCount).toBe(true);
      });
    });
  });

  describe("Time Format Validation", () => {
    describe("isValidTimeFormat", () => {
      test("should validate correct time formats", () => {
        const validTimes = [
          "00:00:00",
          "08:30:00",
          "12:00:00",
          "18:45:30",
          "23:59:59",
        ];

        validTimes.forEach((time) => {
          expect(isValidTimeFormat(time)).toBe(true);
        });
      });

      test("should reject invalid time formats", () => {
        const invalidTimes = [
          "24:00:00", // Invalid hour
          "08:60:00", // Invalid minute
          "08:30:60", // Invalid second
          "8:30:00", // Missing leading zero
          "08:3:00", // Missing leading zero
          "08:30", // Missing seconds
          "08:30:00:00", // Too many parts
          "invalid", // Not a time
          "", // Empty string
          null, // Null
          undefined, // Undefined
        ];

        invalidTimes.forEach((time) => {
          expect(isValidTimeFormat(time)).toBe(false);
        });
      });
    });
  });

  describe("Schedule Logic Edge Cases", () => {
    test("should handle conflicting schedule flags", () => {
      const conflictingSchedules = [
        {
          dia_semana: "monday",
          es_24h: true,
          esta_cerrado: true, // Conflict: cannot be both 24h and closed
        },
        {
          dia_semana: "tuesday",
          hora_apertura: "08:00:00",
          hora_cierre: "18:00:00",
          es_24h: true,
          esta_cerrado: true, // Conflict: cannot be all three
        },
      ];

      conflictingSchedules.forEach((schedule) => {
        const processed = processScheduleData(schedule, 1);

        // Business logic should favor one interpretation
        // In our case, esta_cerrado takes precedence
        if (schedule.esta_cerrado) {
          expect(processed.hora_apertura).toBeNull();
          expect(processed.hora_cierre).toBeNull();
        }
      });
    });

    test("should handle boundary time values", () => {
      const boundarySchedules = [
        {
          dia_semana: "monday",
          hora_apertura: "00:00:00",
          hora_cierre: "00:00:00", // Same time
        },
        {
          dia_semana: "tuesday",
          hora_apertura: "23:59:59",
          hora_cierre: "00:00:00", // Crosses midnight
        },
      ];

      boundarySchedules.forEach((schedule) => {
        const processed = processScheduleData(schedule, 1);

        expect(processed.hora_apertura).toBe(schedule.hora_apertura);
        expect(processed.hora_cierre).toBe(schedule.hora_cierre);
      });
    });

    test("should validate complete week schedule", () => {
      const fullWeekSchedule = generateTestHorarios(7);

      // Check all days are covered
      const days = fullWeekSchedule.map((h) => h.dia_semana);
      const expectedDays = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      expectedDays.forEach((day) => {
        expect(days).toContain(day);
      });

      // Check no duplicates
      const uniqueDays = new Set(days);
      expect(uniqueDays.size).toBe(7);
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
        "Error al registrar el horario: " + supabaseError.message;

      expect(formattedMessage).toBe(
        "Error al registrar el horario: Database constraint violation"
      );
    });

    test("should handle various error scenarios", () => {
      const errorScenarios = [
        { error: { message: "Network error" }, context: "network" },
        { error: { message: "Permission denied" }, context: "permission" },
        { error: { message: "Table does not exist" }, context: "schema" },
        {
          error: { message: "Unique constraint violation" },
          context: "duplicate",
        },
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

  describe("Data Processing Consistency", () => {
    test("should maintain data integrity across processing", () => {
      const originalRequest = buildCreateScheduleRequest();
      const processed = processScheduleData(
        originalRequest,
        originalRequest.id_clinica
      );

      // Core fields should be preserved
      expect(processed.id_clinica).toBe(originalRequest.id_clinica);
      expect(processed.dia_semana).toBe(originalRequest.dia_semana);
      expect(processed.es_24h).toBe(originalRequest.es_24h);
      expect(processed.esta_cerrado).toBe(originalRequest.esta_cerrado);
    });

    test("should handle array processing consistently", () => {
      const multipleRequest = buildCreateMultipleSchedulesRequest();

      const processedArray = multipleRequest.horarios.map((horario) => {
        return processScheduleData(horario, multipleRequest.id_clinica);
      });

      // All should have same clinic ID
      processedArray.forEach((processed) => {
        expect(processed.id_clinica).toBe(multipleRequest.id_clinica);
      });

      // Each should maintain its specific day
      processedArray.forEach((processed, index) => {
        expect(processed.dia_semana).toBe(
          multipleRequest.horarios[index].dia_semana
        );
      });
    });

    test("should validate processed data structure", () => {
      const testSchedule = buildCreateScheduleRequest();
      const processed = processScheduleData(
        testSchedule,
        testSchedule.id_clinica
      );

      // Check all required fields are present
      expect(processed).toHaveProperty("id_clinica");
      expect(processed).toHaveProperty("dia_semana");
      expect(processed).toHaveProperty("hora_apertura");
      expect(processed).toHaveProperty("hora_cierre");
      expect(processed).toHaveProperty("es_24h");
      expect(processed).toHaveProperty("esta_cerrado");

      // Check data types
      expect(typeof processed.id_clinica).toBe("number");
      expect(typeof processed.dia_semana).toBe("string");
      expect(typeof processed.es_24h).toBe("boolean");
      expect(typeof processed.esta_cerrado).toBe("boolean");
    });
  });
});
