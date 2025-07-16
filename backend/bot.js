// 1. LOAD ENVIRONMENT VARIABLES
const dotenv = require('dotenv');
dotenv.config();

// 2. IMPORT LIBRARIES
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User'); // Ensure this path is correct
const Activity = require('./models/Activity'); // Ensure this path is correct

// 3. INITIALIZE VARIABLES
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;
const mongoURI = process.env.MONGO_URI;
const isProd = process.env.NODE_ENV === 'production';

// 4. VALIDATE THAT VARIABLES LOADED CORRECTLY
if (!telegramBotToken || !mongoURI || !geminiApiKey) {
    console.error('FATAL ERROR: One or more required environment variables (TELEGRAM_BOT_TOKEN, MONGO_URI, GEMINI_API_KEY) are missing in .env');
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
    bot = new TelegramBot(telegramBotToken);
} else {
    console.log('🖥️ Running in DEVELOPMENT mode with POLLING.');
    bot = new TelegramBot(telegramBotToken, { polling: true });
}

// --- 7. COMMAND HANDLERS ---

// '/start' command to link a user's account
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = match[1];

    console.log(`--- [/start] Received for user ID: ${userId} ---`);
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return bot.sendMessage(chatId, '❌ Invalid link code.');
        }
        const user = await User.findByIdAndUpdate(userId, { telegramId: chatId.toString() }, { new: true });
        if (!user) {
            return bot.sendMessage(chatId, '❌ User account not found.');
        }
        // CORRECTED from user.username to user.name
        console.log(`[SUCCESS] User ${user.name} linked to chat ${chatId}.`);
        await bot.sendMessage(chatId, `✅ Telegram account linked to ${user.name}!`);
    } catch (err) {
        console.error('--- FATAL ERROR IN /start HANDLER ---', err);
        await bot.sendMessage(chatId, '❌ Linking failed due to a server error.');
    }
});

// --- NEW PERSONALIZATION COMMANDS ---

// '/remember' command to save information
bot.onText(/\/remember (\w+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const tag = match[1].toLowerCase();
    const content = match[2];

    try {
        const user = await User.findOne({ telegramId: chatId.toString() });
        if (!user) return bot.sendMessage(chatId, "Please link your account with /start first.");

        // Prevents duplicate tags by removing any old note with the same tag
        user.notes = user.notes.filter(note => note.tag !== tag);
        user.notes.push({ tag, content });
        await user.save();

        await bot.sendMessage(chatId, `✅ Got it. I'll remember that **${tag}** is "${content}".`, { parse_mode: 'Markdown' });
        console.log(`[MEMORY] User ${user.name} saved note with tag: ${tag}`);
    } catch (error) {
        console.error("Error in /remember command:", error);
        await bot.sendMessage(chatId, "Sorry, I had trouble remembering that.");
    }
});

// '/myinfo' command to see what the bot remembers
bot.onText(/\/myinfo/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const user = await User.findOne({ telegramId: chatId.toString() });
        if (!user || user.notes.length === 0) {
            return bot.sendMessage(chatId, "I don't have any information stored for you yet. Use `/remember <keyword> <information>` to teach me!");
        }
        let response = "Here's what I remember for you:\n\n";
        user.notes.forEach(note => {
            response += `• **${note.tag}**: ${note.content}\n`;
        });
        await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error("Error in /myinfo command:", error);
        await bot.sendMessage(chatId, "Sorry, I had trouble retrieving your information.");
    }
});

// '/forget' command to delete a piece of information
bot.onText(/\/forget (\w+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const tagToForget = match[1].toLowerCase();

    try {
        const user = await User.findOne({ telegramId: chatId.toString() });
        if (!user) return bot.sendMessage(chatId, "Please link your account first.");

        const initialNotesCount = user.notes.length;
        user.notes = user.notes.filter(note => note.tag !== tagToForget);

        if (user.notes.length === initialNotesCount) {
            return await bot.sendMessage(chatId, `🤔 I don't have any information stored with the keyword **${tagToForget}**.`, { parse_mode: 'Markdown' });
        }

        await user.save();
        await bot.sendMessage(chatId, `✅ Okay, I have forgotten about **${tagToForget}**.`, { parse_mode: 'Markdown' });
        console.log(`[MEMORY] User ${user.name} forgot note with tag: ${tagToForget}`);
    } catch (error) {
        console.error("Error in /forget command:", error);
        await bot.sendMessage(chatId, "Sorry, I had trouble forgetting that information.");
    }
});


