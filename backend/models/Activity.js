// backend/models/Activity.js

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    // Link to the user who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    // The type of event that occurred
    activityType: {
      type: String,
      required: true,
      enum: ['ai_reply_sent'], // You can add more types later (e.g., 'credits_purchased')
    },
    // A user-friendly description of the event
    description: {
      type: String,
      required: true,
    },
    // How many credits were changed by this action
    creditChange: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;