import express from 'express';
import multer from 'multer';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { uploadFile } from '../utils.js';
import dotenv from 'dotenv';
import axios from 'axios';
import e from 'express';

dotenv.config();

const router = express.Router();

// Configurar conexión a la base de datos de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRolKey = process.env.SERVICE_ROL_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseServiceRolKey);
const MAPS_API_KEY = process.env.MAPS_API_KEY;

// Configurar multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Guardar temporalmente en la carpeta local /uploads
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // Obtener la extensión del archivo
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`; // Crear un nombre único
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Registro de clínica veterinaria
router.post(
  '/register/veterinary',
  upload.single('certificadoSalud'),
  async (req, res) => {
    // Log entry point
    console.log('[REGISTER_VET] Route handler started.');
    try {
      console.log('[REGISTER_VET] Inside try block.');
      // Log request body (excluding potentially large file info)
      console.log('[REGISTER_VET] Request body (excluding file):', {
        nombre: req.body.nombre,
        direccion: req.body.direccion,
        telefono: req.body.telefono,
        correo: req.body.correo,
        contrasenaProvided: !!req.body.contrasena,
        descripcion: req.body.descripcion,
        NIT: req.body.NIT,
        serviciosStringProvided: !!req.body.servicios,
      });
      // Log file info if present
      console.log(
        '[REGISTER_VET] Request file:',
        req.file
          ? {
              filename: req.file.filename,
              mimetype: req.file.mimetype,
              size: req.file.size,
            }
          : 'No file received'
      );

      const {
        nombre,
        direccion,
        telefono,
        correo,
        contrasena,
        descripcion,
        NIT,
        latitud,
        longitud,
        servicios: serviciosString,
      } = req.body;

      console.log('Datos recibidos:', {
        nombre,
        direccion,
        telefono,
        correo,
        contrasenaRecibida: !!contrasena,
        descripcion,
        NIT,
        latitud,
        longitud,
        serviciosRecibidos: !!serviciosString,
      });

      // Validación de campos vacios
      if (
        !nombre ||
        !direccion ||
        !telefono ||
        !correo ||
        !contrasena ||
        !NIT
      ) {
        console.log('Campos obligatorios faltantes');
        return res.status(400).json({
          message: 'Todos los campos obligatorios deben ser proporcionados.',
        });
      }

      console.log('[REGISTER_VET] Basic validation passed.');

      // --- START GEOCODING ---
      let latNum = null;
      let lngNum = null;

      if (direccion && MAPS_API_KEY) {
        console.log(`[REGISTER_VET] Attempting geocoding for: ${direccion}`);
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          direccion
        )}&key=${MAPS_API_KEY}&components=country:CO`;
        try {
          console.log('[REGISTER_VET] Calling Google Geocoding API...');
          const geocodeResponse = await axios.get(geocodeUrl);
          console.log(
            '[REGISTER_VET] Google Geocoding API response status:',
            geocodeResponse.status
          );
          if (
            geocodeResponse.data &&
            geocodeResponse.data.status === 'OK' &&
            geocodeResponse.data.results &&
            geocodeResponse.data.results.length > 0
          ) {
            const location = geocodeResponse.data.results[0].geometry.location;
            latNum = location.lat;
            lngNum = location.lng;
            console.log(
              `Geocodificación exitosa para "${direccion}": Lat: ${latNum}, Lng: ${lngNum}`
            );
          } else {
            console.warn(
              `Geocodificación no exitosa para "${direccion}": ${
                geocodeResponse.data.status
              } - ${geocodeResponse.data.error_message || 'No results found'}`
            );
            // Continues without coordinates if geocoding fails
          }
        } catch (geocodeError) {
          console.error(
            `[REGISTER_VET] Error calling Geocoding API: ${geocodeError.message}`
          );
          // Continues without coordinates if geocoding fails
        } finally {
          console.log('[REGISTER_VET] Geocoding block finished.');
        }
      } else {
        console.warn(
          '[REGISTER_VET] Skipping geocoding: No address or API key.'
        );
      }
      // --- END GEOCODING ---

      console.log('[REGISTER_VET] Parsing services...');
      // Parsear los servicios si existen
      let servicios = [];
      if (serviciosString) {
        try {
          servicios = JSON.parse(serviciosString);
          console.log('Servicios parseados:', servicios);
        } catch (parseError) {
          console.error('Error al parsear servicios:', parseError);
          return res.status(400).json({
            message: 'Error al procesar los servicios: formato inválido',
          });
        }
      }
      console.log('[REGISTER_VET] Services parsed.');

      // Obtener el archivo del certificado
      const certificadoFile = req.file;
      console.log(
        '[REGISTER_VET] Certificado file object:',
        certificadoFile ? 'Exists' : 'Does not exist'
      );

      // Verificar las variables de entorno de Supabase
      console.log('[REGISTER_VET] Checking Supabase env vars...');
      console.log('Variables de Supabase:', {
        urlDefinida: !!supabaseUrl,
        keyDefinida: !!supabaseServiceRolKey,
        clienteDefinido: !!supabaseClient,
      });

      // Verificar que supabaseClient esté definido
      if (!supabaseClient) {
        console.error('Error: supabaseClient no está definido');
        return res.status(500).json({
          message:
            'Error de configuración del servidor: Cliente de base de datos no disponible',
        });
      }

      console.log('[REGISTER_VET] Hashing password...');
      // Hash de la contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
      console.log('[REGISTER_VET] Password hashed.');

      const estado = 'confirmado';
      const fecha_registro = new Date();

      // Subir el archivo del certificado a Supabase
      let certificado_url = null;
      if (certificadoFile) {
        console.log('[REGISTER_VET] Attempting to upload certificate file...');
        try {
          certificado_url = await uploadFile(
            certificadoFile,
            'certificados-secretaria-salud'
          );
          console.log(
            '[REGISTER_VET] Certificate uploaded, URL:',
            certificado_url
          );
        } catch (uploadError) {
          console.error(
            '[REGISTER_VET] Error uploading certificate file:',
            uploadError
          );
          // Ensure temporary file is deleted even if upload fails
          try {
            fs.unlinkSync(certificadoFile.path);
            console.log(
              '[REGISTER_VET] Deleted temporary file after upload error.'
            );
          } catch (unlinkErr) {
            console.warn(
              '[REGISTER_VET] Could not delete temporary file after upload error:',
              unlinkErr
            );
          }
          return res.status(500).json({
            message: 'Error al procesar el archivo: ' + uploadError.message,
          });
        }
      }

      // Insercion en la tabla clinicas
      console.log('[REGISTER_VET] Inserting clinic data into Supabase...');
      const { data: clinica, error: errorClinica } = await supabaseClient
        .from('clinicas')
        .insert([
          {
            nombre,
            direccion,
            telefono,
            correo,
            contrasena: hashedPassword,
            descripcion,
            NIT,
            latitud: latNum,
            longitud: lngNum,
            estado,
            fecha_registro,
            certificado_url,
          },
        ])
        .select('id_clinica')
        .single();

      if (errorClinica) {
        console.error('Error de Supabase:', errorClinica);
        return res.status(400).json({
          message: 'Error al registrar la clínica: ' + errorClinica.message,
        });
      }

      console.log(
        '[REGISTER_VET] Clinic registered successfully in DB:',
        clinica
      );

      // Registrar servicios si existen
      let serviciosRegistrados = [];
      if (servicios && servicios.length > 0) {
        console.log(
          `[REGISTER_VET] Registering ${servicios.length} services for clinic ${clinica.id_clinica}...`
        );

        try {
          // Filtrar servicios válidos (con nombre y precio)
          const serviciosValidos = servicios.filter(
            (servicio) => servicio.name && servicio.price
          );

          if (serviciosValidos.length > 0) {
            // Preparar servicios para inserción
            const serviciosAInsertar = serviciosValidos.map((servicio) => {
              const precioNumerico = parseFloat(servicio.price);
              return {
                id_clinica: clinica.id_clinica,
                nombre: servicio.name,
                descripcion: '',
                precio: isNaN(precioNumerico) ? 0 : precioNumerico,
                categoria: servicio.category || 'general',
                disponible: true,
              };
            });

            // Insertar servicios
            const { data, error } = await supabaseClient
              .from('servicios')
              .insert(serviciosAInsertar)
              .select();

            if (error) {
              console.error(
                '[REGISTER_VET] Error registering services:',
                error
              );
            } else {
              console.log(
                `[REGISTER_VET] ${data.length} services registered successfully`
              );
              serviciosRegistrados = data;
            }
          } else {
            console.log('[REGISTER_VET] No valid services to register.');
          }
        } catch (serviciosError) {
          console.error(
            '[REGISTER_VET] Error processing services:',
            serviciosError
          );
          // No interrumpimos el flujo por un error en los servicios
        }
      }

      // Limpiar el archivo temporal only if it wasn't already cleaned up after an upload error
      if (certificadoFile && fs.existsSync(certificadoFile.path)) {
        console.log('[REGISTER_VET] Attempting to delete temporary file...');
        try {
          fs.unlinkSync(certificadoFile.path);
          console.log('[REGISTER_VET] Temporary file deleted successfully.');
        } catch (unlinkError) {
          console.warn(
            '[REGISTER_VET] Could not delete temporary file:',
            unlinkError
          );
        }
      }

      console.log('[REGISTER_VET] Sending success response...');
      res.status(201).json({
        message: 'Clínica registrada exitosamente',
        datosClinica: clinica,
        servicios: serviciosRegistrados,
      });
    } catch (error) {
      console.error('Error interno del servidor:', error);

      // Limpiar el archivo temporal en caso de error general no capturado antes
      try {
        const fileToClean = req.file; // Re-check req.file here
        if (fileToClean && fs.existsSync(fileToClean.path)) {
          fs.unlinkSync(fileToClean.path);
          console.log(
            '[REGISTER_VET] Cleaned up temporary file in final catch block.'
          );
        }
      } catch (cleanupError) {
        console.warn(
          '[REGISTER_VET] Error cleaning up temp file in final catch block:',
          cleanupError
        );
      }

      res.status(500).json({
        message: 'Error interno del servidor: ' + error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      });
    }
  }
);

