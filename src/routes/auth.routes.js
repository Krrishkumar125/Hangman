const express = require('express');
const { register, login } = require('../controllers/auth.controller');
const { validate, registerValidation, loginValidation } = require('../middlewares/validator');

const router = express.Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);

module.exports = router;
