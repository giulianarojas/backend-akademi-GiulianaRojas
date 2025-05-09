const express = require('express');
const router = express.Router();

const { register, login, forgotPassword, verifyResetToken,resetPassword } = require('../controllers/authController');

//importo validadores 
const { userValidator, loginValidator, passwordValidator, emailValidator} = require ('../utils/validators/validations')

const { auth, checkRole } = require('../middleware/auth'); 





//rutas publicas q no requieren autenticarse

router.post('/login', loginValidator, login);

//recuperar contraseña

router.post('/forgot-password', emailValidator, forgotPassword);


router.get('/reset-password/:token', verifyResetToken);
router.post('/reset-password/:token', passwordValidator, resetPassword);



//rutas solo para admin
//registar nuevo usuario que solo los administradores pueden hacerlo

router.post('/register', auth, checkRole(['admin']), userValidator, register);

//listar todos los usuarios
/*
router.get('/users', auth, checkRole(['admin']), getAllUsers);


//obtener un usuario
router.get('/users/:userId', auth, checkRole(['admin']), getUserById);


//actualizar un usuario
router.put('/users/:userId', auth, checkRole(['admin']), updateUser);


//dar de baja un us
router.patch('/users/:userId/deactivate', auth, checkRole(['admin']), deactivateUser);
*/



module.exports = router;