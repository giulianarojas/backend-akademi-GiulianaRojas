const express = require('express');
const bodyParser = require('body-parser');

//rutas
const authRoutes = require('./routes/authRoutes');
const HttpError = require('./utils/errors/http-error');


const app = express();


//parseo de json en solicitudes
app.use(bodyParser.json());

//rutas de api
app.use('/api/auth', authRoutes);

//middleware para rutas no encontradas
app.use((req, res, next) => {
    next(new HttpError('no se encontro la ruta', 404));
});




 
module.exports = app;