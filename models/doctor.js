const mongoose = require('mongoose');

//esquema para los doctores 

const doctorSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: [true, 'El nombre es obligatorio'] 
    },
    apellido: { 
        type: String, 
        required: [true, 'El apellido es obligatorio'] 
    },
    especialidad: { 
        type: String, 
        required: [true, 'La especialidad es obligatoria'],
        index: true // Índice para mejorar búsquedas por especialidad
    },
    matricula: { 
        type: String, 
        required: [true, 'La matrícula es obligatoria'],
        unique: true
    },
    telefono: { 
        type: String 
    },
    email: { 
        type: String 
    },
    horarioAtencion: [{ 
        dia: { 
            type: String, 
            enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        },
        horaInicio: { 
            type: String 
        },
        horaFin: { 
            type: String 
        }
    }],
    activo: { 
        type: Boolean, 
        default: true // para inhabilitar doctores sin eliminarlos
    },
    maxTurnosDiarios: { 
        type: Number, 
        default: 20 // valor predeterminado para control de sobrecarga
    },
    observaciones: { 
        type: String 
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Doctor', doctorSchema);