// Endpoint para actualizar la información basica de la clínica veterinaria
router.put('/update/veterinary/info/:id_clinica', async (req, res) => {
  try {
    const { id_clinica } = req.params;
    const {
      nombre,
      telefono,
      NIT,
      direccion,
      ciudad,
      codigo_postal,
      correo,
      sitio_web,
      descripcion,
    } = req.body;

    // Geocodificación de la dirección si fue modificada
    let latitud = null;
    let longitud = null;

    if (direccion && MAPS_API_KEY) {
      console.log(`[UPDATE_VET] Attempting geocoding for: ${direccion}`);
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        direccion
      )}&key=${MAPS_API_KEY}&components=country:CO`;

      try {
        console.log('[UPDATE_VET] Calling Google Geocoding API...');
        const geocodeResponse = await axios.get(geocodeUrl);
        console.log(
          '[UPDATE_VET] Google Geocoding API response status:',
          geocodeResponse.status
        );

        if (
          geocodeResponse.data &&
          geocodeResponse.data.status === 'OK' &&
          geocodeResponse.data.results &&
          geocodeResponse.data.results.length > 0
        ) {
          const location = geocodeResponse.data.results[0].geometry.location;
          latitud = location.lat;
          longitud = location.lng;
          console.log(
            `Geocodificación exitosa para "${direccion}": Lat: ${latitud}, Lng: ${longitud}`
          );
        } else {
          console.warn(
            `Geocodificación no exitosa para "${direccion}": ${
              geocodeResponse.data.status
            } - ${geocodeResponse.data.error_message || 'No results found'}`
          );
          // Continue without coordinates if geocoding fails
        }
      } catch (geocodeError) {
        console.error(
          `[UPDATE_VET] Error calling Geocoding API: ${geocodeError.message}`
        );
        // Continue without coordinates if geocoding fails
      }
    }

    const datosActualizar = {
      nombre,
      direccion,
      telefono,
      correo,
      descripcion,
      NIT,
      sitio_web,
      codigo_postal,
      ciudad,
    };

    // Add coordinates only if they were found
    if (latitud !== null && longitud !== null) {
      datosActualizar.latitud = latitud;
      datosActualizar.longitud = longitud;
    }

    const { data, error: errorActualizacion } = await supabaseClient
      .from('clinicas')
      .update(datosActualizar)
      .eq('id_clinica', id_clinica)
      .select();

    if (errorActualizacion) {
      return res.status(400).json({
        message: 'Error al actualizar la información de la clínica',
        error: errorActualizacion.message,
      });
    }

    res.status(200).json({
      message: 'Información de la clínica actualizada exitosamente',
      data,
    });
  } catch (error) {
    console.error('Error al actualizar la información de la clínica:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para actualizar los horarios de la clínica veterinaria
router.put('/update/veterinary/hours/:id_clinica', async (req, res) => {
  try {
    const { id_clinica } = req.params;
    const { openingHours } = req.body;

    // Verificar que la clínica existe
    const { data: clinica, error: errorClinica } = await supabaseClient
      .from('clinicas')
      .select('id_clinica')
      .eq('id_clinica', id_clinica)
      .single();

    if (errorClinica || !clinica) {
      return res.status(404).json({
        message: 'Clínica no encontrada',
      });
    }

    // Primero, eliminar los horarios existentes
    const { error: errorBorrar } = await supabaseClient
      .from('horarios_atencion')
      .delete()
      .eq('id_clinica', id_clinica);

    if (errorBorrar) {
      return res.status(400).json({
        message:
          'Error al actualizar horarios: No se pudieron eliminar los horarios existentes',
        error: errorBorrar.message,
      });
    }

    // Preparar los nuevos horarios para inserción
    const nuevosHorarios = [];
    const diasSemana = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    diasSemana.forEach((dia) => {
      if (openingHours[dia]) {
        nuevosHorarios.push({
          id_clinica: id_clinica,
          dia_semana: dia,
          hora_apertura: openingHours[dia].is24Hours
            ? '00:00:00'
            : openingHours[dia].open + ':00',
          hora_cierre: openingHours[dia].is24Hours
            ? '23:59:59'
            : openingHours[dia].close + ':00',
          es_24h: openingHours[dia].is24Hours,
          esta_cerrado: openingHours[dia].closed,
        });
      }
    });

    // Insertar los nuevos horarios
    if (nuevosHorarios.length > 0) {
      const { data: horariosInsertados, error: errorInsercion } =
        await supabaseClient
          .from('horarios_atencion')
          .insert(nuevosHorarios)
          .select();

      if (errorInsercion) {
        return res.status(400).json({
          message: 'Error al insertar los nuevos horarios',
          error: errorInsercion.message,
        });
      }

      return res.status(200).json({
        message: 'Horarios actualizados exitosamente',
        horarios: horariosInsertados,
      });
    } else {
      return res.status(400).json({
        message: 'No se proporcionaron horarios válidos para actualizar',
      });
    }
  } catch (error) {
    console.error('Error al actualizar horarios:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

// Endpoint para actualizar los detalles adicionales de la clínica (especialidades, instalaciones, métodos de pago)
router.put('/update/veterinary/details/:id_clinica', async (req, res) => {
  try {
    const { id_clinica } = req.params;
    const { specialties, facilities, paymentMethods } = req.body;

    // Verificar que la clínica existe
    const { data: clinica, error: errorClinica } = await supabaseClient
      .from('clinicas')
      .select('id_clinica, detalles')
      .eq('id_clinica', id_clinica)
      .single();

    if (errorClinica || !clinica) {
      return res.status(404).json({
        message: 'Clínica no encontrada',
      });
    }

    // Preparar los detalles para actualizar
    const detallesActualizados = {
      especialidades: specialties || [],
      instalaciones: facilities || [],
      metodos_pago: paymentMethods || [],
    };

    // Actualizar los detalles en la tabla clinicas
    const { data, error: errorActualizacion } = await supabaseClient
      .from('clinicas')
      .update({ detalles: detallesActualizados })
      .eq('id_clinica', id_clinica)
      .select();

    if (errorActualizacion) {
      return res.status(400).json({
        message: 'Error al actualizar los detalles de la clínica',
        error: errorActualizacion.message,
      });
    }

    res.status(200).json({
      message: 'Detalles de la clínica actualizados exitosamente',
      data,
    });
  } catch (error) {
    console.error('Error al actualizar detalles de la clínica:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

// Endpoint para obtener toda la información de la clínica (información básica, horarios y detalles)
router.get('/veterinary/profile/:id_clinica', async (req, res) => {
  try {
    const { id_clinica } = req.params;

    // Obtener información básica de la clínica
    const { data: clinica, error: errorClinica } = await supabaseClient
      .from('clinicas')
      .select('*, detalles')
      .eq('id_clinica', id_clinica)
      .single();

    if (errorClinica || !clinica) {
      return res.status(404).json({
        message: 'Clínica no encontrada',
      });
    }

    // Obtener horarios de la clínica
    let horarios = [];
    let errorHorarios = null;
    try {
      const { data: fetchedHorarios, error: fetchError } = await supabaseClient
        .from('horarios_atencion')
        .select('*')
        .eq('id_clinica', id_clinica);

      if (fetchError) {
        console.error(
          `Error obteniendo los horarios de la clinica ${id_clinica}:`,
          fetchError.message
        );
        errorHorarios = fetchError; // Store the error
      } else {
        horarios = fetchedHorarios || [];
      }
    } catch (e) {
      console.error(
        `Excepción inesperada obteniendo los horarios de la clinica ${id_clinica}:`,
        e.message
      );
      errorHorarios = e; // Store the exception as an error
    }

    //Obtener imagenes de la clinica
    let photos = [];
    const { data: fetchedPhotos, error: errorPhotos } = await supabaseClient
      .from('fotos_clinicas')
      .select('id_foto, titulo, url, tipo')
      .eq('id_clinica', id_clinica);

    if (errorPhotos) {
      console.log(
        `Error obteniendo las fotos de la clinica ${id_clinica}:`,
        errorPhotos.message
      );
    } else {
      photos = fetchedPhotos || [];
    }

    //obtener los servicios de la clinica
    let services = [];
    const { data: fetchedServices, error: errorServices } = await supabaseClient
      .from('servicios')
      .select('*') // Select all columns for services
      .eq('id_clinica', id_clinica);

    if (errorServices) {
      // Log the error, but don't stop the entire profile retrieval
      console.error(
        `Error obteniendo los servicios de la clinica ${id_clinica}:`,
        errorServices.message
      );
      // Optionally, you could add an indicator to the response that services failed to load
    } else {
      services = fetchedServices || []; // Assign fetched services or empty array if null/undefined
    }

    //Obtener las reseñas de la clinica
    let reviews = [];
    const { data: fetchedReviews, error: errorReviews } = await supabaseClient
      .from('reseñas')
      // Format the 'fecha' column to 'YYYY-MM-DD HH24:MI' format
      .select(
        'id_resena, calificacion, comentario, fecha:fecha::text, usuarios(nombre)'
      )
      .eq('id_clinica', id_clinica);

    if (errorReviews) {
      console.error(
        `Error obteniendo las reseñas de la clinica ${id_clinica}: `,
        errorReviews.message // Corrected variable name here
      );
    } else {
      reviews = fetchedReviews || []; // Assign fetched reviews or empty array
    }

    // Formatear los horarios para el frontend
    let formattedOpeningHours = null; // Default to null

    if (!errorHorarios && horarios.length > 0) {
      formattedOpeningHours = {
        monday: {
          open: '09:00',
          close: '18:00',
          closed: true,
          is24Hours: false,
        },
        tuesday: {
          open: '09:00',
          close: '18:00',
          closed: true,
          is24Hours: false,
        },
        wednesday: {
          open: '09:00',
          close: '18:00',
          closed: true,
          is24Hours: false,
        },
        thursday: {
          open: '09:00',
          close: '18:00',
          closed: true,
          is24Hours: false,
        },
        friday: {
          open: '09:00',
          close: '18:00',
          closed: true,
          is24Hours: false,
        },
        saturday: {
          open: '09:00',
          close: '18:00',
          closed: true,
          is24Hours: false,
        },
        sunday: {
          open: '09:00',
          close: '18:00',
          closed: true,
          is24Hours: false,
        },
      };

      // Actualizar con los horarios reales
      horarios.forEach((horario) => {
        const dia = horario.dia_semana;
        if (formattedOpeningHours[dia]) {
          formattedOpeningHours[dia] = {
            open: horario.hora_apertura
              ? horario.hora_apertura.substring(0, 5)
              : '09:00',
            close: horario.hora_cierre
              ? horario.hora_cierre.substring(0, 5)
              : '18:00',
            closed: horario.esta_cerrado,
            is24Hours: horario.es_24h,
          };
        }
      });
    } else if (errorHorarios) {
      // Log error, formattedOpeningHours remains null
      console.log(
        `Horarios no disponibles para clinica ${id_clinica} debido a error: ${errorHorarios.message}`
      );
    } else {
      // No error, but no horarios found in DB, formattedOpeningHours remains null
      console.log(`No hay horarios registrados para clinica ${id_clinica}`);
    }

    // Extraer y formatear los detalles
    const specialties = clinica.detalles?.especialidades || [];
    const facilities = clinica.detalles?.instalaciones || [];
    const paymentMethods = clinica.detalles?.metodos_pago || [];

    // Quitar la contraseña del objeto que se retorna
    const { contrasena, ...clinicaInfo } = clinica;

    // Construir la respuesta completa
    const perfilCompleto = {
      ...clinicaInfo,
      openingHours: formattedOpeningHours,
      specialties,
      facilities,
      paymentMethods,
      photos,
      services,
      reviews,
    };

    res.status(200).json(perfilCompleto);
  } catch (error) {
    console.error('Error al obtener perfil de la clínica:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

// Endpoint: Obtener todas las clínicas veterinarias
router.get('/clinics', async (req, res) => {
  try {
    console.log('Obteniendo clínicas registradas...');

    const { data: clinicas, error } = await supabaseClient
      .from('clinicas')
      .select(
        'id_clinica, nombre, direccion, telefono, correo, certificado_url, latitud, longitud, detalles'
      );

    if (error) {
      console.error('Error consultando clínicas:', error);
      return res
        .status(400)
        .json({ message: 'Error al obtener clínicas: ' + error.message });
    }

    // Obtener las fotos principales de cada clínica
    const clinicasConFotos = await Promise.all(
      clinicas.map(async (clinica) => {
        const { data: fotos, error: errorFotos } = await supabaseClient
          .from('fotos_clinicas')
          .select('id_foto, titulo, url, tipo, es_principal')
          .eq('id_clinica', clinica.id_clinica)
          .order('es_principal', { ascending: false })
          .order('created_at', { ascending: false });

        if (errorFotos) {
          console.error(`Error obteniendo fotos para clínica ${clinica.id_clinica}:`, errorFotos);
          return { ...clinica, photos: [] };
        }

        return { ...clinica, photos: fotos || [] };
      })
    );

    res.status(200).json({
      message: 'Clínicas obtenidas exitosamente',
      clinicas: clinicasConFotos,
    });
  } catch (error) {
    console.error('Error interno al obtener clínicas:', error);
    res.status(500).json({ message: 'Error interno: ' + error.message });
  }
});

export default router;
