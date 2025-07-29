const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// --- Middleware ---
const protect = require('../middleware/authmiddleware');

// --- Controllers ---
// Import the necessary controller functions
const { 
  uploadProfilePicture, 
  removeProfilePicture, 
  toggleAiBot 
} = require('../controllers/userController');

// --- MULTER CONFIGURATION FOR FILE UPLOADS ---
const profileUploadsDir = 'public/uploads/profiles';

// Ensure the directory exists so Multer doesn't fail
if (!fs.existsSync(profileUploadsDir)) {
  fs.mkdirSync(profileUploadsDir, { recursive: true });
}

// Set up the storage engine for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadsDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename to prevent conflicts
    cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Initialize Multer with the storage configuration
const upload = multer({ storage: storage });

// --- DEFINE USER ROUTES ---

// This route will now correctly match: POST /api/user/upload-profile
router.post(
  '/upload-profile', 
  protect, 
  upload.single('profileImage'), // This middleware processes the file
  uploadProfilePicture         // This controller saves the data
);


router.delete(
  '/remove-profile', 
  protect, 
  removeProfilePicture
);

// This route was already correct
router.post('/toggle-bot', protect, toggleAiBot);

module.exports = router;
