require('dotenv').config();
const app = require('./app');
const connectDB = require('./db/mongoose'); 

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`corriendo en http://localhost:${PORT}`); 
  });
});