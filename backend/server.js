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
const { bot } = require('./bot'); // Import the bot instance

// 3. INITIALIZE EXPRESS APP
const app = express();
app.use(express.json());

// 4. CONFIGURE CORS FOR FLEXIBLE DEVELOPMENT
// This allows requests from both your live Vercel frontend and your local machine.
const allowedOrigins = [
  'https://aadsibot.vercel.app', // Production frontend
  'http://localhost:5173'       // Local development frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// 5. SETUP TELEGRAM WEBHOOK ROUTE
// This is where Telegram sends updates for your bot.
app.post(`/telegram-webhook`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200); // Acknowledge receipt of the update immediately
});

// 6. SETUP API ROUTES
// A simple "health check" endpoint to verify the server is running.
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy.' });
});

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
const isProd = process.env.NODE_ENV === 'production';

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // Set the bot's webhook URL when the server starts in production
  if (isProd) {
    const webhookUrl = `https://aadsibot.onrender.com/telegram-webhook`;
    bot.setWebHook(webhookUrl)
      .then(() => {
        console.log(`✅ Telegram webhook set to ${webhookUrl}`);
      })
      .catch((err) => {
        console.error('❌ Failed to set Telegram webhook:', err);
      });
  } else {
    console.log('🤖 Bot is running in development mode (polling).');
  }
});
