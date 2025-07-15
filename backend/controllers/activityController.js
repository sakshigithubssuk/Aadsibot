// backend/controllers/activityController.js
const Activity = require('../models/Activity');

exports.getActivityHistory = async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user._id })
      .sort({ createdAt: -1 }) // Show the most recent activities first
      .limit(50); // Limit to the last 50 entries to avoid sending too much data

    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};