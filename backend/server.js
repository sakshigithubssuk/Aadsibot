// 1. LOAD ENVIRONMENT VARIABLES
const dotenv = require('dotenv');
dotenv.config();

// 2. IMPORT LIBRARIES
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes.js');
const feedbackRoutes = require('./routes/feedbackRoutes.js');
const paymentRoutes = require('./routes/paymentRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const activityRoutes = require('./routes/activityRoutes.js');
const { bot } = require('./bot'); // 👈 1. IMPORT THE BOT INSTANCE

// 3. INITIALIZE EXPRESS APP
const app = express();
app.use(express.json());

// 4. CONFIGURE CORS
app.use(cors({
  origin: 'https://aadsibot.vercel.app',
  credentials: true
}));

// 5. SETUP TELEGRAM WEBHOOK ROUTE
//    The bot will receive updates from Telegram at this endpoint.
app.post(`/telegram-webhook`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200); // Acknowledge receipt of the update
});

// 6. SETUP API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/activity', activityRoutes);

// 7. CONNECT TO MONGODB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => {
  console.error('❌ MongoDB Error:', err);
  process.exit(1);
});

// 8. START THE SERVER
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('🚀 Telegram Bot server running...');
});
