// backend/routes/activityRoutes.js
const express = require('express');
const router = express.Router();
const { getActivityHistory } = require('../controllers/activityController');
const protect = require('../middleware/authmiddleware');

// Route to get the history for the currently logged-in user
router.get('/history', protect, getActivityHistory);

module.exports = router;
