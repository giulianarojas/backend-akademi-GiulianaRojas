const Doctor = require('../models/doctor');
const HttpError = require('../utils/errors/http-error');
const { validationResult } = require('express-validator');

//obtiene todos los doctores activos con filtro por especialidad 
//paginacion
const getAllDoctors = async (req, res, next) => {
  const { nombre, especialidad, page = 1, limit = 10 } = req.query;
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber <= 0 || limitNumber <= 0) {
    return next(new HttpError('Parámetros de paginación inválidos', 400));
  }

  const filter = { activo: true };
  if (nombre) {
    filter.$or = [
      { nombre: new RegExp(nombre.trim(), 'i') },
      { apellido: new RegExp(nombre.trim(), 'i') }
    ];
  }
  if (especialidad) {
    filter.especialidad = new RegExp(especialidad.trim(), 'i');
  }

  try {
    const totalDoctores = await Doctor.countDocuments(filter);
    const doctores = await Doctor.find(filter)
      .sort({ apellido: 1, nombre: 1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    res.json({
      doctores,
      totalDoctores,
      totalPages: Math.ceil(totalDoctores / limitNumber),
      currentPage: pageNumber
    });
  } catch (err) {
    next(new HttpError('Error al obtener doctores', 500));
  }
};


//obtener detalles de un doctor por id
const getDoctorById = async (req, res, next) => {
  const { doctorId } = req.params;

  try {
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return next(new HttpError('Doctor no encontrado', 404));
    }

    res.json({ doctor });
  } catch (err) {
    next(new HttpError('Error al obtener el doctor', 500));
  }
};

//crear nuevo doctor 

const createDoctor = async (req, res, next) => {
  // verifica errores de validación 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos, revise los campos', 422));
  }

  //extraer datos del body 
  const {
    nombre,
    apellido,
    especialidad,
    matricula,
    telefono,
    email,
    horarioAtencion,
    maxTurnosDiarios,
    observaciones
  } = req.body;

  // verifica si existe un doctor con la misma matricula
  try {
    const doctorExistente = await Doctor.findOne({ matricula });
    if (doctorExistente) {
      return next(new HttpError('Ya existe un doctor con esa matrícula', 422));
    }

    // crear el doctor 
    const nuevoDoctor = new Doctor({
      nombre,
      apellido,
      especialidad,
      matricula,
      telefono,
      email,
      horarioAtencion,
      maxTurnosDiarios,
      observaciones
    });

    // guarda en la base de datos 
    await nuevoDoctor.save();

    //responder 
    res.status(201).json({
      mensaje: 'Doctor registrado correctamente',
      doctor: nuevoDoctor
    });
  } catch (err) {
    next(new HttpError('Error al crear el doctor', 500));
  }
};

//actualizar la informacion de un doctor incluyendo la posibilidad de inhabilitar al doctor

const updateDoctor = async (req, res, next) => {
    const { doctorId } = req.params;

    //verificar errores de validacion
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return next(new HttpError('Datos invalidos, revise los campos', 422));
    }

    //extraer datos del body
    const {
        nombre,
        apellido,
        especialidad,
        matricula,
        telefono,
        email,
        horarioAtencion,
        activo,
        maxTurnosDiarios,
        observaciones
    } = req.body;


    try {
        const doctor = await Doctor.findById(doctorId);

        if(!doctor) {
            return next(new HttpError('Doctor no encontrado', 404));
        }

        //verificar si se esta cambiando la matricula y si no existe ya 
        if (matricula && matricula !== doctor.matricula) {
            const doctorExistente = await Doctor.findOne({ matricula });
            if (doctorExistente) {
                return next(new HttpError('Ya existe un doctor con esa matrícula', 422));
            }
        }

        //si el doctor se da de baja verificar que no tenga turnos futuros

        if (doctor.activo && activo === false) {
            const fechaActual = new Date();
            const turnosFuturos = await Turno.countDocuments({
                doctor: doctorId,
                fecha: { $gt: fechaActual },
                estado: { $in: ['pendiente', 'confirmado'] }
            });

            if (turnosFuturos > 0) {
              return next(new HttpError('No se puede dar de baja al doctor porque tiene turnos pendientes', 422));
            }
        }

        //actualizar propiedades
        doctor.nombre = nombre || doctor.nombre;
        doctor.apellido = apellido || doctor.apellido;
        doctor.especialidad = especialidad || doctor.especialidad;
        doctor.matricula = matricula || doctor.matricula;
        doctor.telefono = telefono || doctor.telefono;
        doctor.email = email || doctor.email;

        //actualizar horario de atencion 
        if (horarioAtencion && horarioAtencion.length > 0) {
            doctor.horarioAtencion = horarioAtencion;
        }

        //actualizar estado activo si se proporciono

        // Actualizar estado activo si se proporcionó
        if (activo !== undefined) {
         doctor.activo = activo;
        }
        
        doctor.maxTurnosDiarios = maxTurnosDiarios || doctor.maxTurnosDiarios;
        doctor.observaciones = observaciones || doctor.observaciones;

        //guardar cambios
        await doctor.save();

        //respuesta
        res.json({
            mensaje: 'Doctor actualizado correctamente',
            doctor
        });

    } catch (err) {
        next(new HttpError('Error al actualizar el doctor', 500));
    }
};


module.exports = {getAllDoctors, getDoctorById, createDoctor, updateDoctor};