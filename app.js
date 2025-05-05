const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');


const app = express();

app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

mongoose
   .connect('mongodb+srv://admin:admin@cluster1.uma4b4m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1')
   .then( () => {
    app.listen(3000);
   })
   .catch(err => {
    console.log(err);
   });

