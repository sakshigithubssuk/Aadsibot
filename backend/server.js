const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const authRoutes = require('./routes/authRoutes.js');
const feedbackRoutes = require('./routes/feedbackRoutes.js');
const paymentRoutes = require('./routes/paymentRoutes.js') ;
const userRoutes = require('./routes/userRoutes.js'); // 👈 1. IMPORT THE NEW USER ROUTE
const activityRoutes = require('./routes/activityRoutes.js'); 
const cors = require('cors');
require('./bot');


const app = express();
app.use(express.json());
// Allow frontend (React) to talk to backend (Node)
const allowedOrigins = [
  'http://localhost:5173',                  // Local React dev server
  'https://Aadsibot-frontend.vercel.app'    // Your Vercel frontend URL
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes); 
// server.js
app.use('/api/payment',paymentRoutes);
app.use('/api/user', userRoutes); // 👈 2. USE THE ROUTES WITH A BASE PATH
app.use('/api/activity', activityRoutes);
// DB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.error('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
