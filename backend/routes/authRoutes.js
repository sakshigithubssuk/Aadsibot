// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const protect = require('../middleware/authmiddleware'); 

// Import the multer upload configuration middleware
const upload = require('../middleware/uploadMiddleware');

// --- Controllers ---
// Import controllers responsible for handling the request logic
const { registerUser, loginUser, getProfile } = require('../controllers/authController');
const { 
  uploadProfilePicture, 
  removeProfilePicture, 
  toggleAiBot 
} = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getProfile);
router.post('/upload-profile', protect, upload.single('profileImage'), uploadProfilePicture);
router.delete('/remove-profile', protect, removeProfilePicture);
router.patch('/toggle-bot', protect, toggleAiBot);
module.exports = router;
