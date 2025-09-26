import { jest } from "@jest/globals";

/**
 * Helper functions for servicios tests
 */

/**
 * Create mock Supabase client specifically for servicios
 */
export const createMockServiciosSupabase = () => {
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
        update: jest.fn(() => {
          const updateMock = {
            eq: jest.fn(() => {
              const eqMock = {
                select: jest.fn(() => {
                  const selectMock = {
                    single: jest.fn(() => {
                      const key = `${table}_update_eq_select_single`;
                      return (
                        mockResponses.get(key) || { data: null, error: null }
                      );
                    }),
                    data: mockData.get(table) || [],
                    error: null,
                  };
                  return selectMock;
                }),
                data: mockData.get(table) || [],
                error: null,
              };
              return eqMock;
            }),
            data: mockData.get(table) || [],
            error: null,
          };
          return updateMock;
        }),
        delete: jest.fn(() => {
          const deleteMock = {
            eq: jest.fn(() => {
              const key = `${table}_delete_eq`;
              return mockResponses.get(key) || { data: null, error: null };
            }),
            data: null,
            error: null,
          };
          return deleteMock;
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
export const createTestServicio = (overrides = {}) => {
  return {
    id_servicio: 1,
    id_clinica: 1,
    nombre: "Consulta General",
    descripcion: "Examen médico completo para mascotas",
    precio: 50000,
    categoria: "Consulta",
    disponible: true,
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
export const buildCreateServiceRequest = (overrides = {}) => {
  return {
    id_clinica: 1,
    nombre: "Consulta General",
    descripcion: "Examen médico completo",
    precio: 50000,
    categoria: "Consulta",
    disponible: true,
    ...overrides,
  };
};

export const buildCreateMultipleServicesRequest = (overrides = {}) => {
  return {
    id_clinica: 1,
    servicios: [
      {
        nombre: "Consulta General",
        descripcion: "Examen médico completo",
        precio: 50000,
        categoria: "Consulta",
        disponible: true,
      },
      {
        nombre: "Vacunación",
        descripcion: "Aplicación de vacunas",
        precio: 80000,
        categoria: "Prevención",
        disponible: true,
      },
    ],
    ...overrides,
  };
};

export const buildUpdateServiceRequest = (overrides = {}) => {
  return {
    nombre: "Consulta General Actualizada",
    descripcion: "Nueva descripción",
    precio: 60000,
    categoria: "Consulta",
    disponible: false,
    ...overrides,
  };
};

/**
 * Test setup helpers
 */
export const createTestServiciosSetup = () => {
  const mockSupabase = createMockServiciosSupabase();
  const testClinica = createTestClinica();
  const testServicio = createTestServicio();

  // Set up default mock data
  mockSupabase.setMockData("clinicas", [testClinica]);
  mockSupabase.setMockData("servicios", [testServicio]);

  return {
    mockSupabase,
    testClinica,
    testServicio,
  };
};

/**
 * Validation helpers
 */
export const validateServiceResponse = (response) => {
  const validation = {
    hasValidStructure: false,
    hasValidMessage: false,
    hasValidServicio: false,
  };

  if (response && response.body) {
    validation.hasValidStructure = true;

    if (response.body.message && typeof response.body.message === "string") {
      validation.hasValidMessage = true;
    }

    if (response.body.servicio && typeof response.body.servicio === "object") {
      validation.hasValidServicio = true;
    }
  }

  return validation;
};

export const validateMultipleServicesResponse = (response) => {
  const validation = {
    hasValidStructure: false,
    hasValidMessage: false,
    hasValidServicios: false,
    hasValidCount: false,
  };

  if (response && response.body) {
    validation.hasValidStructure = true;

    if (response.body.message && typeof response.body.message === "string") {
      validation.hasValidMessage = true;
    }

    if (response.body.servicios && Array.isArray(response.body.servicios)) {
      validation.hasValidServicios = true;
    }

    if (typeof response.body.total === "number" || response.body.servicios) {
      validation.hasValidCount = true;
    }
  }

  return validation;
};

/**
 * Mock data generators
 */
export const generateTestServicios = (count = 3) => {
  return Array.from({ length: count }, (_, index) =>
    createTestServicio({
      id_servicio: index + 1,
      nombre: `Servicio ${index + 1}`,
      precio: (index + 1) * 25000,
      categoria: index % 2 === 0 ? "Consulta" : "Prevención",
    })
  );
};

export const generateInvalidServiceData = () => {
  return [
    {}, // Empty object
    { id_clinica: 1 }, // Missing required fields
    { id_clinica: 1, nombre: "Test" }, // Missing precio and categoria
    { id_clinica: 1, nombre: "Test", precio: "invalid", categoria: "Test" }, // Invalid precio
    { id_clinica: 1, nombre: "", precio: 50000, categoria: "Test" }, // Empty nombre
    { nombre: "Test", precio: 50000, categoria: "Test" }, // Missing id_clinica
  ];
};

export const generateInvalidMultipleServicesData = () => {
  return [
    {}, // Empty object
    { id_clinica: 1 }, // Missing servicios array
    { id_clinica: 1, servicios: [] }, // Empty servicios array
    { id_clinica: 1, servicios: "not an array" }, // Invalid servicios type
    {
      id_clinica: 1,
      servicios: [
        { nombre: "Test" }, // Missing required fields
      ],
    },
    {
      id_clinica: 1,
      servicios: [
        { nombre: "Test", precio: "invalid", categoria: "Test" }, // Invalid precio
      ],
    },
  ];
};
