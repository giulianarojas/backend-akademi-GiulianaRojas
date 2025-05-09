const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

//esquema para los pacientes 

const patientSchema = new mongoose.Schema({
    nombre: {
        type: String, 
        required: [true, 'El nombre es obligatorio']
    },
    apellido: { 
        type: String, 
        required: [true, 'El apellido es obligatorio'] 
    },
    dni: { 
        type: String, 
        required: [true, 'El DNI es obligatorio'],
        unique: true
    },
     coberturaMedica: {
     nombre: { type: String, required: true }
   }
});

patientSchema.plugin(uniqueValidator, { message: 'Ya existe un paciente con ese {PATH}' });

module.exports = mongoose.model('Paciente', patientSchema);