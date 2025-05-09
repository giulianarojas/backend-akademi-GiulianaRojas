const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const HttpError = require('../utils/errors/http-error');
const Appointment = require('../models/appointment');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');

const getAppointments = async (req, res, next) => {
    const { paciente, doctor, fecha, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || pageNumber <= 0) {
        return next(new HttpError('Número de página inválido.', 400));
    }

    if (isNaN(limitNumber) || limitNumber <= 0) {
        return next(new HttpError('Número de resultados por página inválido.', 400));
    }

    const filter = {};

    try {
        if (paciente) {
            const pacienteExistente = await Patient.findById(paciente);
            if (!pacienteExistente) {
                return next(new HttpError('Paciente no encontrado.', 404));
            }
            filter.paciente = paciente;
        }

        if (doctor) {
            const doctorExistente = await Doctor.findById(doctor);
            if (!doctorExistente) {
                return next(new HttpError('Doctor no encontrado.', 404));
            }
            filter.doctor = doctor;
        }

        if (fecha) {
            const fechaInput = new Date(fecha);
            if (isNaN(fechaInput)) {
                return next(new HttpError('Formato de fecha inválido.', 400));
            }

            const siguienteDia = new Date(fechaInput);
            siguienteDia.setDate(siguienteDia.getDate() + 1);

            filter.fecha = { $gte: fechaInput, $lt: siguienteDia };
        }

        const totalTurnos = await Appointment.countDocuments(filter);
        const turnos = await Appointment.find(filter)
            .populate([
                { path: 'paciente', select: 'nombre' },
                { path: 'doctor', select: 'nombre especialidad' }
            ])
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .sort({ fecha: 1 });

        if (turnos.length === 0) {
            return next(new HttpError('No se encontraron turnos.', 404));
        }

        res.json({
            turnos: turnos.map(t => t.toObject({ getters: true })),
            totalTurnos,
            totalPaginas: Math.ceil(totalTurnos / limitNumber),
            paginaActual: pageNumber
        });
    } catch (err) {
        return next(new HttpError('Error al obtener los turnos.', 500));
    }
};


const getAppointmentById = async (req, res, next) => {
    const turnoId = req.params.id;

    let turno;
    try {
        turno = await Appointment.findById(turnoId)
            .populate([
                { path: 'paciente', select: 'nombre apellido' },
                { path: 'doctor', select: 'nombre especialidad' }
            ]);
    } catch (err) {
        return next(new HttpError('Error al buscar el turno.', 500));
    }

    if (!turno) {
        return next(new HttpError('Turno no encontrado.', 404));
    }

    res.json({ turno: turno.toObject({ getters: true }) });
};

const createAppointment = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return next(new HttpError('Datos inválidos. Verifica e intenta nuevamente.', 422));
  }

  const { patient, doctor, date, hour, state = 'confirmed' } = req.body;
  const inputDate = new Date(`${date}T${hour}`);

  // turno duplicado mismo doctor fecha y hora
  try {
      const existingAppointment = await Appointment.findOne({
          doctor,
          date: inputDate,
          state: 'confirmed'
      });

      if (existingAppointment) {
          return next(new HttpError('El doctor ya tiene un turno confirmado en ese día y hora.', 422));
      }
  } catch (err) {
      return next(new HttpError('No se pudo verificar la disponibilidad del turno.', 500));
  }

  //limite de 10 turnos por dia para el doctor
  try {
      const startOfDay = new Date(inputDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(inputDate);
      endOfDay.setHours(23, 59, 59, 999);

      const dailyCount = await Appointment.countDocuments({
          doctor,
          date: { $gte: startOfDay, $lte: endOfDay },
          state: 'confirmed'
      });

      if (dailyCount >= 10) {
          return next(new HttpError('El doctor ya tiene 10 turnos confirmados ese día.', 422));
      }
  } catch (err) {
      return next(new HttpError('No se pudo validar la cantidad de turnos diarios.', 500));
  }

  // validacion de existencia de paciente
  let patientObj;
  try {
      patientObj = await Patient.findById(patient);
      if (!patientObj) {
          return next(new HttpError('Paciente no encontrado.', 404));
      }
  } catch (err) {
      return next(new HttpError('Error al buscar al paciente.', 500));
  }

  // validacion de existencia y estado del doctor
  let doctorObj;
  try {
      doctorObj = await Doctor.findById(doctor);
      if (!doctorObj) {
          return next(new HttpError('Doctor no encontrado.', 404));
      }
      if (doctorObj.active !== 'active') {
          return next(new HttpError('No se puede asignar un turno a un doctor inactivo.', 400));
      }
  } catch (err) {
      return next(new HttpError('Error al buscar al doctor.', 500));
  }

  // crear el turno
  const createdAppointment = new Appointment({
      patient: patientObj._id,
      doctor: doctorObj._id,
      specialty: doctorObj.specialty,
      date: inputDate,
      state
  });

  //guardar y vincular el turno con paciente y doctor conn transacción
  const sess = await mongoose.startSession();
  sess.startTransaction();
  try {
      await createdAppointment.save({ session: sess });

      await Patient.updateOne(
          { _id: patientObj._id },
          { $push: { appointments: createdAppointment._id } },
          { session: sess }
      );

      await Doctor.updateOne(
          { _id: doctorObj._id },
          { $push: { appointments: createdAppointment._id } },
          { session: sess }
      );

      await sess.commitTransaction();
      sess.endSession();
  } catch (err) {
      sess.endSession();
      return next(new HttpError('No se pudo crear el turno. Intenta nuevamente.', 500));
  }

  //enviar mail 
  try {
      await emailService.sendConfirmationEmail({
          email: patientObj.email,
          name: patientObj.name,
          day: date,
          hour,
          doctor: doctorObj.name
      });
  } catch (err) {
      return next(new HttpError('No se pudo enviar el mail de confirmación.', 500));
  }

  res.status(201).json({ turno: createdAppointment.toObject({ getters: true }) });
};

