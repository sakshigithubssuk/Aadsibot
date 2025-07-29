const User = require('../models/User');
const fs = require('fs'); // Import Node.js File System module
const path = require('path'); // Import Node.js Path module

// Helper function to handle errors consistently
const handleError = (res, error, message = 'Server error.', statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ message });
};


exports.toggleAiBot = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.isAiBotActive = !user.isAiBotActive;
    await user.save();

    res.status(200).json({
      message: `AI Bot is now ${user.isAiBotActive ? 'ACTIVE' : 'INACTIVE'}.`,
      isAiBotActive: user.isAiBotActive,
    });

  } catch (error) {
    handleError(res, error, 'Error toggling AI bot status:');
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // If user already has a picture, delete the old one from the server
    if (user.profilePicture) {
      const oldPath = path.join(process.cwd(), 'public', user.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const newProfilePicturePath = `/uploads/profiles/${req.file.filename}`;
    
    user.profilePicture = newProfilePicturePath;
    await user.save();

    // Respond with the updated user object so the frontend can update its state
    res.status(200).json({
      message: 'Profile picture uploaded successfully.',
      user: { ...user.toObject(), profilePicture: user.profilePicture }
    });

  } catch (error) {
    handleError(res, error, 'Error uploading profile picture:');
  }
};

exports.removeProfilePicture = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.profilePicture) {
            const filePath = path.join(process.cwd(), 'public', user.profilePicture);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            user.profilePicture = null;
            await user.save(); // The 'user' variable is now updated with profilePicture: null
        }

        // --- THIS IS THE FIX ---
        // Send the updated user document directly.
        res.status(200).json({
            message: 'Profile picture removed successfully.',
            user: user
        });

    } catch (error) {
        handleError(res, error, 'Error removing profile picture:');
    }
};
