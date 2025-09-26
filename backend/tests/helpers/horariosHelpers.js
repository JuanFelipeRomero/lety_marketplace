import { jest } from "@jest/globals";

/**
 * Helper functions for horarios tests
 */

/**
 * Create mock Supabase client specifically for horarios
 */
export const createMockHorariosSupabase = () => {
  const mockData = new Map();
  const mockResponses = new Map();

  const supabaseMock = {
    from: jest.fn((table) => {
      const tableMock = {
        select: jest.fn(() => {
          const selectMock = {
            eq: jest.fn(() => {
              const eqMock = {
                single: jest.fn(() => {
                  const key = `${table}_select_eq_single`;
                  return mockResponses.get(key) || { data: null, error: null };
                }),
                order: jest.fn(() => {
                  const key = `${table}_select_eq_order`;
                  return mockResponses.get(key) || { data: [], error: null };
                }),
                data: mockData.get(table) || [],
                error: null,
              };
              return eqMock;
            }),
            order: jest.fn(() => {
              const key = `${table}_select_order`;
              return (
                mockResponses.get(key) || {
                  data: mockData.get(table) || [],
                  error: null,
                }
              );
            }),
            data: mockData.get(table) || [],
            error: null,
          };
          return selectMock;
        }),
        insert: jest.fn(() => {
          const insertMock = {
            select: jest.fn(() => {
              const key = `${table}_insert_select`;
              const response = mockResponses.get(key);

              const selectMock = {
                single: jest.fn(() => {
                  const singleKey = `${table}_insert_select_single`;
                  return (
                    mockResponses.get(singleKey) || { data: null, error: null }
                  );
                }),
                // For multiple insert operations (without .single())
                data: response ? response.data : mockData.get(table) || [],
                error: response ? response.error : null,
              };
              return selectMock;
            }),
            data: mockData.get(table) || [],
            error: null,
          };
          return insertMock;
        }),
      };
      return tableMock;
    }),

    // Helper methods for setting up mock data
    setMockData: (table, data) => {
      mockData.set(table, data);
    },
    setMockResponse: (key, response) => {
      mockResponses.set(key, response);
    },
    clearMockData: () => {
      mockData.clear();
      mockResponses.clear();
    },
  };

  return supabaseMock;
};

/**
 * Factory functions for test data
 */
export const createTestHorario = (overrides = {}) => {
  return {
    id_horario: 1,
    id_clinica: 1,
    dia_semana: "monday",
    hora_apertura: "08:00:00",
    hora_cierre: "18:00:00",
    es_24h: false,
    esta_cerrado: false,
    ...overrides,
  };
};

export const createTestClinica = (overrides = {}) => {
  return {
    id_clinica: 1,
    nombre: "Veterinaria Test",
    direccion: "Calle Test 123",
    telefono: "1234567890",
    correo: "test@vet.com",
    estado: "confirmado",
    ...overrides,
  };
};

/**
 * Request builders for different endpoints
 */
export const buildCreateScheduleRequest = (overrides = {}) => {
  return {
    id_clinica: 1,
    dia_semana: "monday",
    hora_apertura: "08:00:00",
    hora_cierre: "18:00:00",
    es_24h: false,
    esta_cerrado: false,
    ...overrides,
  };
};

export const buildCreate24hScheduleRequest = (overrides = {}) => {
  return {
    id_clinica: 1,
    dia_semana: "friday",
    es_24h: true,
    esta_cerrado: false,
    ...overrides,
  };
};

export const buildCreateClosedScheduleRequest = (overrides = {}) => {
  return {
    id_clinica: 1,
    dia_semana: "sunday",
    es_24h: false,
    esta_cerrado: true,
    ...overrides,
  };
};

export const buildCreateMultipleSchedulesRequest = (overrides = {}) => {
  return {
    id_clinica: 1,
    horarios: [
      {
        dia_semana: "monday",
        hora_apertura: "08:00:00",
        hora_cierre: "18:00:00",
        es_24h: false,
        esta_cerrado: false,
      },
      {
        dia_semana: "tuesday",
        hora_apertura: "08:00:00",
        hora_cierre: "18:00:00",
        es_24h: false,
        esta_cerrado: false,
      },
      {
        dia_semana: "wednesday",
        es_24h: true,
        esta_cerrado: false,
      },
      {
        dia_semana: "sunday",
        es_24h: false,
        esta_cerrado: true,
      },
    ],
    ...overrides,
  };
};

/**
 * Validation helpers
 */
export const isValidDayOfWeek = (day) => {
  const validDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  return validDays.includes(day);
};

export const isValidTimeFormat = (time) => {
  if (!time || typeof time !== "string") return false;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
  return timeRegex.test(time);
};

export const validateScheduleLogic = (horario) => {
  const validation = {
    isValid: true,
    errors: [],
  };

  // Si está cerrado, no debe tener horarios definidos
  if (horario.esta_cerrado) {
    if (horario.hora_apertura !== null || horario.hora_cierre !== null) {
      validation.isValid = false;
      validation.errors.push("Días cerrados no deben tener horarios definidos");
    }
  }

  // Si es 24h y no está cerrado, debe tener horarios específicos
  if (horario.es_24h && !horario.esta_cerrado) {
    if (
      horario.hora_apertura !== "00:00:00" ||
      horario.hora_cierre !== "23:59:59"
    ) {
      validation.isValid = false;
      validation.errors.push(
        "Horarios 24h deben tener apertura 00:00:00 y cierre 23:59:59"
      );
    }
  }

  // Si no está cerrado ni es 24h, debe tener horarios válidos
  if (!horario.esta_cerrado && !horario.es_24h) {
    if (!horario.hora_apertura || !horario.hora_cierre) {
      validation.isValid = false;
      validation.errors.push(
        "Horarios normales requieren hora_apertura y hora_cierre"
      );
    }
  }

  return validation;
};

