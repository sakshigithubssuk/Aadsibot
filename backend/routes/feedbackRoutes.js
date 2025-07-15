const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const protect = require('../middleware/authmiddleware');

// Only logged-in users can submit feedback
router.post('/submit', protect, feedbackController.submitFeedback);

// Only admin can view all feedback (we’ll check admin later)
router.get('/all', protect, feedbackController.getAllFeedback);

module.exports = router;
