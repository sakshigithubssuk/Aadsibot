const User = require('../models/User.js');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @desc Register user
// @route POST /api/auth/register
const registerUser = async (req, res) => {
  const { name, email, password, whatsappNumber } = req.body;

  if (!name || !email || !password || !whatsappNumber) {
    return res.status(400).json({ message: 'Please provide all fields' });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = await User.create({
    name,
    email,
    password,
    whatsappNumber,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      whatsappNumber: user.whatsappNumber,
      credits: user.credits,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc Login user
// @route POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      whatsappNumber: user.whatsappNumber,
      credits: user.credits,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

// @desc Get current user profile
// @route GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
 module.exports={
  getProfile,
  registerUser,
  loginUser
 }



exports.updateProfilePictureUrl = async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ message: 'No image URL was provided.' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: imageUrl },
      { new: true }
    ).select('-password');
    
    res.json({
      message: 'Profile picture updated successfully',
      user,
    });

  } catch (error) {
    console.error("Error saving image URL to database:", error);
    res.status(500).json({ message: 'Server error while updating profile picture.' });
  }
};
