// backend/controllers/userController.js

const User = require('../models/User'); // Import the User model

// @desc    Toggle the AI bot's active status for the logged-in user
// @route   POST /api/user/toggle-bot
// @access  Private
exports.toggleAiBot = async (req, res) => {
  try {
    // 1. Find the logged-in user using the ID from the 'protect' middleware.
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 2. Flip the boolean switch.
    //    If it was true, it becomes false. If it was false, it becomes true.
    user.isAiBotActive = !user.isAiBotActive;

    // 3. Save the updated user document back to the database.
    await user.save();

    // 4. Send a success response back to the frontend with the new status.
    res.status(200).json({
      message: `AI Bot is now ${user.isAiBotActive ? 'ACTIVE' : 'INACTIVE'}.`,
      isAiBotActive: user.isAiBotActive,
    });

  } catch (error) {
    console.error('Error toggling AI bot status:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};