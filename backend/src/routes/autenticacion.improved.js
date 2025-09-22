import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  validateLoginRequest,
  isConfirmedClinic,
} from "../utils/validation.js";

dotenv.config();

const router = express.Router();

// Configurar conexión a la base de datos de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRolKey = process.env.SERVICE_ROL_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseServiceRolKey);
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Login de usuarios dueños de mascotas
 * Mejoras implementadas:
 * - Validación de entrada
 * - Manejo de errores específicos
 * - Separación de consulta de mascotas
 * - Logs controlados
 */
router.post("/owner/login", async (req, res) => {
  try {
    // 1. Validar entrada
    const validation = validateLoginRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        message: "Datos de entrada inválidos",
        errors: validation.errors,
      });
    }

    const { email, password } = req.body;

    // 2. Buscar usuario
    const { data: user, error: userError } = await supabaseClient
      .from("usuarios")
      .select("*")
      .eq("correo", email)
      .single();

    if (userError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Database error in owner login:", userError);
      }
      return res.status(500).json({ message: "Error interno del servidor" });
    }

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // 3. Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.contrasena);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // 4. Generar token JWT
    const token = jwt.sign(
      {
        userId: user.id_usuario,
        userType: "owner",
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 5. Configurar cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // 6. Respuesta (sin obtener mascotas aquí - debería ser endpoint separado)
    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        correo: user.correo,
        telefono: user.telefono,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error en owner login:", error);
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * Login de clínicas veterinarias
 * Mejoras implementadas:
 * - Validación de entrada
 * - Manejo de errores específicos
 * - Consistencia en nombres de token
 */
router.post("/vet/login", async (req, res) => {
  try {
    // 1. Validar entrada
    const validation = validateLoginRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        message: "Datos de entrada inválidos",
        errors: validation.errors,
      });
    }

    const { email, password } = req.body;

    // 2. Buscar clínica
    const { data: clinica, error: clinicaError } = await supabaseClient
      .from("clinicas")
      .select("*")
      .eq("correo", email)
      .single();

    if (clinicaError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Database error in vet login:", clinicaError);
      }
      return res.status(500).json({ message: "Error interno del servidor" });
    }

    if (!clinica) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // 3. Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, clinica.contrasena);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // 4. Verificar estado de la clínica
    if (!isConfirmedClinic(clinica.estado)) {
      return res.status(403).json({
        message: "La clínica aún no ha sido verificada. Inténtelo más tarde.",
        estado: clinica.estado,
      });
    }

    // 5. Generar token JWT (usando naming consistente)
    const token = jwt.sign(
      {
        userId: clinica.id_clinica, // Consistente con owner login
        userType: "vet",
        clinicaId: clinica.id_clinica, // Mantener para compatibilidad
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 6. Configurar cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // 7. Respuesta
    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      clinica: {
        id_clinica: clinica.id_clinica,
        nombre: clinica.nombre,
        direccion: clinica.direccion,
        telefono: clinica.telefono,
        correo: clinica.correo,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error en vet login:", error);
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * Endpoint separado para obtener mascotas del usuario
 * Esto mejora la separación de responsabilidades
 */
router.get("/owner/pets", async (req, res) => {
  try {
    // Este endpoint debería tener el middleware de autenticación
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const { data: mascotas, error } = await supabaseClient
      .from("mascotas")
      .select("*")
      .eq("id_usuario", userId);

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error al obtener mascotas:", error);
      }
      return res.status(500).json({ message: "Error al obtener mascotas" });
    }

    res.status(200).json({
      message: "Mascotas obtenidas correctamente",
      mascotas: mascotas || [],
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error en endpoint de mascotas:", error);
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
