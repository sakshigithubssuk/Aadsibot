// 1. LOAD ENVIRONMENT VARIABLES
const dotenv = require('dotenv');
dotenv.config();

// 2. IMPORT LIBRARIES
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const Activity = require('./models/Activity');

// 3. INITIALIZE VARIABLES
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;
const mongoURI = process.env.MONGO_URI;
const isProd = process.env.NODE_ENV === 'production'; // 👈 Detect production

// 4. VALIDATE THAT VARIABLES LOADED CORRECTLY
if (!telegramBotToken || !mongoURI) {
  console.error('FATAL ERROR: TELEGRAM_BOT_TOKEN or MONGO_URI is not defined in your .env file.');
  process.exit(1);
}

// 5. CONNECT TO MONGODB
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Telegram Bot: Connected to MongoDB.'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// 6. INITIALIZE TELEGRAM BOT
let bot;

if (isProd) {
  console.log('🌐 Running in PRODUCTION mode with WEBHOOK.');
  const webhookUrl = 'https://aadsibot.onrender.com/telegram-webhook'; 
  bot = new TelegramBot(telegramBotToken, { webHook: { port: process.env.PORT || 3000 } });
  bot.setWebHook(webhookUrl);
} else {
  console.log('🖥️ Running in DEVELOPMENT mode with POLLING.');
  bot = new TelegramBot(telegramBotToken, { polling: true });
}

// 7. MESSAGE HANDLERS
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      await bot.sendMessage(chatId, '❌ Invalid link code.');
      return;
    }
    const user = await User.findByIdAndUpdate(userId, { telegramId: chatId }, { new: true });
    if (!user) {
      await bot.sendMessage(chatId, '❌ User account not found.');
      return;
    }
    await bot.sendMessage(chatId, '✅ Telegram account linked!');
  } catch (err) {
    console.error('Error linking account:', err);
    await bot.sendMessage(chatId, '❌ Linking failed.');
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (messageText && messageText.startsWith('/')) return;
  if (msg.from.is_bot) return;

  try {
    const appUser = await User.findOne({ telegramId: chatId });
    if (!appUser || !appUser.isAiBotActive) return;
    if (appUser.credits <= 0) {
      await bot.sendMessage(chatId, "⚠️ No credits left.");
      return;
    }

    await bot.sendChatAction(chatId, 'typing');
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      { contents: [{ parts: [{ text: messageText }] }] }
    );
    const aiReply = geminiResponse.data.candidates[0].content.parts[0].text;
    await bot.sendMessage(chatId, aiReply);

    appUser.credits -= 1;
    await appUser.save();

    await Activity.create({
      user: appUser._id,
      activityType: 'ai_reply_sent',
      description: 'AI reply sent via Telegram Bot.',
      creditChange: -1,
    });

  } catch (err) {
    console.error('Error processing message:', err.response ? err.response.data : err.message);
  }
});

console.log('🚀 Telegram Bot server running...');
