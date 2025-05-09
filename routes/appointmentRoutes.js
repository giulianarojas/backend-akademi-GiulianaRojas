const express = require('express');
const router = express.Router();
const { 
    getAppointments,
    getAppointmentById,
    createAppointment,
    editAppointment
} = require('../controllers/appointmentController');
const { auth, checkRole } = require('../middleware/auth');
const { turnoValidator, estadoValidator } = require('../utils/validators/validations');
const { body } = require('express-validator');



// Listar todos los turnos con filtros
router.get('/', auth, checkRole(['admin', 'recepcion']), getAppointments);

// Ver detalle de un turno
router.get('/:turnoId', auth, checkRole(['admin', 'recepcion']), getAppointmentById);

// Crear un nuevo turno
router.post('/', auth, checkRole(['admin', 'recepcion']), turnoValidator, createAppointment);

// Actualizar estado de un turno
router.patch('/:turnoId/estado', auth, checkRole(['admin', 'recepcion']), estadoValidator, editAppointment);



module.exports = router;