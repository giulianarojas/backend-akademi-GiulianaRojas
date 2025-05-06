const user = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HttpError = require('../util/errors/http-error');



// REGISTRO
const register = async (req, res, next) => {
  const errors = validationResult(req); // verifico si hay errores en los datos enviados
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos, revisá los campos.', 422));
  }

  const { nombre, email, password, rol } = req.body; // xtrae los datos del body de la solicitud

  let existingUser; //me fijo si ya existe un usuario con el mismo email en la bd
  try {
    existingUser = await user.findOne({ email });
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
    existingUser = await user.findOne({ email });
  } catch (err) {
    return next(new HttpError('error al buscar el usuario', 500));
  }

  if (!existingUser) {
    return next(new HttpError('Credenciales invlidas.', 403));
  }

  let isValidPassword;
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
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  } catch (err) {
    return next(new HttpError('Error al generar token.', 500));
  }

};


module.exports = {
  register,
  login
};