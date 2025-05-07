const express = require('express');
const router = express.Router();

const { register } = require('../controllers/authController');
const { userValidator } = require('../util/validators/user-validator');

const { auth, checkRole } = require('../middleware/auth');
const { body } = require('express-validator');


//validador para autenticacion

//para usuario
const userValidator = [
    body('nombre').trim().not().isEmpty().withMessage('El nombre es obligatorio'),
    body('email').normalizeEmail().isEmail().withMessage('Ingresa un email valido'),
    body('password').isLength({min: 6}).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol').isIn(['admin', 'recepcion']).withMessage('El rol debe ser admin o recepcion')
];

//login

const loginValidator = [
    body('email').normalizeEmail().withMessage('Ingresa un email valido'),
    body('password').not().isEmpty().withMessage('La contraseña es obligatoria')
];


const passwordValidator = [
    body('password').isLength({min: 6}).withMessage('La contraseña debe tener al menos 6 caracteres')
];


//rutas publicas q no requieren autenticarse

router.post('/login', loginValidator, login);

//recuperar contraseña

router.post('/forgot-password',
    body('email').normalizeEmail().isEmail().withMessage('ingresa un email valido'), forgotPassword
);

router.get('/reset-password/:token', verifyResetToken);
router.post('/reset-password/:token', passwordValidator, resetPassword);



//rutas solo para admin
//registar nuevo usuario que solo los administradores pueden hacerlo

router.post('/register', auth, checkRole(['admin']), userValidator, register);

//listar todos los usuarios
router.get('/users', auth, checkRole(['admin']), getAllUsers);


//obtener un usuario
router.get('/users/:userId', auth, checkRole(['admin']), getUserById);


//actualizar un usuario
router.put('/users/:userId', auth, checkRole(['admin']), updateUser);


//dar de baja un us
router.patch('/users/:userId/deactivate', auth, checkRole(['admin']), deactivateUser);




module.exports = router;