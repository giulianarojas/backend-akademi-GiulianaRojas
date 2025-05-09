const mongoose = require('mongoose');

 // esquema para los turnos médicos de la clínica

const appointmentSchema = new mongoose.Schema({
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paciente',
        required: [true, 'El paciente es obligatorio']
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: [true, 'El doctor es obligatorio']
    },
    fecha: {
        type: Date,
        required: [true, 'La fecha del turno es obligatoria']
    },
    hora: {
        type: String,
        required: [true, 'La hora del turno es obligatoria']
    },
    estado: {
        type: String,
        enum: ['pendiente', 'confirmado', 'cancelado', 'completado'],
        default: 'pendiente'
    },
}, {
    timestamps: true
});


// metodopara verificar disponibilidad del médico

appointmentSchema.statics.verificarDisponibilidad = async function(doctorId, fecha, hora) {
    const turnosExistentes = await this.countDocuments({
        doctor: doctorId,
        fecha: new Date(fecha),
        hora: hora,
        estado: { $ne: 'cancelado' } // excluir turnos cancelados
    });
    
    return turnosExistentes === 0;
};


module.exports = mongoose.model('appointment', appointmentSchema);