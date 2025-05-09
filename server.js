require('dotenv').config();
const app = require('./app');
const connectDB = require('./db/mongoose'); 

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  console.log("Conexión a MongoDB exitosa");
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error al conectar a la base de datos:', err);
});