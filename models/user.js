const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require('bcryptjs');


//esquena de usuario para el sistema, roles: 'admin' y 'recepcion'

const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true},
    rol: { type: String, enum: ['admin', 'recepcion'], required: true},
    activo: { type: Boolean, default: true }, //para dar de baja a usuarios sin eliminarlos
    resetPasswordToken: { type: String}, //token para recuperar contraseña

}, {
    timestamps: true
});


//middleware q se ejecuta antes de guardar un usuario
//encripta la contraseña

userSchema.pre('save', async function (next) {

    if (!this.isModified('password')) return next(); 

   /*//this.password = await bcrypt.hash(this.password, 10); next();*/ //modificacion, cambio por try catch

   try {
     this.password = await bcrypt.hash(this.password, 10);
     next();
    } catch (error) {
       next(error);
   }

});

//generar un token JWT y guardarlo en una coleccion de tokens


userSchema.methods.generateAuthToken = async function(jwt, secret) {
    const user = this;

    //crear nuevo token

    const token = jwt.sign(
        {
            userId: user._idtoString(),
            email: user.email,
            rol: user.rol
        },
        secret,
        {expiresIn: '24h'}
    );

    //añadir a la lista de tokens del us

    user.tokens = user.tokens.concat({token});

    //guardar el usuario con el nv token

    await user.save();

    return token;

}


//comparo contraseñas usando bcryp
userSchema.methods.comparePasword = async function(password) {
    return await bcrypt.compare(password, this.password);
};


//

userSchema.plugin(uniqueValidator, { message: 'Ya existe un usuario con ese {PATH}' });


module.exports = mongoose.model('user', userSchema); 