// backend/bot.js

// 1. LOAD ENVIRONMENT VARIABLES
const dotenv = require('dotenv');
dotenv.config();

// 2. IMPORT LIBRARIES
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const Activity = require('./models/Activity'); // 👈 1. IMPORT THE NEW ACTIVITY MODEL

// 3. INITIALIZE VARIABLES
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;
const mongoURI = process.env.MONGO_URI;

// 4. VALIDATE THAT VARIABLES LOADED CORRECTLY
if (!telegramBotToken || !mongoURI) {
  console.error('FATAL ERROR: TELEGRAM_BOT_TOKEN or MONGO_URI is not defined in your .env file.');
  console.error('Please check your .env file and its path. Exiting.');
  process.exit(1);
}

// 5. CONNECT TO MONGODB
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Telegram Bot: Successfully connected to MongoDB.'))
  .catch(err => {
    console.error('❌ Telegram Bot: MongoDB connection error:', err);
    process.exit(1);
  });

// 6. INITIALIZE THE TELEGRAM BOT
const bot = new TelegramBot(telegramBotToken, { polling: true });

// --- HANDLER FOR LINKING A USER'S ACCOUNT (No changes needed here) ---
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      await bot.sendMessage(chatId, '❌ Invalid link code. Please copy the code exactly from the website.');
      return;
    }
    const user = await User.findByIdAndUpdate(userId, { telegramId: chatId }, { new: true });
    if (!user) {
      await bot.sendMessage(chatId, '❌ User account not found.');
      return;
    }
    await bot.sendMessage(chatId, '✅ Success! Your Telegram account has been linked.');
  } catch (error) {
    console.error('Error during account linking:', error);
    await bot.sendMessage(chatId, 'An error occurred during linking.');
  }
});

// --- MAIN MESSAGE HANDLER (This is where the change happens) ---
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (messageText && messageText.startsWith('/')) return;
  if (msg.from.is_bot) return;

  try {
    const appUser = await User.findOne({ telegramId: chatId });
    if (!appUser || !appUser.isAiBotActive) return;
    if (appUser.credits <= 0) {
      await bot.sendMessage(chatId, "I cannot reply. Your owner's account is out of credits.");
      return;
    }

    await bot.sendChatAction(chatId, 'typing');

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      { contents: [{ parts: [{ text: messageText }] }] }
    );
    
    const aiReply = geminiResponse.data.candidates[0].content.parts[0].text;
    await bot.sendMessage(chatId, aiReply);

    // This part is the same
    appUser.credits -= 1;
    await appUser.save();

    // 👇 2. CREATE THE ACTIVITY LOG ENTRY
    // This logs the event to your new 'activities' collection.
    await Activity.create({
      user: appUser._id,
      activityType: 'ai_reply_sent',
      description: 'AI reply sent via Telegram Bot.',
      creditChange: -1, // Log that 1 credit was used
    });

  } catch (error) {
    console.error('Error processing AI reply:', error.response ? error.response.data : error.message);
  }
});


console.log('🚀 Telegram Bot server is running...');