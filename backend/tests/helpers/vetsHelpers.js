import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";

/**
 * Helpers específicos para tests de veterinarias
 */

// Create test Supabase client
export const createTestSupabaseClient = () => {
  return createClient(
    process.env.SUPABASE_URL || "http://localhost:54321",
    process.env.SERVICE_ROL_KEY || "test-key"
  );
};

/**
 * Create test veterinary data
 */
export const createTestVeterinaryData = (overrides = {}) => {
  return {
    id_clinica: 1,
    nombre: "Clínica Veterinaria Test",
    direccion: "Carrera 7 #123-45, Bogotá",
    telefono: "3001234567",
    correo: "test@veterinaria.com",
    contrasena: "password123",
    descripcion: "Clínica veterinaria de prueba",
    NIT: "123456789-1",
    latitud: 4.6097,
    longitud: -74.0817,
    estado: "confirmado",
    fecha_registro: new Date().toISOString(),
    certificado_url: "https://example.com/certificado.pdf",
    sitio_web: "https://veterinaria-test.com",
    ciudad: "Bogotá",
    codigo_postal: "110111",
    detalles: {
      especialidades: ["Medicina general", "Cirugía"],
      instalaciones: ["Consultorios", "Quirófano"],
      metodos_pago: ["Efectivo", "Tarjeta"],
    },
    ...overrides,
  };
};

/**
 * Create test services data
 */
export const createTestServices = (clinicId = 1, overrides = []) => {
  const defaultServices = [
    {
      name: "Consulta General",
      price: "50000",
      category: "consulta",
    },
    {
      name: "Vacunación",
      price: "35000",
      category: "medicina_preventiva",
    },
    {
      name: "Cirugía Menor",
      price: "150000",
      category: "cirugia",
    },
  ];

  return [...defaultServices, ...overrides];
};

/**
 * Create test schedule data
 */
export const createTestSchedule = (overrides = {}) => {
  const defaultSchedule = {
    monday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
    tuesday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
    wednesday: {
      open: "08:00",
      close: "18:00",
      closed: false,
      is24Hours: false,
    },
    thursday: {
      open: "08:00",
      close: "18:00",
      closed: false,
      is24Hours: false,
    },
    friday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
    saturday: {
      open: "08:00",
      close: "14:00",
      closed: false,
      is24Hours: false,
    },
    sunday: { open: "08:00", close: "14:00", closed: true, is24Hours: false },
  };

  return { ...defaultSchedule, ...overrides };
};

/**
 * Create test details data
 */
export const createTestDetails = (overrides = {}) => {
  return {
    specialties: ["Medicina general", "Cirugía", "Odontología"],
    facilities: ["Consultorios", "Quirófano", "Laboratorio", "Hospitalización"],
    paymentMethods: ["Efectivo", "Tarjeta de crédito", "Transferencia"],
    ...overrides,
  };
};

/**
 * Generate vet tokens
 */
export const createVetToken = (clinicaId = 1) => {
  const secret = process.env.JWT_SECRET || "test-secret";
  return jwt.sign(
    {
      clinicaId,
      userType: "vet",
    },
    secret,
    { expiresIn: "1h" }
  );
};

/**
 * Mock file objects for testing
 */
export const createMockFile = (overrides = {}) => {
  return {
    fieldname: "certificadoSalud",
    originalname: "certificado.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    filename: "test-certificate-123456789.pdf",
    path: "/tmp/test-certificate-123456789.pdf",
    size: 1024000, // 1MB
    ...overrides,
  };
};

export const createInvalidMockFile = (type = "size") => {
  const baseFile = createMockFile();

  switch (type) {
    case "size":
      return { ...baseFile, size: 50 * 1024 * 1024 }; // 50MB - too large
    case "mimetype":
      return { ...baseFile, mimetype: "image/jpeg", originalname: "image.jpg" };
    case "corrupted":
      return { ...baseFile, path: "/nonexistent/path.pdf" };
    default:
      return baseFile;
  }
};

/**
 * Mock Supabase responses for vets
 */
export const createMockVetSupabase = () => {
  const mockData = {
    clinicas: [],
    servicios: [],
    horarios_atencion: [],
    fotos_clinicas: [],
    reseñas: [],
  };

  return {
    from: jest.fn((table) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockData[table]?.[0] || null,
            error: null,
          })),
          data: mockData[table] || [],
          error: null,
        })),
        data: mockData[table] || [],
        error: null,
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockData[table]?.[0] || { id_clinica: 1 },
            error: null,
          })),
          data: mockData[table] || [{ id_clinica: 1 }],
          error: null,
        })),
        data: mockData[table] || [{ id_clinica: 1 }],
        error: null,
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            data: mockData[table] || [],
            error: null,
          })),
          data: mockData[table] || [],
          error: null,
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    setMockData: (table, data) => {
      mockData[table] = Array.isArray(data) ? data : [data];
    },
  };
};

/**
 * Mock external services
 */
