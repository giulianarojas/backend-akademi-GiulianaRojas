const user = require('../models/user');
const bcrypt = require('bcryptjs');



const register = async (req, res) => {
    try {
      const { nombre, email, password } = req.body;
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const nuevoUsuario = new user({ nombre, email, password: hashedPassword });
  
      await nuevoUsuario.save();
  
      res.status(201).json({ message: 'Usuario registrado' });
    } catch (error) {
      res.status(500).json({ message: 'Error al registrar usuario', error });
    }
  };

  module.exports = { register };