export const validateScheduleResponse = (response) => {
  const validation = {
    hasValidStructure: false,
    hasValidMessage: false,
    hasValidHorario: false,
  };

  if (response && response.body) {
    validation.hasValidStructure = true;

    if (response.body.message && typeof response.body.message === "string") {
      validation.hasValidMessage = true;
    }

    if (response.body.horario && typeof response.body.horario === "object") {
      validation.hasValidHorario = true;
    }
  }

  return validation;
};

export const validateMultipleSchedulesResponse = (response) => {
  const validation = {
    hasValidStructure: false,
    hasValidMessage: false,
    hasValidHorarios: false,
    hasValidCount: false,
  };

  if (response && response.body) {
    validation.hasValidStructure = true;

    if (response.body.message && typeof response.body.message === "string") {
      validation.hasValidMessage = true;
    }

    if (response.body.horarios && Array.isArray(response.body.horarios)) {
      validation.hasValidHorarios = true;
    }

    if (typeof response.body.total === "number" || response.body.horarios) {
      validation.hasValidCount = true;
    }
  }

  return validation;
};

/**
 * Test setup helpers
 */
export const createTestHorariosSetup = () => {
  const mockSupabase = createMockHorariosSupabase();
  const testClinica = createTestClinica();
  const testHorario = createTestHorario();

  // Set up default mock data
  mockSupabase.setMockData("clinicas", [testClinica]);
  mockSupabase.setMockData("horarios_atencion", [testHorario]);

  return {
    mockSupabase,
    testClinica,
    testHorario,
  };
};

/**
 * Mock data generators
 */
export const generateTestHorarios = (count = 7) => {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  return Array.from({ length: Math.min(count, 7) }, (_, index) =>
    createTestHorario({
      id_horario: index + 1,
      dia_semana: days[index],
      hora_apertura: index % 2 === 0 ? "08:00:00" : "09:00:00",
      hora_cierre: index % 2 === 0 ? "18:00:00" : "17:00:00",
      es_24h: index === 2, // Wednesday 24h
      esta_cerrado: index === 6, // Sunday closed
    })
  );
};

export const generateInvalidScheduleData = () => {
  return [
    {}, // Empty object
    { id_clinica: 1 }, // Missing dia_semana
    { dia_semana: "monday" }, // Missing id_clinica
    { id_clinica: 1, dia_semana: "invalid_day" }, // Invalid day
    { id_clinica: 1, dia_semana: "Monday" }, // Wrong case
    { id_clinica: 1, dia_semana: "lunes" }, // Spanish day
    {
      id_clinica: 1,
      dia_semana: "monday",
      esta_cerrado: false,
      es_24h: false,
    }, // Missing required hours
  ];
};

export const generateInvalidMultipleSchedulesData = () => {
  return [
    {}, // Empty object
    { id_clinica: 1 }, // Missing horarios array
    { id_clinica: 1, horarios: [] }, // Empty horarios array
    { id_clinica: 1, horarios: "not an array" }, // Invalid horarios type
    {
      id_clinica: 1,
      horarios: [{ dia_semana: "invalid_day" }], // Invalid day in array
    },
    {
      id_clinica: 1,
      horarios: [
        {
          dia_semana: "monday",
          esta_cerrado: false,
          es_24h: false,
          // Missing required hours
        },
      ],
    },
  ];
};

/**
 * Specialized test cases for complex schedule logic
 */
export const generateScheduleTestCases = () => {
  return {
    valid: [
      // Normal schedule
      {
        dia_semana: "monday",
        hora_apertura: "08:00:00",
        hora_cierre: "18:00:00",
        es_24h: false,
        esta_cerrado: false,
      },
      // 24 hour schedule
      {
        dia_semana: "friday",
        es_24h: true,
        esta_cerrado: false,
      },
      // Closed day
      {
        dia_semana: "sunday",
        es_24h: false,
        esta_cerrado: true,
      },
    ],
    invalid: [
      // Missing hours for normal schedule (this will be processed and should be invalid)
      {
        dia_semana: "tuesday",
        es_24h: false,
        esta_cerrado: false,
        // hora_apertura and hora_cierre will be undefined, should cause validation failure
      },
    ],
  };
};

/**
 * Process schedule data according to business logic
 */
export const processScheduleData = (inputSchedule, id_clinica) => {
  const {
    dia_semana,
    hora_apertura,
    hora_cierre,
    es_24h = false,
    esta_cerrado = false,
  } = inputSchedule;

  let horarioData = {
    id_clinica,
    dia_semana,
    es_24h,
    esta_cerrado,
  };

  // Assign hours according to business logic - esta_cerrado takes precedence
  if (esta_cerrado) {
    horarioData.hora_apertura = null;
    horarioData.hora_cierre = null;
  } else if (es_24h) {
    horarioData.hora_apertura = "00:00:00";
    horarioData.hora_cierre = "23:59:59";
  } else {
    horarioData.hora_apertura = hora_apertura;
    horarioData.hora_cierre = hora_cierre;
  }

  return horarioData;
};
