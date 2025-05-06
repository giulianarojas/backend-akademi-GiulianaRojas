const express = require('express');
const router = express.Router();
const { register } = require('../controllers/authController');
const { userValidator } = require('../util/validators/user-validator');

router.post('/register', userValidator, register);

module.exports = router;