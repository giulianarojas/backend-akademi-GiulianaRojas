const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HttpError = require('../utils/errors/http-error');
const { validationResult } = require('express-validator');

const emailService = require('../utils/emails/emailService');



// REGISTRO de nuevo usuario en el sistema, es valido solo para administradores
const register = async (req, res, next) => {
  const errors = validationResult(req); // verifico si hay errores en los datos enviados
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos, revisá los campos.', 422));
  }

  const { nombre, email, password, rol } = req.body; // xtrae los datos del body de la solicitud

  let existingUser; //me fijo si ya existe un usuario con el mismo email en la bd
  try {
    existingUser = await User.findOne({ email });
  } catch (err) { 
    return next(new HttpError('Error al verificar el usuario.'));
  }

  if (existingUser) {
    return next(new HttpError('Ya existe un usuario con ese email.', 422));
  }

  const createdUser = new User({
    nombre,
    email,
    password, 
    rol,
    tokens: []
  });

  try {  // guardo el usuario en la bd
    await createdUser.save();

    res.status(201).json({
      mensaje: 'Usuario registrado',
      usuario: {
        id: createdUser.id,
        nombre: createdUser.nombre,
        email:createdUser.email,
        rol: createdUser.rol
      }
    });

  } catch (err) {
    return next(new HttpError('Error al registrar el usuario.', 500));
  }

};


// LOGIN
const login = async (req, res, next) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos. Revisá tus credenciales.', 422));
  }

  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(new HttpError('error al buscar el usuario', 500));
  }

  if (!existingUser) {
    return next(new HttpError('Credenciales invlidas.', 403));
  }

  let isValidPassword; //verifica si la contraseña es correcta
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError('Error', 500));
  }

  if (!isValidPassword) {
    return next(new HttpError('Contraseña incorrecta', 403));
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
        rol: existingUser.rol
      },
      process.env.JWT_SECRET || 'secreto123',
      { expiresIn: '1d' }
    );

    res.json({
      userId: existingUser.id,
      email: existingUser.email,
      rol: existingUser.rol,
      token
    });
  } catch (err) {
    return next(new HttpError('Error al generar token.', 500));
  }

};

//reestablecimiento de contraseña y envio un correo con el token

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  // busco  usuario por email
  let user;
  try {
    user = await User.findOne({ email, activo: true });
  } catch (err) {
    return next(new HttpError('Error al buscar usuario', 500));
  }

  if (!user) {
    return next(new HttpError('No existe usuario con ese email', 404));
  }

  // token JWT para recuperación de contraseña con duración de 1 hora
  let token;
  try {
    token = jwt.sign(
      { userId: user.id, email: user.email, action: 'password-reset' },
      process.env.JWT_SECRET || 'secreto123',
      { expiresIn: '1h' }
    );
  } catch (err) {
    return next(new HttpError('Error al generar el token de recuperación', 500));
  }
  // guardamos el token en el usuario 
  user.resetPasswordToken = token;

  try {
    await user.save();
    
    // servicio de emails para enviar el correo de recuperación
    await emailService.enviarEmailRecuperacion(
      user.email,
      user.nombre,
      token,
      req.get('host'),
      req.protocol
    );

    res.json({ mensaje: 'Se ha enviado un correo con instrucciones para recuperar tu contraseña' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    await user.save();

    return next(new HttpError('Error al enviar correo de recuperación', 500));
  }
};

//verificar el token de restablecimiento de contraseña
const verifyResetToken = async (req, res, next) => {
  const { token } = req.params;
  try {
    //verifica si el token JWT es válido
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'secreto123');
    
    // comprobamos que el token es para reseteo
    if (!decodedToken || decodedToken.action !== 'password-reset') {
      return next(new HttpError('Token inválido', 400));
    }
    
    // verificamos que el usuario existe y tiene este token asignado
    const user = await User.findOne({
      _id: decodedToken.userId,
      resetPasswordToken: token,
      activo: true
    });

    if (!user) {
      return next(new HttpError('Token inválido o usuario no encontrado', 400));
    }

    res.json({ mensaje: 'Token válido', userId: user._id });
  } catch (err) {
    // si esta expirado o es inválido lanzará una excepción
    return next(new HttpError('Token inválido o expirado', 400));
  }
};

//restablecer la contraseña con el token
const resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos, revisá los campos', 422));
  }

  const { token } = req.params;
  const { password } = req.body;
  
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'secreto123');
    
    // Comprobamos que el token es para reseteo
    if (!decodedToken || decodedToken.action !== 'password-reset') {
      return next(new HttpError('Token inválido', 400));
    }
    
    // buscamos al usuario
    const user = await User.findOne({
      _id: decodedToken.userId,
      resetPasswordToken: token,
      activo: true
    });

    if (!user) {
      return next(new HttpError('Token inválido o usuario no encontrado', 400));
    }

    // actualiza la contraseña y limpia
    user.password = password;
    user.resetPasswordToken = undefined;

    await user.save();

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    return next(new HttpError('Token inválido o expirado. Error: ' + err.message, 400));
  }
};

module.exports = { register,login, forgotPassword, verifyResetToken,resetPassword};