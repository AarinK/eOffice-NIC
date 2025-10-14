// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const ldapController = require('../controllers/ldapController');

router.post('/login', ldapController.login);

module.exports = router;
