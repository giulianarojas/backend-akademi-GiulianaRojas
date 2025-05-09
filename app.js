const express = require('express');
const bodyParser = require('body-parser');

//rutas
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientsRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');



const HttpError = require('./utils/errors/http-error');


const app = express();


//parseo de json en solicitudes
app.use(bodyParser.json());

//rutas de api
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointment', appointmentRoutes);


//middleware para rutas no encontradas
app.use((req, res, next) => {
    next(new HttpError('no se encontro la ruta', 404));
});


 
module.exports = app;