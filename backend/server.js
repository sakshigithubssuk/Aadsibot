
const dotenv = require('dotenv');
dotenv.config();

// --- 2. IMPORTS ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const fs = require('fs');
const path = require('path');

// Import route handlers
const authRoutes = require('./routes/authRoutes.js');
const feedbackRoutes = require('./routes/feedbackRoutes.js');
const paymentRoutes = require('./routes/paymentRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const activityRoutes = require('./routes/activityRoutes.js');

// Initialize the Telegram Bot
require('./bot.js');

// --- 3. INITIALIZE EXPRESS APP ---
const app = express();

// --- 4. MIDDLEWARE CONFIGURATION ---
// CORS
app.use(cors({
  origin:  'https://aadsibot.vercel.app', // Your React app's URL
  credentials: true,
}));

// JSON Body Parser
app.use(express.json());
// This tells Express that the 'public' folder contains files that can be accessed directly by URL.
app.use(express.static('public'));
const uploadPath = path.join(__dirname, 'uploads/profile-pictures');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log('📁 Created uploads/profile-pictures folder');
}
// Static folder for profile pictures and other uploads 👇
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 5. API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/activity', activityRoutes);

// --- 6. DATABASE CONNECTION & SERVER STARTUP ---
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

if (!MONGO_URI) {
  console.error('❌ FATAL ERROR: MONGO_URI is not defined in the .env file.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

  
    server.setTimeout(5 * 60 * 1000); // 5 minutes

  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB');
    console.error(err);
    process.exit(1);
  });
