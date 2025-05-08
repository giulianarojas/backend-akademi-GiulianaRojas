const jwt = require('jsonwebtoken');

const User = require('../models/user');
const HttpError = require('../utils/errors/http-error');


//middleware de autenticacion que verifica el token
//verifica q el usuario esté autenticado 

const auth = async (req, res, next) => {
    try {
       //extrae token
       const token = req.header('Authorization').replace('Bearer', '');
       
       const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto123'); //verifica token

       const user = await User.findOne({ 
         _id: decoded.userId,
         'tokens.token': token,
         activo: true
       });

       if(!user) {
         throw new Error()
       }

       //guardar el usuario y token en el request

       req.token = token;
       req.user = user;
       next();
    } catch (error) {
        next(new HttpError('Por favor autenticate bien', 401));
    }
};


//middleware para verificar roles

const checkRole = (roles) => {
    return (req, res, next) => {
        if(!req.user) {
            return next (new HttpError('No tienes permiso para esto', 403));
        }

        next();
    };
};


module.exports = { auth, checkRole};