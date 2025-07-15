// models/Feedback.js

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    // Link to the user who submitted the feedback.
    // 'ref: 'User'' allows us to use .populate() later.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', 
    },
    // The content of the feedback message.
    message: {
      type: String,
      required: [true, 'Feedback message cannot be empty.'],
      trim: true, // Removes whitespace from both ends
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` fields.
    timestamps: true,
  }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;