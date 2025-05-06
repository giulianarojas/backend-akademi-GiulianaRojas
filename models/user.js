const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require('bcryptjs');



const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true},
    rol: { type: String, enum: ['admin', 'recepcion']}
}, {
    timestamps: true
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});


userSchema.plugin(uniqueValidator, { message: 'Ya existe un usuario con ese {PATH}' });


module.exports = mongoose.model('user', userSchema); 