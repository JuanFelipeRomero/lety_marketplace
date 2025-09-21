import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

/**
 * Test utilities and helpers
 */

// Create test Supabase client
export const createTestSupabaseClient = () => {
  return createClient(
    process.env.SUPABASE_URL || "http://localhost:54321",
    process.env.SERVICE_ROL_KEY || "test-key"
  );
};

/**
 * Generate JWT tokens for testing
 */
export const generateTestToken = (payload, expiresIn = "1h") => {
  const secret = process.env.JWT_SECRET || "test-secret";
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Create test user token
 */
export const createUserToken = (userId = 1) => {
  return generateTestToken({
    userId,
    userType: "owner",
  });
};

/**
 * Create test vet token
 */
export const createVetToken = (clinicaId = 1) => {
  return generateTestToken({
    clinicaId,
    userType: "vet",
  });
};

/**
 * Mock Supabase client for unit tests
 */
export const createMockSupabaseClient = () => {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          data: null,
          error: null,
        })),
        data: null,
        error: null,
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
          data: null,
          error: null,
        })),
        data: null,
        error: null,
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null,
        })),
        data: null,
        error: null,
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null,
        })),
        data: null,
        error: null,
      })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  };
};

/**
 * Test data factories
 */
export const createTestUser = (overrides = {}) => {
  return {
    id_usuario: 1,
    nombre: "Test User",
    correo: "test@example.com",
    telefono: "1234567890",
    fecha_registro: new Date(),
    ...overrides,
  };
};

export const createTestClinica = (overrides = {}) => {
  return {
    id_clinica: 1,
    nombre: "Test Vet Clinic",
    direccion: "Test Address",
    telefono: "1234567890",
    correo: "vet@example.com",
    estado: "confirmado",
    ...overrides,
  };
};

export const createTestMascota = (overrides = {}) => {
  return {
    id_mascota: 1,
    id_usuario: 1,
    nombre: "Test Pet",
    edad: 2,
    raza: "Test Breed",
    especie: "Perro",
    genero: "Macho",
    peso: 10.5,
    ...overrides,
  };
};

/**
 * Clean up test files
 */
export const cleanupTestFiles = (filePaths) => {
  // Implementation for cleaning up uploaded test files
  // This would be used after integration tests
};
