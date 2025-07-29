// In backend/controllers/authController.js

const User = require('../models/User.js');
const jwt = require('jsonwebtoken');

// Generate JWT (This function is fine)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// --- CORRECTED registerUser FUNCTION ---
const registerUser = async (req, res) => {
  const { name, email, password, whatsappNumber } = req.body;
  // ... your validation logic ...

  const user = await User.create({ name, email, password, whatsappNumber });

  if (user) {
    // We send ALL the data the frontend needs to start a session correctly.
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      whatsappNumber: user.whatsappNumber,
      credits: user.credits,
      profilePicture: user.profilePicture,
      telegramId: user.telegramId,         // ADD THIS
      isAiBotActive: user.isAiBotActive,     // ADD THIS
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// --- CORRECTED loginUser FUNCTION ---
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // --- THIS IS THE FIX ---
    // The "Day Pass" now includes the "Telegram Stamp" and "Bot Status".
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      whatsappNumber: user.whatsappNumber,
      credits: user.credits,
      profilePicture: user.profilePicture,
      telegramId: user.telegramId,         // ADD THIS
      isAiBotActive: user.isAiBotActive,     // ADD THIS
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

// getProfile is fine, no changes needed
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
};
