// backend/routes/userRoutes.js

const express = require('express');
const router = express.Router();

// 1. Import the controller function we just created.
const { toggleAiBot } = require('../controllers/userController');

// 2. Import your existing authentication middleware.
const protect = require('../middleware/authMiddleware');

// 3. Define the route.
//    - It listens for POST requests to '/toggle-bot'.
//    - It first runs the 'protect' middleware to ensure the user is logged in.
//    - If the user is logged in, it then runs the 'toggleAiBot' controller function.
router.post('/toggle-bot', protect, toggleAiBot);

module.exports = router;