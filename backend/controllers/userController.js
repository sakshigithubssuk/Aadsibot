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
  console.log("inside uploadprofile picture");
  try {
    // req.file is populated by multer middleware
    console.log("inside try block");
    if (!req.file) {
      console.log("no file exist");
      return res.status(400).json({ message: 'No file uploaded. Please select an image.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.log("user not found");
      return res.status(404).json({ message: 'User not found.' });
    }

    // --- Delete old picture if it exists ---
    if (user.profilePicture) {
      // Construct the full path to the old file
      // process.cwd() gives the root directory of the project
      console.log("profile found")
      const oldPath = path.join(process.cwd(), 'public', user.profilePicture);
      
      // Check if file exists and delete it
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    const relativePath = req.file.path.replace('public', '');
    
    // On Windows, paths use backslashes. Convert them to forward slashes for URL compatibility.
    user.profilePicture = relativePath.replace(/\\/g, '/');
    
    await user.save();

    // Respond with the updated user object, as the frontend expects
    res.status(200).json({
      message: 'Profile picture uploaded successfully.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        telegramId: user.telegramId,
        isAiBotActive: user.isAiBotActive,
        profilePicture: user.profilePicture,
      }
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

        // If there's no picture to remove, just confirm success
        if (!user.profilePicture) {
            return res.status(200).json({ message: 'No profile picture to remove.', user });
        }

        // --- Delete the file from the filesystem ---
        const filePath = path.join(process.cwd(), 'public', user.profilePicture);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // --- Remove the path from the database ---
        user.profilePicture = null;
        await user.save();

        // Respond with the updated user object
        res.status(200).json({
            message: 'Profile picture removed successfully.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                credits: user.credits,
                telegramId: user.telegramId,
                isAiBotActive: user.isAiBotActive,
                profilePicture: user.profilePicture,
            }
        });

    } catch (error) {
        handleError(res, error, 'Error removing profile picture:');
    }
};
