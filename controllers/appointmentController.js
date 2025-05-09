const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const HttpError = require('../utils/errors/http-error');
const Appointment = require('../models/appointment');
const Paciente = require('../models/patient');
const Doctor = require('../models/doctor');
const appointment = require('../models/appointment');

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
            const pacienteExistente = await Paciente.findById(paciente);
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
        return next(new HttpError('Datos inválidos, por favor verifique.', 422));
    }

    const { paciente, doctor, fecha, hora, estado = 'confirmado' } = req.body;

    let patientObj, doctorObj;

    try {
        patientObj = await Paciente.findById(paciente);
        if (!patientObj) {
            return next(new HttpError('Paciente no encontrado.', 404));
        }

        doctorObj = await Doctor.findById(doctor);
        if (!doctorObj) {
            return next(new HttpError('Doctor no encontrado.', 404));
        }
    } catch (err) {
        return next(new HttpError('Error al buscar paciente o doctor.', 500));
    }

    const inputDate = new Date(`${fecha}T${hora}`);
    const startOfDay = new Date(inputDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(inputDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        const dailyCount = await Appointment.countDocuments({
            doctor,
            fecha: { $gte: startOfDay, $lte: endOfDay },
            estado: 'confirmado'
        });

        if (dailyCount >= 8) {
            return next(new HttpError('El doctor ya tiene 8 turnos confirmados en esta fecha.', 400));
        }
    } catch (err) {
        return next(new HttpError('Error al verificar la disponibilidad del doctor.', 500));
    }

    const nuevoTurno = new Appointment({
        paciente: patientObj._id,
        doctor: doctorObj._id,
        fecha: inputDate,
        hora,
        estado
    });

    try {
        await nuevoTurno.save();

        res.status(201).json({ appointment: nuevoTurno });
    } catch (err) {
        return next(new HttpError('No se pudo crear el turno.', 500));
    }
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
        turno = await Appointment.findById(id).populate('paciente').populate('doctor');
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
        const turnoExistente = await Appointment.findOne({
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

        const cantidadDelDia = await Appointment.countDocuments({
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