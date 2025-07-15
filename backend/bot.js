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
const isProd = process.env.NODE_ENV === 'production';

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
  // The webhook route is managed by server.js. We just initialize the bot here.
  bot = new TelegramBot(telegramBotToken);
} else {
  console.log('🖥️ Running in DEVELOPMENT mode with POLLING.');
  bot = new TelegramBot(telegramBotToken, { polling: true });
}

// 7. MESSAGE HANDLERS
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];

  console.log(`--- [${new Date().toISOString()}] Received /start command for user ID: ${userId} ---`);

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`[FAIL] Provided ID "${userId}" is not a valid ObjectId.`);
      await bot.sendMessage(chatId, '❌ Invalid link code.');
      return;
    }

    console.log('[OK] ID is valid. Querying database to find and update user...');
    const user = await User.findByIdAndUpdate(userId, { telegramId: chatId.toString() }, { new: true });

    if (!user) {
      console.log('[FAIL] Database query ran, but no user was found.');
      await bot.sendMessage(chatId, '❌ User account not found.');
      return;
    }

    console.log(`[SUCCESS] User ${user.username} successfully linked to Telegram chat ${chatId}.`);
    await bot.sendMessage(chatId, '✅ Telegram account linked!');
    console.log('--- End of /start command processing ---');

  } catch (err) {
    console.error('--- FATAL ERROR IN /start HANDLER ---');
    console.error(err); // Log the full error object
    await bot.sendMessage(chatId, '❌ Linking failed due to an unexpected server error.').catch(e => console.error("Additionally failed to send error message to user:", e));
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // Standard checks to ignore commands and other bots
  if (messageText && messageText.startsWith('/')) return;
  if (msg.from.is_bot) return;

  console.log(`--- [${new Date().toISOString()}] Received message from chat ID: ${chatId} ---`);

  try {
    console.log('Querying database for linked user...');
    const appUser = await User.findOne({ telegramId: chatId.toString() });

    if (!appUser) {
      console.log('[INFO] Message received from unlinked Telegram account. Ignoring.');
      return;
    }

    if (!appUser.isAiBotActive) {
      console.log(`[INFO] AI Bot is not active for user ${appUser.username}. Ignoring.`);
      return;
    }

    if (appUser.credits <= 0) {
      console.log(`[INFO] User ${appUser.username} has no credits left.`);
      await bot.sendMessage(chatId, "⚠️ You have no credits left to use the AI bot.");
      return;
    }

    console.log(`[OK] User ${appUser.username} is valid with ${appUser.credits} credits. Sending "typing" action.`);
    await bot.sendChatAction(chatId, 'typing');

    console.log('Calling Google Gemini API...');
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      { contents: [{ parts: [{ text: messageText }] }] }
    );
    const aiReply = geminiResponse.data.candidates[0].content.parts[0].text;
    console.log('Successfully received reply from Gemini. Sending message to user...');

    await bot.sendMessage(chatId, aiReply);
    console.log('Message sent. Updating user credits and activity log...');

    appUser.credits -= 1;
    await appUser.save();
    await Activity.create({
      user: appUser._id,
      activityType: 'ai_reply_sent',
      description: 'AI reply sent via Telegram Bot.',
      creditChange: -1,
    });
    console.log('[SUCCESS] Credits and activity logged.');
    console.log('--- End of message processing ---');

  } catch (err) {
    console.error('--- FATAL ERROR IN MESSAGE HANDLER ---');
    console.error(err.isAxiosError ? err.toJSON() : err); // Log full Axios error or standard error
    await bot.sendMessage(chatId, '🤖 Sorry, I encountered an error and could not process your message.').catch(e => console.error("Additionally failed to send error message to user:", e));
  }
});

// 8. EXPORT THE BOT INSTANCE
module.exports = { bot };