// --- 8. UPGRADED MAIN MESSAGE HANDLER ---

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    // Ignore commands (handled by onText) and messages from other bots
    if (!messageText || messageText.startsWith('/') || msg.from.is_bot) {
        return;
    }

    console.log(`--- [GEMINI FLOW] Received message from chat ID: ${chatId} ---`);
    try {
        console.log('[GEMINI FLOW] 1. Finding user...');
        const appUser = await User.findOne({ telegramId: chatId.toString() });

        if (!appUser) {
            console.log('[GEMINI FLOW] [FAIL] User not found.');
            // You can optionally message the user to /start
            return bot.sendMessage(chatId, "I don't seem to know you. Please use your unique `/start` command to link your account.");
        }
        // CORRECTED from appUser.username to appUser.name
        console.log(`[GEMINI FLOW] [OK] User "${appUser.name}" found.`);

        if (!appUser.isAiBotActive) {
            console.log(`[GEMINI FLOW] [FAIL] Bot is not active for this user.`);
            return; // Don't message the user if the bot is off
        }

        if (appUser.credits <= 0) {
            console.log(`[GEMINI FLOW] [FAIL] User has no credits.`);
            return bot.sendMessage(chatId, "⚠️ You have no credits left. Please visit the website to top up.");
        }
        console.log(`[GEMINI FLOW] [OK] User has ${appUser.credits} credits.`);

        await bot.sendChatAction(chatId, 'typing');

        // --- THE MAGIC: CONSTRUCT THE PERSONALIZED PROMPT ---
        let systemPrompt = `You are a helpful AI assistant. Act naturally, as if you already know the information the user has provided. Do not mention that you have "stored information" or are "accessing notes". Just use the context seamlessly in your conversation.`;

        if (appUser.notes && appUser.notes.length > 0) {
            const userNotes = appUser.notes.map(n => `- ${n.tag}: ${n.content}`).join('\n');
            systemPrompt += `\n\n[START OF USER'S STORED INFORMATION]\n${userNotes}\n[END OF USER'S STORED INFORMATION]`;
        }
        
        const fullPrompt = systemPrompt + "\n\nUser's message: " + messageText;
        console.log(`[GEMINI FLOW] 2. Constructed personalized prompt for user ${appUser.name}.`);
        // --- END OF THE MAGIC ---

        console.log(`[GEMINI FLOW] 3. Calling Google Gemini API...`);
        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
            { contents: [{ parts: [{ text: fullPrompt }] }] } // Use the new powerful prompt!
        );
        console.log(`[GEMINI FLOW] 4. Received response from Gemini.`);

        if (geminiResponse.data && geminiResponse.data.candidates && geminiResponse.data.candidates.length > 0) {
            const aiReply = geminiResponse.data.candidates[0].content.parts[0].text;
            await bot.sendMessage(chatId, aiReply);
            console.log('[GEMINI FLOW] 5. Sent reply and updating database...');

            // Update credits and log activity
            appUser.credits -= 1;
            await appUser.save();
            await Activity.create({
                user: appUser._id,
                activityType: 'ai_reply_sent',
                description: 'AI reply sent via Telegram Bot.',
                creditChange: -1,
            });
            console.log(`[GEMINI FLOW] 6. [COMPLETE] User has ${appUser.credits} credits remaining.`);
        } else {
            console.log('[GEMINI FLOW] [FAIL] Gemini response was empty or blocked.');
            await bot.sendMessage(chatId, '🤖 I could not get a valid response. Please try rephrasing your message.');
        }
    } catch (err) {
        console.error('--- [GEMINI FLOW] FATAL ERROR ---', err.isAxiosError ? err.response.data : err);
        await bot.sendMessage(chatId, '🤖 Sorry, a critical error occurred. The developers have been notified.');
    }
});

// 9. EXPORT THE BOT INSTANCE
module.exports = { bot };
