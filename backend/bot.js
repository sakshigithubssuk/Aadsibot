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

// In bot.js

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // Standard checks to ignore commands and other bots
  if (messageText && messageText.startsWith('/')) return;
  if (msg.from.is_bot) return;

  console.log(`--- [GEMINI FLOW] Received message from chat ID: ${chatId} ---`);

  try {
    console.log('[GEMINI FLOW] 1. Looking for user in database...');
    const appUser = await User.findOne({ telegramId: chatId.toString() });

    if (!appUser) {
      console.log('[GEMINI FLOW] 2a. [FAIL] User not found in DB. Ignoring message.');
      return;
    }
    console.log(`[GEMINI FLOW] 2b. [OK] User "${appUser.username}" found.`);

    if (!appUser.isAiBotActive) {
      console.log(`[GEMINI FLOW] 3a. [FAIL] AI Bot is not active for user. Ignoring.`);
      return;
    }
    console.log(`[GEMINI FLOW] 3b. [OK] Bot is active for user.`);

    if (appUser.credits <= 0) {
      console.log(`[GEMINI FLOW] 4a. [FAIL] User has no credits.`);
      await bot.sendMessage(chatId, "⚠️ You have no credits left to use the AI bot.");
      return;
    }
    console.log(`[GEMINI FLOW] 4b. [OK] User has ${appUser.credits} credits.`);
    
    await bot.sendChatAction(chatId, 'typing');

    // --- The Critical Gemini API Call ---
    console.log(`[GEMINI FLOW] 5. Preparing to call Google Gemini API.`);
    // Log the last 4 characters of the key to confirm it's loaded without exposing it.
    console.log(`   - Using API Key ending in: ...${geminiApiKey.slice(-4)}`);

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      { contents: [{ parts: [{ text: messageText }] }] }
    );

    console.log('[GEMINI FLOW] 6. [SUCCESS] Received a response from Gemini.');
    // Log the entire response data to see exactly what Google sent back.
    console.log('   - Full Gemini Response Data:', JSON.stringify(geminiResponse.data, null, 2));

    // Defensive parsing of the response
    if (geminiResponse.data && geminiResponse.data.candidates && geminiResponse.data.candidates.length > 0 && geminiResponse.data.candidates[0].content && geminiResponse.data.candidates[0].content.parts && geminiResponse.data.candidates[0].content.parts.length > 0) {
      const aiReply = geminiResponse.data.candidates[0].content.parts[0].text;
      console.log('[GEMINI FLOW] 7. [OK] Successfully parsed AI reply.');
      await bot.sendMessage(chatId, aiReply);
      console.log('[GEMINI FLOW] 8. [OK] Sent message to user. Updating credits...');
      
      appUser.credits -= 1;
      await appUser.save();
      await Activity.create({
        user: appUser._id,
        activityType: 'ai_reply_sent',
        description: 'AI reply sent via Telegram Bot.',
        creditChange: -1,
      });
      console.log('[GEMINI FLOW] 9. [COMPLETE] Process finished successfully.');

    } else {
      console.log('[GEMINI FLOW] 7. [FAIL] Gemini response was valid, but did not contain the expected text. It might be a safety block or empty reply.');
      await bot.sendMessage(chatId, '🤖 I received a response, but it was empty. Please try rephrasing your message.');
    }

  } catch (err) {
    console.error('--- [GEMINI FLOW] FATAL ERROR ---');
    if (err.isAxiosError) {
      // Axios errors are network-related and have rich details
      console.error('Axios Error! The request to Gemini failed.');
      console.error('Error Code:', err.code);
      console.error('Response Status:', err.response ? err.response.status : 'No response status');
      console.error('Response Data:', err.response ? JSON.stringify(err.response.data, null, 2) : 'No response data');
    } else {
      // Other errors (e.g., parsing, logic)
      console.error('A non-network error occurred:', err);
    }
    await bot.sendMessage(chatId, '🤖 Sorry, a critical error occurred while trying to process your request. The developers have been notified.').catch(e => console.error("Additionally failed to send error message to user:", e));
  }
});
// 8. EXPORT THE BOT INSTANCE
module.exports = { bot };