const editAppointment = async (req, res, next) => {
    const { id } = req.params;
    const { paciente, doctor, fecha, hora, estado } = req.body;

    const camposPermitidos = ['paciente', 'doctor', 'fecha', 'estado'];
    const actualizaciones = Object.keys(req.body).filter(campo => camposPermitidos.includes(campo));

    if (!actualizaciones.every(campo => camposPermitidos.includes(campo))) {
        return next(new HttpError('Actualizaciones inválidas para el turno.', 400));
    }

    let turno;
    try {
        turno = await Turno.findById(id).populate('paciente').populate('doctor');
        if (!turno) {
            return next(new HttpError('Turno no encontrado.', 404));
        }
    } catch (err) {
        return next(new HttpError('Error al buscar el turno.', 500));
    }

    const nuevaFecha = fecha ? new Date(`${fecha}T${hora}`) : turno.fecha;
    const idDoctor = doctor || turno.doctor._id;

    const sesion = await mongoose.startSession();
    sesion.startTransaction();
    try {
        // Validar que no se solape con otro turno del mismo doctor
        const turnoExistente = await Turno.findOne({
            doctor: idDoctor,
            fecha: nuevaFecha,
            _id: { $ne: turno._id }
        });

        if (turnoExistente) {
            await sesion.abortTransaction();
            sesion.endSession();
            return next(new HttpError('El doctor ya tiene un turno en esa fecha y hora.', 400));
        }

        // Validar que no tenga más de 10 turnos en el día
        const inicioDelDia = new Date(nuevaFecha);
        inicioDelDia.setHours(0, 0, 0, 0);

        const finDelDia = new Date(nuevaFecha);
        finDelDia.setHours(23, 59, 59, 999);

        const cantidadDelDia = await Turno.countDocuments({
            doctor: idDoctor,
            fecha: { $gte: inicioDelDia, $lte: finDelDia },
            _id: { $ne: turno._id }
        });

        if (cantidadDelDia >= 10) {
            await sesion.abortTransaction();
            sesion.endSession();
            return next(new HttpError('El doctor ya tiene 10 turnos en ese día.', 422));
        }

        // Si cambió el paciente
        if (paciente && !turno.paciente._id.equals(paciente)) {
            const nuevoPaciente = await Paciente.findById(paciente);
            if (!nuevoPaciente) {
                await sesion.abortTransaction();
                sesion.endSession();
                return next(new HttpError('Paciente no encontrado.', 404));
            }

            await Paciente.updateOne(
                { _id: turno.paciente._id },
                { $pull: { turnos: turno._id } },
                { session: sesion }
            );

            await nuevoPaciente.updateOne(
                { $push: { turnos: turno._id } },
                { session: sesion }
            );

            turno.paciente = nuevoPaciente._id;
        }

        // Si cambió el doctor
        if (doctor && !turno.doctor._id.equals(doctor)) {
            const nuevoDoctor = await Doctor.findById(doctor);
            if (!nuevoDoctor || nuevoDoctor.activo !== 'activo') {
                await sesion.abortTransaction();
                sesion.endSession();
                return next(new HttpError('Doctor no encontrado o inactivo.', 400));
            }

            await Doctor.updateOne(
                { _id: turno.doctor._id },
                { $pull: { turnos: turno._id } },
                { session: sesion }
            );

            await nuevoDoctor.updateOne(
                { $push: { turnos: turno._id } },
                { session: sesion }
            );

            turno.doctor = nuevoDoctor._id;
            turno.especialidad = nuevoDoctor.especialidad;
        }

        // Actualizar campos simples
        if (actualizaciones.includes('fecha')) {
            turno.fecha = nuevaFecha;
        }

        if (actualizaciones.includes('estado')) {
            turno.estado = estado;
        }

        await turno.save({ session: sesion });

        await sesion.commitTransaction();
        sesion.endSession();

        res.status(200).json({ turno });
    } catch (err) {
        await sesion.abortTransaction();
        sesion.endSession();
        return next(new HttpError('No se pudo editar el turno. Intente nuevamente.', 500));
    }
};

module.exports = {  getAppointments, getAppointmentById, createAppointment, editAppointment };