import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load test environment
dotenv.config({ path: ".env.test" });

/**
 * Test Database Configuration and Utilities
 */

export class TestDatabase {
  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL || "http://localhost:54321",
      process.env.SERVICE_ROL_KEY || "test-key"
    );
  }

  /**
   * Clean all test data from database
   */
  async cleanDatabase() {
    try {
      // Delete in correct order due to foreign key constraints
      await this.client.from("citas").delete().neq("id_cita", 0);
      await this.client.from("reseñas").delete().neq("id_resena", 0);
      await this.client.from("favoritos").delete().neq("id_usuario", 0);
      await this.client
        .from("notificaciones")
        .delete()
        .neq("id_notificacion", 0);
      await this.client.from("servicios").delete().neq("id_servicio", 0);
      await this.client.from("horarios_atencion").delete().neq("id_horario", 0);
      await this.client.from("fotos_clinicas").delete().neq("id_foto", 0);
      await this.client
        .from("clinica_especialidades")
        .delete()
        .neq("id_clinica", 0);
      await this.client.from("mascotas").delete().neq("id_mascota", 0);
      await this.client
        .from("especialidades")
        .delete()
        .neq("id_especialidad", 0);
      await this.client.from("clinicas").delete().neq("id_clinica", 0);
      await this.client.from("usuarios").delete().neq("id_usuario", 0);

      console.log("Test database cleaned successfully");
    } catch (error) {
      console.error("Error cleaning test database:", error);
      throw error;
    }
  }

  /**
   * Seed database with test data
   */
  async seedDatabase() {
    try {
      // Create test users
      const { data: usuarios } = await this.client
        .from("usuarios")
        .insert([
          {
            nombre: "Test User 1",
            correo: "test1@example.com",
            contrasena: "$2b$10$hashedpassword1",
            telefono: "1234567890",
          },
          {
            nombre: "Test User 2",
            correo: "test2@example.com",
            contrasena: "$2b$10$hashedpassword2",
            telefono: "0987654321",
          },
        ])
        .select();

      // Create test clinicas
      const { data: clinicas } = await this.client
        .from("clinicas")
        .insert([
          {
            nombre: "Test Vet Clinic 1",
            direccion: "Test Address 1",
            telefono: "1111111111",
            correo: "vet1@example.com",
            contrasena: "$2b$10$hashedvetpassword1",
            estado: "confirmado",
            NIT: "TEST123456789",
          },
          {
            nombre: "Test Vet Clinic 2",
            direccion: "Test Address 2",
            telefono: "2222222222",
            correo: "vet2@example.com",
            contrasena: "$2b$10$hashedvetpassword2",
            estado: "pendiente",
            NIT: "TEST987654321",
          },
        ])
        .select();

      // Create test especialidades
      const { data: especialidades } = await this.client
        .from("especialidades")
        .insert([
          { nombre: "Medicina General" },
          { nombre: "Cirugía" },
          { nombre: "Dermatología" },
        ])
        .select();

      // Create test mascotas
      if (usuarios && usuarios.length > 0) {
        await this.client.from("mascotas").insert([
          {
            id_usuario: usuarios[0].id_usuario,
            nombre: "Test Pet 1",
            edad: 3,
            raza: "Labrador",
            especie: "Perro",
            genero: "Macho",
            peso: 25.5,
          },
          {
            id_usuario: usuarios[1].id_usuario,
            nombre: "Test Pet 2",
            edad: 2,
            raza: "Siamés",
            especie: "Gato",
            genero: "Hembra",
            peso: 4.2,
          },
        ]);
      }

      // Create test servicios
      if (clinicas && clinicas.length > 0) {
        await this.client.from("servicios").insert([
          {
            id_clinica: clinicas[0].id_clinica,
            nombre: "Consulta General",
            descripcion: "Consulta veterinaria general",
            precio: 50000,
            categoria: "Consulta",
          },
          {
            id_clinica: clinicas[0].id_clinica,
            nombre: "Vacunación",
            descripcion: "Vacunación completa",
            precio: 80000,
            categoria: "Prevención",
          },
        ]);
      }

      console.log("Test database seeded successfully");
      return { usuarios, clinicas, especialidades };
    } catch (error) {
      console.error("Error seeding test database:", error);
      throw error;
    }
  }

  /**
   * Reset database to clean state and re-seed
   */
  async resetDatabase() {
    await this.cleanDatabase();
    return await this.seedDatabase();
  }

  /**
   * Create a test user and return the data
   */
  async createTestUser(userData = {}) {
    const defaultData = {
      nombre: "Test User",
      correo: `test${Date.now()}@example.com`,
      contrasena: "$2b$10$hashedpassword",
      telefono: "1234567890",
      ...userData,
    };

    const { data, error } = await this.client
      .from("usuarios")
      .insert([defaultData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a test clinic and return the data
   */
  async createTestClinica(clinicaData = {}) {
    const defaultData = {
      nombre: "Test Clinic",
      direccion: "Test Address",
      telefono: "1111111111",
      correo: `clinic${Date.now()}@example.com`,
      contrasena: "$2b$10$hashedpassword",
      estado: "confirmado",
      NIT: `TEST${Date.now()}`,
      ...clinicaData,
    };

    const { data, error } = await this.client
      .from("clinicas")
      .insert([defaultData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a test pet and return the data
   */
  async createTestMascota(id_usuario, mascotaData = {}) {
    const defaultData = {
      id_usuario,
      nombre: "Test Pet",
      edad: 2,
      raza: "Test Breed",
      especie: "Perro",
      genero: "Macho",
      peso: 10.0,
      ...mascotaData,
    };

    const { data, error } = await this.client
      .from("mascotas")
      .insert([defaultData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// Singleton instance for tests
export const testDb = new TestDatabase();
