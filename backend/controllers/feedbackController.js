const Feedback = require('../models/Feedback');

// Submit Feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Feedback message is required.' });
    }

    const feedback = await Feedback.create({
      user: req.user._id, // req.user comes from authMiddleware
      message,
    });

    res.status(201).json({ message: 'Feedback submitted successfully!', feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get All Feedbacks (Admin)
exports.getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('user', 'name email whatsappNumber');
    res.status(200).json(feedbacks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
