import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  validateCompleteAppointment,
  validateClinicStatus,
  validateServiceAvailability,
  validateBusinessHours,
  validateBookingWindow,
  validateTimeSlotGranularity,
  checkAppointmentConflicts,
} from "../utils/appointmentValidation.js";

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SERVICE_ROL_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware para validar JWT
const authenticateToken = (req, res, next) => {
  const token =
    req.cookies.auth_token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ message: "No token, autorización denegada" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // guardar info de usuario en la request
    next();
  } catch (error) {
    console.error("Error verificando token:", error);
    return res.status(401).json({ message: "Token inválido" });
  }
};

// Aplicamos el middleware a todas las rutas
router.use(authenticateToken);

// Ruta para agendar citas
router.post('/appointments/schedule', async (req, res) => {
  // 1. OBTENER USUARIO AUTENTICADO
  const { userId, userType } = req.user;

  // 2. VALIDACIÓN DE ROL
  if (userType !== 'owner') {
    return res
      .status(403)
      .json({ message: 'Solo los dueños de mascotas pueden agendar citas' });
  }

  // 3. OBTENER DATOS DEL BODY
  const {
    petId,
    serviceId,
    date, // Se espera "YYYY-MM-DD"
    timeSlot, // Se espera "HH:MM"
    reason,
    notes,
    reminderPreference,
    acceptedTerms,
    clinicId,
  } = req.body;

  // 4. VALIDACIÓN DE DATOS MÍNIMOS
  if (
    !petId ||
    !serviceId ||
    !date ||
    !timeSlot ||
    !clinicId ||
    acceptedTerms !== true
  ) {
    return res
      .status(400)
      .json({ message: 'Datos de cita incompletos o inválidos.' });
  }

  try {
    // 5. VALIDAR PERTENENCIA DE LA MASCOTA
    const { data: pet, error: petError } = await supabase
      .from('mascotas')
      .select('id_usuario')
      .eq('id_mascota', petId)
      .eq('id_usuario', userId) // <-- Se comprueba la pertenencia en la consulta
      .single();

    if (petError || !pet) {
      return res
        .status(404)
        .json({ message: 'Mascota no encontrada o no pertenece a este usuario' });
    }

    // 6. OBTENER DURACIÓN DEL SERVICIO
    const { data: servicio, error: errorServicio } = await supabase
      .from('servicios')
      .select('duracion_minutos')
      .eq('id_servicio', serviceId)
      .single();

    if (errorServicio || !servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Asegurarse de que 'duracion_minutos' existe y es válido
    const duracion = servicio.duracion_minutos || 30; // 30 min por defecto

    // 7. CALCULAR MARCO DE TIEMPO DE LA CITA
    const isoStartTime = `${date}T${timeSlot}:00`;
    const fecha_inicio = new Date(isoStartTime);

    // Validar formato de fecha/hora
    if (isNaN(fecha_inicio.getTime())) {
      return res.status(400).json({
        message:
          'Formato de fecha u hora inválido. Use YYYY-MM-DD y HH:MM.',
      });
    }

    // Validar que la cita no sea en el pasado
    if (fecha_inicio < new Date(Date.now() - 5 * 60000)) {
      // 5 min de margen
      return res
        .status(400)
        .json({ message: 'No se pueden agendar citas en el pasado.' });
    }

    const fecha_fin = new Date(
      fecha_inicio.getTime() + duracion * 60000
    );

    // 8. VALIDACIÓN COMPLETA (Estado de clínica, horarios, ventanas, conflictos)
    const validation = await validateCompleteAppointment({
      supabase,
      clinicId,
      serviceId,
      fechaInicio: fecha_inicio,
      fechaFin: fecha_fin,
      timeSlot,
      excludeAppointmentId: null,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Error en la validación de la cita',
        errors: validation.errors,
      });
    }

    // 9. PREPARAR Y GUARDAR LA CITA (¡AHORA ES SEGURO!)
    const trazabilidad = [
      {
        accion: 'creacion',
        usuario: userId,
        fecha: new Date().toISOString(),
        detalles: {
          estado: 'pendiente',
          motivo: reason || '',
          notas: notes || '',
        },
      },
    ];

    const { data: nuevaCita, error: errorInsert } = await supabase
      .from('citas')
      .insert([
        {
          id_usuario: userId,
          id_mascota: petId,
          id_clinica: clinicId,
          id_servicio: serviceId,
          fecha_inicio: fecha_inicio.toISOString(), // <-- Corregido
          fecha_fin: fecha_fin.toISOString(), // <-- Añadido
          horario: timeSlot, // <-- Mantenido por compatibilidad
          motivo: reason || '',
          notas_adicionales: notes || '',
          preferencia_recordatorio: reminderPreference || 'both',
          acepto_terminos: true,
          estado: 'pendiente',
          created_at: new Date().toISOString(),
          trazabilidad,
        },
      ])
      .select()
      .single();

    if (errorInsert) {
      console.error('Error insertando cita:', errorInsert);
      return res
        .status(500)
        .json({ message: 'Error al agendar cita', error: errorInsert.message });
    }

    return res
      .status(201)
      .json({ message: 'Cita creada exitosamente', cita: nuevaCita });
  } catch (error) {
    console.error('Error general agendando cita:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// 🔥 Nueva ruta para obtener citas del usuario
router.get("/appointments/user", async (req, res) => {
  const { userId } = req.user;

  try {
    const { data, error } = await supabase
      .from("citas")
      .select(
        `
        id_cita,
        id_mascota,
        id_clinica,
        fecha_inicio,
        horario,
        motivo,
        estado,
        notas_adicionales,
        mascotas(nombre, foto_url),
        clinicas(nombre, direccion),
        motivo_reprogramacion,
        motivo_cancelacion
      `
      )
      .eq("id_usuario", userId)
      .order("fecha_inicio", { ascending: true });

    if (error) {
      console.error("Error obteniendo citas:", error);
      return res.status(500).json({ message: "Error al obtener citas" });
    }

    const citasFormateadas = data.map((cita) => ({
      id: cita.id_cita,
      petName: cita.mascotas?.nombre || "Mascota",
      petImage: cita.mascotas?.foto_url || "/placeholder.svg",
      clinicName: cita.clinicas?.nombre || "Clínica veterinaria",
      clinicAddress: cita.clinicas?.direccion || "Dirección desconocida",
      date: new Date(cita.fecha_inicio).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: cita.horario,
      reason: cita.motivo || "Consulta",
      status:
        cita.estado === "pendiente"
          ? "pending"
          : cita.estado === "confirmada"
          ? "confirmed"
          : cita.estado === "cancelada"
          ? "cancelled"
          : cita.estado === "finalizada"
          ? "completed"
          : "unknown",
      notes: cita.notas_adicionales || "",
      motivo_reprogramacion: cita.motivo_reprogramacion || "",
      motivo_cancelacion: cita.motivo_cancelacion || "",
    }));

    res.status(200).json({ citas: citasFormateadas });
  } catch (error) {
    console.error("Error general trayendo citas:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// 🔥 Endpoint público para verificar disponibilidad de horarios en una fecha específica
// Usado por el agendamiento de citas para mostrar slots disponibles
router.get("/appointments/clinic/:clinicId/availability", async (req, res) => {
  const { clinicId } = req.params;
  const { date } = req.query; // Format: YYYY-MM-DD

  // Validación de parámetros
  if (!date) {
    return res.status(400).json({
      message: "El parámetro 'date' es requerido (formato: YYYY-MM-DD)"
    });
  }

  // Validar formato de fecha
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      message: "El formato de fecha debe ser YYYY-MM-DD"
    });
  }

  try {
    // Construir el rango de fechas (todo el día)
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    // Obtener todas las citas activas para ese día en esa clínica
    const { data: citas, error } = await supabase
      .from("citas")
      .select("id_cita, fecha_inicio, fecha_fin, estado")
      .eq("id_clinica", clinicId)
      .neq("estado", "cancelada")
      .gte("fecha_inicio", startOfDay)
      .lte("fecha_inicio", endOfDay)
      .order("fecha_inicio", { ascending: true });

    if (error) {
      console.error("Error obteniendo disponibilidad:", error);
      return res.status(500).json({
        message: "Error al verificar disponibilidad",
        error: error.message
      });
    }

    res.status(200).json({
      date,
      clinicId: parseInt(clinicId),
      citas: citas || [],
    });
  } catch (error) {
    console.error("Error en endpoint de disponibilidad:", error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: error.message
    });
  }
});

// 🔥 Endpoint para que la veterinaria vea todas sus citas
router.get("/appointments/clinic", async (req, res) => {
  const { clinicaId, userType } = req.user;

  if (userType !== "vet") {
    return res
      .status(403)
      .json({ message: "Solo las clínicas pueden ver sus citas" });
  }

  try {
    const { data, error } = await supabase
      .from("citas")
      .select(
        `
        id_cita,
        id_mascota,
        id_usuario,
        fecha_inicio,
        horario,
        motivo,
        estado,
        notas_adicionales,
        mascotas(nombre, foto_url),
        usuarios(nombre, correo, telefono)
      `
      )
      .eq("id_clinica", clinicaId)
      .order("fecha_inicio", { ascending: true });

    if (error) {
      console.error("Error obteniendo citas de la clínica:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener citas de la clínica" });
    }

    const citasFormateadas = data.map((cita) => ({
      id: cita.id_cita,
      petName: cita.mascotas?.nombre || "Mascota",
      petImage: cita.mascotas?.foto_url || "/placeholder.svg",
      ownerName: cita.usuarios?.nombre || "Dueño",
      ownerEmail: cita.usuarios?.correo || "",
      ownerPhone: cita.usuarios?.telefono || "",
      date: new Date(cita.fecha_inicio).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: cita.horario,
      reason: cita.motivo || "Consulta",
      status: cita.estado,
      notes: cita.notas_adicionales || "",
    }));

    res.status(200).json({ citas: citasFormateadas });
  } catch (error) {
    console.error("Error general trayendo citas de la clínica:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Obtener detalles de una cita
router.get("/appointments/:appointmentId", async (req, res) => {
  const { appointmentId } = req.params;
  const { userId } = req.user; // Viene del authenticateToken

  try {
    const { data, error } = await supabase
      .from("citas")
      .select(
        `
        id_cita,
        fecha_inicio,
        horario,
        motivo,
        estado,
        created_at,
        mascotas (
          nombre,
          especie,
          raza,
          edad,
          peso,
          foto_url
        ),
        clinicas (
          nombre,
          direccion,
          telefono,
          correo
        ),
        servicios (
          nombre,
          precio
        )
      `
      )
      .eq("id_usuario", userId) // 🔥 Seguridad: solo puede traer sus propias citas
      .eq("id_cita", appointmentId)
      .single(); // Esperamos solo **una** cita

    if (error) {
      console.error("Error obteniendo cita:", error);
      return res
        .status(500)
        .json({ message: "Error obteniendo detalles de la cita" });
    }

    if (!data) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    // Formateamos los datos para adaptarlos a tu frontend
    const appointment = {
      id: data.id_cita,
      date: data.fecha_inicio,
      time: data.horario,
      reason: data.motivo,
      status: data.estado,
      createdAt: data.created_at,
      petName: data.mascotas?.nombre || "",
      petType: data.mascotas?.especie || "",
      petBreed: data.mascotas?.raza || "",
      petAge: data.mascotas?.edad || "",
      petWeight: data.mascotas?.peso ? `${data.mascotas.peso} kg` : "",
      petImage: data.mascotas?.foto_url || "/placeholder.svg",
      clinicName: data.clinicas?.nombre || "",
      clinicAddress: data.clinicas?.direccion || "",
      clinicPhone: data.clinicas?.telefono || "",
      clinicEmail: data.clinicas?.correo || "",
      clinicImage: data.clinicas?.imagen_url || "/placeholder.svg",
      service: data.servicios?.nombre || "",
      duration: data.servicios?.duracion || 30,
      price: data.servicios?.precio || 0,
      paymentStatus: "pending", // 🔥 Por ahora por defecto, lo integrarás después
      paymentType: "none", // 🔥
    };

    res.status(200).json({ appointment });
  } catch (error) {
    console.error("Error general obteniendo detalles de la cita:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// 🔥 Endpoint para que la veterinaria actualice el estado de una cita
router.put("/appointments/:appointmentId/status", async (req, res) => {
  const { appointmentId } = req.params;
  const { clinicaId, userType } = req.user;
  const { status, message } = req.body;

  if (userType !== "vet") {
    return res.status(403).json({
      message: "Solo las clínicas pueden actualizar el estado de citas",
    });
  }

  // Validar el status
  const validStatus = ["confirmada", "rechazada", "reprogramacion_sugerida"];
  if (!validStatus.includes(status)) {
    return res.status(400).json({
      message:
        "Estado no válido. Debe ser: confirmada, rechazada o reprogramacion_sugerida",
    });
  }

  try {
    // Verificar que la cita pertenezca a la clínica
    const { data: cita, error: errorCita } = await supabase
      .from("citas")
      .select("id_cita, id_clinica, id_usuario, trazabilidad")
      .eq("id_cita", appointmentId)
      .eq("id_clinica", clinicaId)
      .single();

    if (errorCita || !cita) {
      console.error("Error verificando cita:", errorCita);
      return res
        .status(404)
        .json({ message: "Cita no encontrada o no pertenece a esta clínica" });
    }

    // Actualizar el estado de la cita
    const actualizacion = {
      estado: status,
    };

    // Si hay mensaje/nota, guardarlo
    // No actualizamos notas_veterinaria porque no existe en la tabla
    // El mensaje se guardará en la trazabilidad

    // Manejo de trazabilidad
    const nuevaTrazabilidad = Array.isArray(cita.trazabilidad)
      ? [...cita.trazabilidad]
      : [];
    nuevaTrazabilidad.push({
      accion: "cambio_estado",
      usuario: clinicaId,
      fecha: new Date().toISOString(),
      detalles: {
        nuevo_estado: status,
        mensaje: message || "",
      },
    });
    actualizacion.trazabilidad = nuevaTrazabilidad;

    const { error: errorActualizacion } = await supabase
      .from("citas")
      .update(actualizacion)
      .eq("id_cita", appointmentId);

    if (errorActualizacion) {
      console.error("Error actualizando cita:", errorActualizacion);
      return res.status(500).json({
        message: "Error al actualizar el estado de la cita",
        error: errorActualizacion.message,
        details: errorActualizacion.details || errorActualizacion,
      });
    }

    // TODO: Aquí se podría implementar el envío de notificaciones al cliente

    return res.status(200).json({
      message: `Cita ${
        status === "confirmada"
          ? "confirmada"
          : status === "rechazada"
          ? "rechazada"
          : "marcada para reprogramación"
      } exitosamente`,
    });
  } catch (error) {
    console.error("Error general actualizando estado de cita:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Editar datos generales de la cita (solo dueño)
router.put("/appointments/:appointmentId/edit", async (req, res) => {
  const { appointmentId } = req.params;
  const { userId, userType } = req.user;
  const {
    petId,
    serviceId,
    date,
    timeSlot,
    reason,
    notes,
    reminderPreference,
  } = req.body;

  if (userType !== "owner") {
    return res
      .status(403)
      .json({ message: "Solo el dueño puede editar la cita" });
  }

  try {
    // Verificar que la cita pertenezca al usuario
    const { data: cita, error: errorCita } = await supabase
      .from("citas")
      .select("id_cita, id_usuario, id_clinica, id_servicio, fecha_inicio, horario, trazabilidad")
      .eq("id_cita", appointmentId)
      .eq("id_usuario", userId)
      .single();

    if (errorCita || !cita) {
      return res
        .status(404)
        .json({ message: "Cita no encontrada o no pertenece al usuario" });
    }

    const actualizacion = {};
    let needsConflictCheck = false;
    let newServiceId = serviceId || cita.id_servicio;
    let newDate = date;
    let newTimeSlot = timeSlot || cita.horario;

    // Determinar si se cambió algo que requiera re-validación
    if (date || timeSlot || serviceId) {
      needsConflictCheck = true;
    }

    if (petId) actualizacion.id_mascota = petId;
    if (serviceId) actualizacion.id_servicio = serviceId;
    if (reason !== undefined) actualizacion.motivo = reason;
    if (notes !== undefined) actualizacion.notas_adicionales = notes;
    if (reminderPreference)
      actualizacion.preferencia_recordatorio = reminderPreference;

    // Si cambió fecha, hora o servicio, recalcular fecha_inicio y fecha_fin
    if (needsConflictCheck) {
      // Obtener duración del servicio (nuevo o actual)
      const { data: servicio, error: errorServicio } = await supabase
        .from('servicios')
        .select('duracion_minutos')
        .eq('id_servicio', newServiceId)
        .single();

      if (errorServicio || !servicio) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }

      const duracion = servicio.duracion_minutos || 30;

      // Usar la fecha nueva o la actual
      const dateToUse = date || cita.fecha_inicio.split('T')[0];
      const isoStartTime = `${dateToUse}T${newTimeSlot}:00`;
      const fecha_inicio = new Date(isoStartTime);

      // Validar formato
      if (isNaN(fecha_inicio.getTime())) {
        return res.status(400).json({
          message: 'Formato de fecha u hora inválido. Use YYYY-MM-DD y HH:MM.',
        });
      }

      // Validar que no sea en el pasado
      if (fecha_inicio < new Date(Date.now() - 5 * 60000)) {
        return res.status(400).json({
          message: 'No se pueden agendar citas en el pasado.'
        });
      }

      const fecha_fin = new Date(fecha_inicio.getTime() + duracion * 60000);

      // Verificar conflictos
      const { data: citasEnConflicto, error: errorConflicto } = await supabase
        .from('citas')
        .select('id_cita')
        .eq('id_clinica', cita.id_clinica)
        .neq('id_cita', appointmentId) // Excluir la cita actual
        .neq('estado', 'cancelada')
        .lt('fecha_inicio', fecha_fin.toISOString())
        .gt('fecha_fin', fecha_inicio.toISOString());

      if (errorConflicto) {
        console.error('Error al verificar conflictos:', errorConflicto);
        return res.status(500).json({
          message: 'Error al verificar disponibilidad de la agenda'
        });
      }

      if (citasEnConflicto && citasEnConflicto.length > 0) {
        return res.status(409).json({
          message: 'Conflicto de horario. La hora seleccionada ya no está disponible.',
        });
      }

      // Actualizar fecha_inicio, fecha_fin y horario
      actualizacion.fecha_inicio = fecha_inicio.toISOString();
      actualizacion.fecha_fin = fecha_fin.toISOString();
      actualizacion.horario = newTimeSlot;
    }

    // Trazabilidad
    const nuevaTrazabilidad = Array.isArray(cita.trazabilidad)
      ? [...cita.trazabilidad]
      : [];
    nuevaTrazabilidad.push({
      accion: "modificacion",
      usuario: userId,
      fecha: new Date().toISOString(),
      detalles: { ...actualizacion },
    });
    actualizacion.trazabilidad = nuevaTrazabilidad;

    const { error: errorUpdate } = await supabase
      .from("citas")
      .update(actualizacion)
      .eq("id_cita", appointmentId);

    if (errorUpdate) {
      return res.status(500).json({ message: "Error al editar la cita" });
    }

    res.status(200).json({ message: "Cita editada exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Finalizar cita (solo vet)
router.put("/appointments/:appointmentId/finalize", async (req, res) => {
  const { appointmentId } = req.params;
  const { clinicaId, userType } = req.user;
  const {
    diagnostico,
    tratamiento,
    medicamentos,
    recomendaciones,
    instrucciones_seguimiento,
    notas_internas,
    servicios_adicionales,
    productos_vendidos,
  } = req.body;

  if (userType !== "vet") {
    return res
      .status(403)
      .json({ message: "Solo la clínica puede finalizar la cita" });
  }

  try {
    // Verificar que la cita pertenezca a la clínica
    const { data: cita, error: errorCita } = await supabase
      .from("citas")
      .select("id_cita, id_clinica, trazabilidad")
      .eq("id_cita", appointmentId)
      .eq("id_clinica", clinicaId)
      .single();

    if (errorCita || !cita) {
      return res
        .status(404)
        .json({ message: "Cita no encontrada o no pertenece a la clínica" });
    }

    const actualizacion = {
      estado: "finalizada",
    };
    if (diagnostico !== undefined) actualizacion.diagnostico = diagnostico;
    if (tratamiento !== undefined) actualizacion.tratamiento = tratamiento;
    if (medicamentos !== undefined) actualizacion.medicamentos = medicamentos;
    if (recomendaciones !== undefined)
      actualizacion.recomendaciones = recomendaciones;
    if (instrucciones_seguimiento !== undefined)
      actualizacion.instrucciones_seguimiento = instrucciones_seguimiento;
    if (notas_internas !== undefined)
      actualizacion.notas_internas = notas_internas;
    if (servicios_adicionales !== undefined)
      actualizacion.servicios_adicionales = servicios_adicionales;
    if (productos_vendidos !== undefined)
      actualizacion.productos_vendidos = productos_vendidos;

    // Trazabilidad
    const nuevaTrazabilidad = Array.isArray(cita.trazabilidad)
      ? [...cita.trazabilidad]
      : [];
    nuevaTrazabilidad.push({
      accion: "finalizacion",
      usuario: clinicaId,
      fecha: new Date().toISOString(),
      detalles: {
        diagnostico,
        tratamiento,
        medicamentos,
        recomendaciones,
        instrucciones_seguimiento,
        notas_internas,
        servicios_adicionales,
        productos_vendidos,
      },
    });
    actualizacion.trazabilidad = nuevaTrazabilidad;

    const { error: errorUpdate } = await supabase
      .from("citas")
      .update(actualizacion)
      .eq("id_cita", appointmentId);

    if (errorUpdate) {
      return res.status(500).json({ message: "Error al finalizar la cita" });
    }

    res.status(200).json({ message: "Cita finalizada exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Editar cita desde la clínica veterinaria (reprogramación)
router.put("/appointments/:appointmentId/reschedule", async (req, res) => {
  const { appointmentId } = req.params;
  const { clinicaId, userType } = req.user;
  const { date, timeSlot, message } = req.body;

  if (userType !== "vet") {
    return res
      .status(403)
      .json({ message: "Solo la clínica puede reprogramar la cita" });
  }

  if (!date || !timeSlot) {
    return res
      .status(400)
      .json({ message: "La fecha y el horario son obligatorios" });
  }

  try {
    // Verificar que la cita pertenezca a la clínica
    const { data: cita, error: errorCita } = await supabase
      .from("citas")
      .select("id_cita, id_clinica, id_servicio, trazabilidad, fecha_inicio, horario")
      .eq("id_cita", appointmentId)
      .eq("id_clinica", clinicaId)
      .single();

    if (errorCita || !cita) {
      return res
        .status(404)
        .json({ message: "Cita no encontrada o no pertenece a la clínica" });
    }

    // Obtener duración del servicio
    const { data: servicio, error: errorServicio } = await supabase
      .from('servicios')
      .select('duracion_minutos')
      .eq('id_servicio', cita.id_servicio)
      .single();

    if (errorServicio || !servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const duracion = servicio.duracion_minutos || 30;
    const isoStartTime = `${date}T${timeSlot}:00`;
    const fecha_inicio = new Date(isoStartTime);

    if (isNaN(fecha_inicio.getTime())) {
      return res.status(400).json({
        message: 'Formato de fecha u hora inválido. Use YYYY-MM-DD y HH:MM.',
      });
    }

    if (fecha_inicio < new Date(Date.now() - 5 * 60000)) {
      return res.status(400).json({
        message: 'No se pueden reprogramar citas en el pasado.'
      });
    }

    const fecha_fin = new Date(fecha_inicio.getTime() + duracion * 60000);

    // Verificar conflictos
    const { data: citasEnConflicto, error: errorConflicto } = await supabase
      .from('citas')
      .select('id_cita')
      .eq('id_clinica', clinicaId)
      .neq('id_cita', appointmentId)
      .neq('estado', 'cancelada')
      .lt('fecha_inicio', fecha_fin.toISOString())
      .gt('fecha_fin', fecha_inicio.toISOString());

    if (errorConflicto) {
      console.error('Error al verificar conflictos:', errorConflicto);
      return res.status(500).json({
        message: 'Error al verificar disponibilidad de la agenda'
      });
    }

    if (citasEnConflicto && citasEnConflicto.length > 0) {
      return res.status(409).json({
        message: 'Conflicto de horario. La hora seleccionada ya no está disponible.',
      });
    }

    const actualizacion = {
      fecha_inicio: fecha_inicio.toISOString(),
      fecha_fin: fecha_fin.toISOString(),
      horario: timeSlot,
      estado: "reprogramacion_sugerida",
      motivo_reprogramacion: message || "Reprogramado por la clínica",
    };

    // Trazabilidad
    const nuevaTrazabilidad = Array.isArray(cita.trazabilidad)
      ? [...cita.trazabilidad]
      : [];
    nuevaTrazabilidad.push({
      accion: "reprogramacion_clinica",
      usuario: clinicaId,
      fecha: new Date().toISOString(),
      detalles: {
        fecha_anterior: cita.fecha_inicio,
        horario_anterior: cita.horario,
        nueva_fecha: fecha_inicio.toISOString(),
        nuevo_horario: timeSlot,
        mensaje: message || "Reprogramado por la clínica",
      },
    });
    actualizacion.trazabilidad = nuevaTrazabilidad;

    const { error: errorUpdate } = await supabase
      .from("citas")
      .update(actualizacion)
      .eq("id_cita", appointmentId);

    if (errorUpdate) {
      console.error("Error reprogramando cita:", errorUpdate);
      return res.status(500).json({
        message: "Error al reprogramar la cita",
        error: errorUpdate.message,
        details: errorUpdate.details || errorUpdate,
      });
    }

    // TODO: Aquí se podría implementar el envío de notificaciones al cliente

    res.status(200).json({ message: "Cita reprogramada exitosamente" });
  } catch (error) {
    console.error("Error general reprogramando cita:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Reprogramar cita (solo dueño)
router.patch("/appointment/:id/reschedule", async (req, res) => {
  const { userId } = req.user;
  const appointmentId = req.params.id;
  const { date, time, reason } = req.body;

  if (!date || !time) {
    return res.status(400).json({ message: "Fecha y hora son requeridas." });
  }

  try {
    // Validar que la cita exista y pertenezca al usuario
    const { data: existing, error: fetchError } = await supabase
      .from("citas")
      .select("id_usuario, estado, id_clinica, id_servicio, trazabilidad, fecha_inicio, horario")
      .eq("id_cita", appointmentId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: "Cita no encontrada." });
    }

    if (existing.id_usuario !== userId) {
      return res.status(403).json({ message: "No tienes permiso para modificar esta cita." });
    }

    if (existing.estado === "cancelada" || existing.estado === "finalizada") {
      return res.status(400).json({ message: "No se puede reprogramar una cita cancelada o finalizada." });
    }

    // Obtener duración del servicio para calcular fecha_fin
    const { data: servicio, error: errorServicio } = await supabase
      .from('servicios')
      .select('duracion_minutos')
      .eq('id_servicio', existing.id_servicio)
      .single();

    if (errorServicio || !servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const duracion = servicio.duracion_minutos || 30;

    // Calcular fecha_inicio y fecha_fin
    const isoStartTime = `${date}T${time}:00`;
    const fecha_inicio = new Date(isoStartTime);

    // Validar formato de fecha/hora
    if (isNaN(fecha_inicio.getTime())) {
      return res.status(400).json({
        message: 'Formato de fecha u hora inválido. Use YYYY-MM-DD y HH:MM.',
      });
    }

    // Validar que la cita no sea en el pasado
    if (fecha_inicio < new Date(Date.now() - 5 * 60000)) {
      return res.status(400).json({
        message: 'No se pueden reprogramar citas en el pasado.'
      });
    }

    const fecha_fin = new Date(fecha_inicio.getTime() + duracion * 60000);

    // Verificar conflictos de horario
    const { data: citasEnConflicto, error: errorConflicto } = await supabase
      .from('citas')
      .select('id_cita')
      .eq('id_clinica', existing.id_clinica)
      .neq('id_cita', appointmentId) // Excluir la cita actual
      .neq('estado', 'cancelada')
      .lt('fecha_inicio', fecha_fin.toISOString())
      .gt('fecha_fin', fecha_inicio.toISOString());

    if (errorConflicto) {
      console.error('Error al verificar conflictos:', errorConflicto);
      return res.status(500).json({
        message: 'Error al verificar disponibilidad de la agenda'
      });
    }

    if (citasEnConflicto && citasEnConflicto.length > 0) {
      return res.status(409).json({
        message: 'Conflicto de horario. La hora seleccionada ya no está disponible.',
      });
    }

    // Preparar trazabilidad
    const nuevaTrazabilidad = Array.isArray(existing.trazabilidad)
      ? [...existing.trazabilidad]
      : [];

    nuevaTrazabilidad.push({
      accion: "reprogramacion_usuario",
      usuario: userId,
      fecha: new Date().toISOString(),
      detalles: {
        fecha_anterior: existing.fecha_inicio,
        horario_anterior: existing.horario,
        nueva_fecha: fecha_inicio.toISOString(),
        nuevo_horario: time,
        motivo: reason || "",
      },
    });

    // Actualizar la cita
    const { error: updateError } = await supabase
      .from("citas")
      .update({
        fecha_inicio: fecha_inicio.toISOString(),
        fecha_fin: fecha_fin.toISOString(),
        horario: time,
        motivo_reprogramacion: reason || null,
        estado: "pendiente", // Corregido el typo "pendi"
        trazabilidad: nuevaTrazabilidad,
        // NO actualizamos created_at
      })
      .eq("id_cita", appointmentId);

    if (updateError) {
      console.error("Error actualizando cita:", updateError);
      return res.status(500).json({ message: "Error al reprogramar la cita." });
    }

    return res.status(200).json({ message: "Cita reprogramada exitosamente." });
  } catch (err) {
    console.error("Error interno:", err);
    res.status(500).json({ message: "Error en el servidor." });
  }
});

// Cancelar una cita (solo dueño)
router.patch("/appointment/:id/cancel", async (req, res) => {
  const { userId } = req.user;
  const appointmentId = req.params.id;
  const { reason } = req.body;

  if (!reason || reason.trim() === "") {
    return res.status(400).json({ message: "El motivo de cancelación es obligatorio." });
  }

  try {
    // Validar que la cita existe y pertenece al usuario
    const { data: existing, error: fetchError } = await supabase
      .from("citas")
      .select("id_usuario, estado, trazabilidad")
      .eq("id_cita", appointmentId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: "Cita no encontrada." });
    }

    if (existing.id_usuario !== userId) {
      return res.status(403).json({ message: "No tienes permiso para cancelar esta cita." });
    }

    if (["cancelada", "completada"].includes(existing.estado)) {
      return res.status(400).json({ message: "La cita ya está cancelada o completada." });
    }

    // Preparar trazabilidad
    const nuevaTrazabilidad = Array.isArray(existing.trazabilidad)
      ? [...existing.trazabilidad]
      : [];

    nuevaTrazabilidad.push({
      accion: "cancelacion",
      usuario: userId,
      fecha: new Date().toISOString(),
      detalles: {
        motivo: reason,
      },
    });

    // Actualizar cita
    const { error: updateError } = await supabase
      .from("citas")
      .update({
        estado: "cancelada",
        trazabilidad: nuevaTrazabilidad,
        motivo_cancelacion: reason,
      })
      .eq("id_cita", appointmentId);

    if (updateError) {
      console.error("Error al cancelar cita:", updateError);
      return res.status(500).json({ message: "Error al cancelar la cita." });
    }

    res.status(200).json({ message: "Cita cancelada exitosamente." });
  } catch (err) {
    console.error("Error interno:", err);
    res.status(500).json({ message: "Error en el servidor." });
  }
});


export default router;
