// backend/routes/userRoutes.js

const express = require('express');
const router = express.Router();

// 1. Import the controller function we just created.
const { toggleAiBot } = require('../controllers/userController');

// 2. Import your existing authentication middleware.
const protect = require('../middleware/authmiddleware');
router.post('/toggle-bot', protect, toggleAiBot);
module.exports = router;
