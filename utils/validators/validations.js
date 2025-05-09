const { body } = require('express-validator');
const Paciente = require('../../models/patient');
const Doctor = require('../../models/doctor');

//validacion para usuario

const userValidator = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 caracteres'),
  body('nombre').not().isEmpty().withMessage('Nombre requerido'),
  body('rol').isIn(['admin', 'recepcion']).withMessage('Rol invalido')
];

//para login

const loginValidator = [
  body('email').isEmail().withMessage('Ingresa un email valido'),
  body('password').not().isEmpty().withMessage('La contraseña es obligatoria')
];

//para email
const emailValidator = [
  body('email').normalizeEmail().isEmail().withMessage('Debes ingresar un email valido')
];

//para cambio de contrseña
const passwordValidator = [
  body('password').isLength({min: 6}).withMessage('La contraseña debe tener al menos 6 caracteres')
];

//validacion para pacientes
const patientValidator = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio'),
  body('dni').trim().notEmpty().withMessage('El DNI es obligatorio')
  .isInt().withMessage('El DNI debe ser un numero')
  .isLength({ min: 7 }).withMessage('El DNI debe tenrr al menos 7 digitos'),
  body('email').trim().normalizeEmail().isEmail().withMessage('Debe ser un email valido'),
  body('coberturaMedica.nombre').trim().notEmpty().withMessage('El nombre de la cobertura medica es obligatorio')
]

//validacion para dcotores
const doctorValidator = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio'),
  body('especialidad').trim().notEmpty().withMessage('La especialidad es obligatoria'),
  body('matricula').trim().notEmpty().withMessage('La matrícula es obligatoria'),
  body('activo')
    .optional()
    .isBoolean().withMessage('El campo activo debe ser true o false')
    .toBoolean()
];

//validacion para turnos
const turnoValidator = [
  body('paciente') .notEmpty().withMessage('El ID del paciente es obligatorio.')
    .custom(async (id) => {
      const existePaciente = await Paciente.findById(id);
      if (!existePaciente) {
        throw new Error('ID de paciente inválido.');
      }
    }),

  body('doctor').notEmpty().withMessage('El ID del doctor es obligatorio.')
    .custom(async (id) => {
      const existeDoctor = await Doctor.findById(id);
      if (!existeDoctor) {
        throw new Error('ID de doctor inválido.');
      }
    }),

  body('fecha').notEmpty().withMessage('La fecha es obligatoria.')
    .custom(async (fecha, { req }) => {
      if (!req.body.hora) throw new Error('La hora es obligatoria para validar la fecha completa.');
      const fechaHora = new Date(`${fecha}T${req.body.hora}`);
      const ahora = new Date();

      if (isNaN(fechaHora.getTime())) {
        throw new Error('Formato de fecha u hora inválido.');
      }

      if (fechaHora <= ahora) {
        throw new Error('El turno debe ser programado en el futuro.');
      }
    }),

  body('hora').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) .withMessage('La hora debe tener un formato válido (HH:MM).'),
  body('estado') .optional().isIn(['pendiente', 'confirmado', 'cancelado', 'completado']).withMessage('Estado inválido. Debe ser "pendiente", "confirmado", "cancelado" o "completado".')
];

const estadoValidator = [
  body('estado')
    .isIn(['pendiente', 'confirmado', 'cancelado', 'completado'])
    .withMessage('El estado debe ser uno de los siguientes: pendiente, confirmado, cancelado, completado'),
];



module.exports = { userValidator,loginValidator,
  passwordValidator, emailValidator, patientValidator, doctorValidator, turnoValidator, estadoValidator };
