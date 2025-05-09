const { body } = require('express-validator');

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



module.exports = { userValidator,loginValidator,
  passwordValidator, emailValidator };