export const createMockGeocoding = () => {
  return {
    success: {
      data: {
        status: "OK",
        results: [
          {
            geometry: {
              location: {
                lat: 4.6097,
                lng: -74.0817,
              },
            },
          },
        ],
      },
      status: 200,
    },
    failure: {
      data: {
        status: "ZERO_RESULTS",
        error_message: "No results found",
      },
      status: 200,
    },
    error: new Error("Network error"),
  };
};

export const createMockFileUpload = () => {
  return {
    success:
      "https://supabase.com/storage/v1/object/certificados/test-file.pdf",
    error: new Error("Upload failed"),
  };
};

/**
 * Validation helpers
 */
export const isValidNIT = (nit) => {
  const nitRegex = /^\d{9}-\d{1}$/;
  return nitRegex.test(nit);
};

export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^3\d{9}$/;
  return phoneRegex.test(phone);
};

export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (
    emailRegex.test(email) &&
    !email.includes("..") &&
    !email.startsWith(".") &&
    !email.endsWith(".") &&
    !email.includes(".@") &&
    !email.includes("@.")
  );
};

export const isValidTimeFormat = (time) => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

export const isValidCoordinates = (lat, lng) => {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export const isValidFileType = (mimetype) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];
  return allowedTypes.includes(mimetype);
};

export const isValidFileSize = (size, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
};

/**
 * Request body builders for tests
 */
export const buildRegisterVetRequest = (overrides = {}) => {
  const vetData = createTestVeterinaryData(overrides);
  const services = createTestServices();

  return {
    nombre: vetData.nombre,
    direccion: vetData.direccion,
    telefono: vetData.telefono,
    correo: vetData.correo,
    contrasena: vetData.contrasena,
    descripcion: vetData.descripcion,
    NIT: vetData.NIT,
    latitud: vetData.latitud,
    longitud: vetData.longitud,
    servicios: JSON.stringify(services),
    ...overrides,
  };
};

export const buildUpdateInfoRequest = (overrides = {}) => {
  return {
    nombre: "Clínica Actualizada",
    telefono: "3009876543",
    NIT: "987654321-0",
    direccion: "Calle 100 #15-20, Bogotá",
    ciudad: "Bogotá",
    codigo_postal: "110221",
    correo: "updated@veterinaria.com",
    sitio_web: "https://updated-vet.com",
    descripcion: "Descripción actualizada",
    ...overrides,
  };
};

export const buildUpdateHoursRequest = (overrides = {}) => {
  const openingHours = createTestSchedule(overrides);
  return { openingHours };
};

export const buildUpdateDetailsRequest = (overrides = {}) => {
  const details = createTestDetails(overrides);
  return {
    specialties: details.specialties,
    facilities: details.facilities,
    paymentMethods: details.paymentMethods,
  };
};

/**
 * Hash password helper for tests (mock implementation)
 */
export const hashPassword = async (password) => {
  // Simple mock hash for testing
  return `hashed_${password}_123`;
};

export const comparePassword = async (password, hash) => {
  // Simple mock comparison for testing
  return hash === `hashed_${password}_123`;
};

/**
 * File system helpers for tests
 */
export const createTestFile = (filename = "test-certificate.pdf") => {
  const testContent = "Test PDF content";
  const filePath = path.join("uploads", filename);

  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
  }

  fs.writeFileSync(filePath, testContent);
  return filePath;
};

export const cleanupTestFiles = (filePaths = []) => {
  filePaths.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Could not delete test file ${filePath}:`, error.message);
    }
  });
};

/**
 * Database cleanup helpers
 */
export const cleanupTestVeterinaries = async (supabase, clinicIds = []) => {
  if (clinicIds.length === 0) return;

  try {
    // Clean up related tables first
    await supabase.from("servicios").delete().in("id_clinica", clinicIds);
    await supabase
      .from("horarios_atencion")
      .delete()
      .in("id_clinica", clinicIds);
    await supabase.from("fotos_clinicas").delete().in("id_clinica", clinicIds);

    // Finally clean up clinicas
    await supabase.from("clinicas").delete().in("id_clinica", clinicIds);
  } catch (error) {
    console.warn("Error cleaning up test veterinaries:", error);
  }
};

/**
 * Response format helpers
 */
export const validateVetRegistrationResponse = (response) => {
  return (
    response.hasOwnProperty("message") &&
    response.hasOwnProperty("datosClinica") &&
    response.datosClinica.hasOwnProperty("id_clinica")
  );
};

export const validateVetProfileResponse = (response) => {
  const requiredFields = [
    "id_clinica",
    "nombre",
    "direccion",
    "telefono",
    "correo",
    "openingHours",
    "specialties",
    "facilities",
    "paymentMethods",
    "photos",
    "services",
    "reviews",
  ];

  return requiredFields.every((field) => response.hasOwnProperty(field));
};

/**
 * Mock axios for geocoding tests
 */
export const createAxiosMock = () => {
  return {
    get: jest.fn(),
    setMockResponse: (response) => {
      axios.get.mockResolvedValue(response);
    },
    setMockError: (error) => {
      axios.get.mockRejectedValue(error);
    },
  };
};
