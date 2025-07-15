// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const protect = require('../middleware/authmiddleware');

router.post('/create-order', protect, createOrder);

// 👇 ENSURE THIS LINE EXISTS AND IS CORRECT 👇
router.post('/verify', protect, verifyPayment);


module.exports = router;