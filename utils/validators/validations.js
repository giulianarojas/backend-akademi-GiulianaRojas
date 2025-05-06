const { body } = require('express-validator');

const userValidator = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 caracteres'),
  body('nombre').not().isEmpty().withMessage('Nombre requerido'),
  body('rol').isIn(['admin', 'recepcion']).withMessage('Rol inválido')
];

module.exports = { userValidator };
