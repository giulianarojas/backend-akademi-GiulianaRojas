const Patient = require('../models/patient');
const HttpError = require('../utils/errors/http-error');
const { validationResult } = require('express-validator');

//obtener pacientes con filtros y paginacion
const getAllPatients = async(req, res, next) => {
    const { nombre, dni, coberturaMedica, page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber <= 0 || limitNumber <= 0) {
    return next(new HttpError('Parámetros de paginación inválidos', 400));
  }

  const filter = {};
   if (nombre) {
        filter.$or = [
            { nombre: new RegExp(nombre.trim(), 'i') },
            { apellido: new RegExp(nombre.trim(), 'i') }
        ];
   }
  if (dni) filter.dni = dni;
  if (coberturaMedica) {
     filter.coberturaMedica = new RegExp(coberturaMedica.trim(), 'i');
   }

   try {
        const totalPatients = await Patient.countDocuments(filter);
        const patients = await Patient.find(filter)
        .sort({ apellido: 1, nombre: 1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

        res.json({
        patients,
        totalPatients,
        totalPages: Math.ceil(totalPatients / limitNumber),
        currentPage: pageNumber
        });
    } catch (err) {
       next(new HttpError('Error al obtener pacientes', 500));
    }
}

//obtener un paciente por id 

const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return next(new HttpError('Paciente no encontrado', 404));
    res.json({ patient });
  } catch (err) {
    next(new HttpError('Error al obtener el paciente', 500));
  }
};


//crear nuevo paciente 

const createPatient = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos', 422));
  }

  const { nombre, apellido, dni, coberturaMedica } = req.body;

  try {
    const existingPatient = await Patient.findOne({ dni });
    if (existingPatient) {
      return next(new HttpError('Ya existe un paciente con ese DNI', 422));
    }

    const newPatient = new Patient({ nombre, apellido, dni, coberturaMedica });
    await newPatient.save();

    res.status(201).json({ message: 'Paciente creado correctamente', patient: newPatient });
  } catch (err) {
    next(new HttpError('Error al crear paciente', 500));
  }
};


//actualizar un paciente 

const updatePatient = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos', 422));
  }

  const { nombre, apellido, dni, coberturaMedica } = req.body;
  const { patientId } = req.params;

  try {
    const patient = await Patient.findById(patientId);
    if (!patient) return next(new HttpError('Paciente no encontrado', 404));

    // verifica si el DNI fue modificado y si ya existe
    if (dni && dni !== patient.dni) {
      const existingPatient = await Patient.findOne({ dni });
      if (existingPatient) return next(new HttpError('Ya existe un paciente con ese DNI', 422));
    }

    patient.nombre = nombre || patient.nombre;
    patient.apellido = apellido || patient.apellido;
    patient.dni = dni || patient.dni;
    patient.coberturaMedica = coberturaMedica || patient.coberturaMedica;

    await patient.save();
    res.json({ message: 'Paciente actualizado correctamente', patient });
  } catch (err) {
    next(new HttpError('Error al actualizar paciente', 500));
  }
};


//eliminar paciente 

const deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return next(new HttpError('Paciente no encontrado', 404));

    await patient.deleteOne(); 
    res.json({ message: 'Paciente eliminado correctamente' });
  } catch (err) {
    next(new HttpError('Error al eliminar paciente', 500));
  }
};


module.exports = { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient};