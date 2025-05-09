const express = require('express');
const router = express.Router();
const { 
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
} = require('../controllers/doctorController');
const { auth, checkRole } = require('../middleware/auth');
const { doctorValidator } = require('../utils/validators/validations');

//todas las rutas de doctores requieren autenticacion y son accesibiles con rol 'admin' o 'recepcion'

//listar
router.get('/', auth, checkRole(['admin', 'recepcion']), getAllDoctors);

//obtener un doctor especifico
router.get('/:doctorId', auth, checkRole(['admin', 'recepcion']), getDoctorById);

//crear nuevo doctor
router.post('/', auth, checkRole(['admin', 'recepcion']), doctorValidator, createDoctor);

//actualizar 
router.put('/:doctorId', auth, checkRole(['admin', 'recepcion']), updateDoctor);



module.exports = router;