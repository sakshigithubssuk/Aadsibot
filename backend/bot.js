const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const Activity = require('./models/Activity');

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!telegramBotToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN missing in .env');
  process.exit(1);
}

let bot;

// Production = Webhook | Dev = Polling
if (process.env.NODE_ENV === 'production') {
  console.log('🌐 Telegram Bot: Running in PRODUCTION mode with WEBHOOK.');
  bot = new TelegramBot(telegramBotToken);
} else {
  console.log('🖥️ Telegram Bot: Running in DEVELOPMENT mode with POLLING.');
  bot = new TelegramBot(telegramBotToken, { polling: true });
}

// Message Handlers
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
      await bot.sendMessage(chatId, '❌ User not found.');
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
    console.error('Bot message error:', err.response ? err.response.data : err.message);
  }
});

module.exports = bot; // 👈 Export bot instance
