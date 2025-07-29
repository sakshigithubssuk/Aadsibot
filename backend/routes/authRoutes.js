// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();

// --- Middleware ---
const protect = require('../middleware/authmiddleware'); 

// --- Controllers ---
const { 
  registerUser, 
  loginUser, 
  getProfile 
} = require('../controllers/authController');

// --- DEFINE AUTHENTICATION ROUTES ---

// Handles user registration
router.post('/register', registerUser);

// Handles user login
router.post('/login', loginUser);

// Gets the profile of the currently logged-in user
router.get('/profile', protect, getProfile);

// All file upload logic has been moved to userRoutes.js where it belongs.

module.exports = router;
