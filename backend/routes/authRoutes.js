const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');
const protect = require('../middleware/authmiddleware.js');

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/profile', protect, authController.getProfile);

module.exports = router;
