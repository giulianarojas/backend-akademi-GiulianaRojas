const jwt = require('jsonwebtoken');

const User = require('../models/user');
const HttpError = require('../utils/errors/http-error');


//middleware de autenticacion que verifica el token
//verifica q el usuario esté autenticado 