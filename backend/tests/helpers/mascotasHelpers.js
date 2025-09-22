import { createTestUser } from "./testHelpers.js";

/**
 * Mascota-specific test helpers and factories
 */

/**
 * Create test mascota data
 */
export const createTestMascota = (overrides = {}) => {
  return {
    id_mascota: 1,
    id_usuario: 1,
    nombre: "Firulais",
    edad: 3,
    raza: "Golden Retriever",
    especie: "Perro",
    genero: "Macho",
    peso: 25.5,
    foto_url: "http://test-storage.com/foto-test.jpg",
    historial_medico: "http://test-storage.com/historial-test.pdf",
    ...overrides,
  };
};

/**
 * Create valid mascota registration request data
 */
export const buildAddPetRequest = (overrides = {}) => {
  return {
    petName: "Fluffy",
    petAge: "2",
    petBreed: "Persian",
    petSpecies: "Gato",
    petGender: "Hembra",
    petWeight: "4.5",
    ...overrides,
  };
};

/**
 * Create valid mascota update request data
 */
export const buildUpdatePetRequest = (overrides = {}) => {
  return {
    petName: "Updated Pet Name",
    petAge: "4",
    petBreed: "Updated Breed",
    petSpecies: "Perro",
    petGender: "Macho",
    petWeight: "12.3",
    ...overrides,
  };
};

/**
 * Create mock file for testing file uploads
 */
export const createMockFile = (
  filename = "test-file.jpg",
  mimetype = "image/jpeg"
) => {
  return {
    fieldname: "foto",
    originalname: filename,
    encoding: "7bit",
    mimetype: mimetype,
    destination: "uploads/",
    filename: `${Date.now()}-${filename}`,
    path: `uploads/${Date.now()}-${filename}`,
    size: 1024,
  };
};

/**
 * Create mock files object for multer testing
 */
export const createMockFiles = (withPhoto = true, withHistory = true) => {
  const files = {};

  if (withPhoto) {
    files.foto = [createMockFile("pet-photo.jpg", "image/jpeg")];
  }

  if (withHistory) {
    files.historial = [
      createMockFile("medical-history.pdf", "application/pdf"),
    ];
  }

  return files;
};

/**
 * Create test setup with user and mascota
 */
export const createTestMascotaSetup = (
  userOverrides = {},
  mascotaOverrides = {}
) => {
  const user = createTestUser(userOverrides);
  const mascota = createTestMascota({
    id_usuario: user.id_usuario,
    ...mascotaOverrides,
  });

  return { user, mascota };
};

/**
 * Mock Supabase client responses for mascota operations
 */
export const createMascotaSupabaseMocks = () => {
  const mockSelect = {
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    data: null,
    error: null,
  };

  const mockInsert = {
    select: jest.fn(() => ({
      single: jest.fn(),
    })),
  };

  const mockUpdate = {
    eq: jest.fn().mockReturnThis(),
    select: jest.fn(() => ({
      single: jest.fn(),
    })),
  };

  const mockDelete = {
    eq: jest.fn().mockReturnThis(),
  };

  return {
    from: jest.fn(() => ({
      select: jest.fn(() => mockSelect),
      insert: jest.fn(() => mockInsert),
      update: jest.fn(() => mockUpdate),
      delete: jest.fn(() => mockDelete),
    })),
    mockSelect,
    mockInsert,
    mockUpdate,
    mockDelete,
  };
};

/**
 * Validation helper functions for mascota data
 */
export const isValidPetSpecies = (species) => {
  const validSpecies = ["Perro", "Gato", "Conejo", "Hamster", "Pájaro", "Otro"];
  return validSpecies.includes(species);
};

export const isValidPetGender = (gender) => {
  return gender === "Macho" || gender === "Hembra";
};

export const isValidPetAge = (age) => {
  const ageNum = parseInt(age);
  return (
    !isNaN(ageNum) && ageNum > 0 && ageNum <= 30 && ageNum === parseFloat(age)
  );
};

export const isValidPetWeight = (weight) => {
  const weightNum = parseFloat(weight);
  return !isNaN(weightNum) && weightNum > 0 && weightNum <= 200;
};

export const isValidPetName = (name) => {
  return (
    typeof name === "string" && name.trim().length > 0 && name.length <= 100
  );
};

export const isValidPetBreed = (breed) => {
  return (
    typeof breed === "string" && breed.trim().length > 0 && breed.length <= 100
  );
};

/**
 * Create comprehensive test dataset
 */
export const createTestDataset = () => {
  const users = [
    createTestUser({ id_usuario: 1, correo: "user1@test.com" }),
    createTestUser({ id_usuario: 2, correo: "user2@test.com" }),
    createTestUser({ id_usuario: 3, correo: "user3@test.com" }),
  ];

  const mascotas = [
    createTestMascota({
      id_mascota: 1,
      id_usuario: 1,
      nombre: "Luna",
      especie: "Perro",
    }),
    createTestMascota({
      id_mascota: 2,
      id_usuario: 1,
      nombre: "Max",
      especie: "Gato",
    }),
    createTestMascota({
      id_mascota: 3,
      id_usuario: 2,
      nombre: "Bella",
      especie: "Perro",
    }),
    createTestMascota({
      id_mascota: 4,
      id_usuario: 3,
      nombre: "Rocky",
      especie: "Gato",
    }),
  ];

  return { users, mascotas };
};

/**
 * Clean up test files helper
 */
export const cleanupTestFiles = (files) => {
  // Mock cleanup for unit tests
  return Promise.resolve();
};
