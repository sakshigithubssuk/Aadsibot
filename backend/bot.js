// 1. LOAD ENVIRONMENT VARIABLES
const dotenv = require('dotenv');
dotenv.config();

// 2. IMPORT LIBRARIES
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');
const chrono = require('chrono-node');
const { nanoid } = require('nanoid'); // Moved this import to the top with others

// 3. IMPORT DATABASE MODELS
const User = require('./models/User');
const Activity = require('./models/Activity');
const Reminder = require('./models/Reminder');
const FormData = require('form-data');
const fs = require('fs');



// 4. INITIALIZE & VALIDATE VARIABLES
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;
const mongoURI = process.env.MONGO_URI;
const stabilityApiKey = process.env.STABILITY_API_KEY;
const tenorApiKey = process.env.TENOR_API_KEY; // Added Tenor key
const isProd = process.env.NODE_ENV === 'production';

if (!telegramBotToken || !mongoURI || !geminiApiKey) {
    console.error('FATAL ERROR: One or more required environment variables are missing.');
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
    console.log('🌐 Running in PRODUCTION mode.');
    bot = new TelegramBot(telegramBotToken);
} else {
    console.log('🖥️ Running in DEVELOPMENT mode with POLLING.');
    bot = new TelegramBot(telegramBotToken, { polling: true });
}

// --- 7. HELPERS AND MIDDLEWARE ---

const withUser = (commandLogic) => async (msg, match) => {
    const chatId = msg.chat.id;
    try {
        const user = await User.findOne({ telegramId: chatId.toString() });
        if (!user) return bot.sendMessage(chatId, "Your Telegram account isn't linked. Please use your unique `/start` command first.");
        await commandLogic(msg, match, user);
    } catch (error) {
        console.error(`Error in withUser middleware for command ${match ? match[0] : 'N/A'}:`, error);
        await bot.sendMessage(chatId, "Sorry, a server error occurred while processing that.");
    }
};

// --- UPDATED HELP MESSAGE ---
const helpMessage = `
👋 **Welcome to Aadsibot!**

I'm your personal AI assistant. Here's a quick guide to my features:

**Conversation & AI:**
- Just chat with me! I can answer questions, write text, and more.

**Creative Tools:**
- \`/imagine <prompt>\`: Creates an AI-generated image.
- \`/gif <search term>\`: Finds a random GIF for you.

**Productivity & Memory:**
- \`/remind me to <task> at <time>\`: I'll set a reminder for you.
- \`/myreminders\`: View all your active reminders.
- \`/deletereminder <ID>\`: Deletes a specific reminder by its ID.
- \`/remember <keyword> <info>\`: Teach me something about you.
- \`/myinfo\`: See everything you've taught me.
- \`/forget <keyword>\`: Make me forget something.

**Help:**
- \`/help\`: Show this message again.
`;

// NEW: Helper function to call Gemini with automatic retries
async function callGeminiWithRetry(prompt, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            console.log(`[GEMINI] Calling API, attempt ${attempt + 1}...`);
            const geminiResponse = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
                { contents: [{ parts: [{ text: prompt }] }] }
            );
            return geminiResponse; // Success!
        } catch (error) {
            // Check for the specific "overloaded" error (503)
            if (error.isAxiosError && error.response && error.response.status === 503) {
                attempt++;
                if (attempt >= maxRetries) {
                    console.error(`[GEMINI] [FAIL] Model is overloaded. Max retries reached.`);
                    throw error; // Give up
                }
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff (2s, 4s...)
                console.warn(`[GEMINI] [RETRY] Model overloaded. Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // It was a different error, so don't retry.
                throw error;
            }
        }
    }
}


// --- 8. CORE COMMAND HANDLERS ---

bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = match[1];
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) return bot.sendMessage(chatId, '❌ Invalid link code.');
        
        const user = await User.findByIdAndUpdate(userId, { telegramId: chatId.toString() }, { new: true });
        if (!user) return bot.sendMessage(chatId, '❌ User account not found.');
        
        console.log(`[SUCCESS] User ${user.name} linked to chat ${chatId}.`);
        await bot.sendMessage(chatId, `✅ Welcome, ${user.name}! Your Telegram account is now linked.`);
        await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' }); // Send help on start
    } catch (err) {
        console.error('--- FATAL ERROR IN /start HANDLER ---', err);
        await bot.sendMessage(chatId, '❌ Linking failed due to a server error.');
    }
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
});

// --- 9. CREATIVE & MEDIA COMMANDS ---

bot.onText(/\/imagine (.+)/, withUser(async (msg, match, user) => {
    const chatId = msg.chat.id;
    const prompt = match[1]; 

    const imageCost = 5; 
    if (user.credits < imageCost) {
        return bot.sendMessage(chatId, `⚠️ You need at least ${imageCost} credits to generate an image. You have ${user.credits}.`);
    }

    bot.sendMessage(chatId, `🎨 Generating an image for: "${prompt}". This may take a moment...`);
    bot.sendChatAction(chatId, 'upload_photo');

    try {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('output_format', 'png');

        const response = await axios.post(
            'https://api.stability.ai/v2beta/stable-image/generate/core',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${stabilityApiKey}`,
                    'Accept': 'image/*'
                },
                responseType: 'arraybuffer'
            }
        );

        const imageBuffer = Buffer.from(response.data);
        await bot.sendPhoto(chatId, imageBuffer, { caption: `"${prompt}"` });

        user.credits -= imageCost;
        await user.save();
        await Activity.create({
            user: user._id,
            activityType: 'image_generated',
            description: `Generated image with prompt: ${prompt}`,
            creditChange: -imageCost,
        });
        console.log(`[IMAGE] User ${user.name} generated an image. They have ${user.credits} credits left.`);

    } catch (error) {
        console.error('[STABILITY AI ERROR]', error.response ? error.response.data.toString() : error.message);
        bot.sendMessage(chatId, "Sorry, I couldn't generate the image. The model might be busy or the prompt may have been rejected for safety reasons.");
    }
}));

// ADD THE /gif COMMAND HERE
bot.onText(/\/gif (.+)/, async (msg, match) => {
    if (!tenorApiKey) {
        return bot.sendMessage(msg.chat.id, "Sorry, the GIF feature is currently disabled by the administrator.");
    }
    const chatId = msg.chat.id;
    const searchTerm = match[1];
    await bot.sendChatAction(chatId, 'upload_photo');
    try {
        const response = await axios.get('https://tenor.googleapis.com/v2/search', {
            params: {
                key: tenorApiKey,
                q: searchTerm,
                limit: 20,
                media_filter: 'minimal'
            }
        });
        const gifs = response.data.results;
        if (gifs.length === 0) {
            return bot.sendMessage(chatId, `😢 Sorry, I couldn't find any GIFs for "${searchTerm}". Try another search!`);
        }
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        const gifUrl = randomGif.media_formats.gif.url;
        await bot.sendAnimation(chatId, gifUrl, {
            caption: `Here's a GIF for "${searchTerm}"`
        });
    } catch (error) {
        console.error('[TENOR API ERROR]', error.response ? error.response.data : error.message);
        await bot.sendMessage(chatId, "Sorry, I couldn't connect to the GIF library right now. Please try again later.");
    }
});



bot.on('photo', withUser(async (msg, match, user) => { // THE FIX: The signature now correctly accepts all 3 arguments
    const chatId = msg.chat.id;

    // --- 1. SET COST AND CHECK CREDITS ---
    const visionCost = 2; 
    if (user.credits < visionCost) {
        return bot.sendMessage(chatId, `⚠️ You need at least ${visionCost} credits to analyze an image. You have ${user.credits}.`);
    }

    // --- 2. GET THE USER'S PROMPT (THE CAPTION) ---
    const userPrompt = msg.caption || "Describe this image in detail."; 
    
    await bot.sendMessage(chatId, `🧠 Thinking about your request: "${userPrompt}"`);
    await bot.sendChatAction(chatId, 'typing');

    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;

    try {
        // --- 3. DOWNLOAD AND PREPARE IMAGE ---
        const fileStream = bot.getFileStream(fileId);
        const chunks = [];
        for await (const chunk of fileStream) { chunks.push(chunk); }
        const imageBuffer = Buffer.concat(chunks);
        const base64Image = imageBuffer.toString('base64');

        // --- 4. PREPARE THE DYNAMIC API REQUEST ---
        const requestPayload = {
            contents: [{
                parts: [
                    { text: userPrompt }, 
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }]
        };

        // --- 5. CALL THE LATEST GEMINI MODEL ---
        const geminiVisionUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;
        const response = await axios.post(geminiVisionUrl, requestPayload);

        if (!response.data.candidates || response.data.candidates.length === 0) {
            return bot.sendMessage(chatId, "I couldn't get a valid analysis for this image.");
        }

        const aiResponse = response.data.candidates[0].content.parts[0].text;

        // --- 6. SEND RESULT AND UPDATE CREDITS ---
        await bot.sendMessage(chatId, aiResponse);

        // This 'user' variable is now the correct Mongoose object, so .save() will work.
        user.credits -= visionCost;
        await user.save(); 

        await Activity.create({
            user: user._id,
            activityType: 'image_analyzed',
            description: `Analyzed image with prompt: ${userPrompt}`,
            creditChange: -visionCost,
        });
        console.log(`[VISION] User ${user.name} analyzed an image. They have ${user.credits} credits left.`);

    } catch (error) {
        console.error('[GEMINI 1.5 VISION ERROR]', error.response ? error.response.data.toString() : error.message);
        bot.sendMessage(chatId, "Sorry, a server error occurred while analyzing the image.");
    }
}));
// --- 10. MEMORY & REMINDER COMMANDS ---

bot.onText(/\/remember (\w+) (.+)/, withUser(async (msg, match, user) => {
    const tag = match[1].toLowerCase();
    const content = match[2];
    const existingNotes = user.notes || [];
    user.notes = existingNotes.filter(note => note.tag !== tag);
    user.notes.push({ tag, content });
    await user.save();
    await bot.sendMessage(msg.chat.id, `✅ Got it. I'll remember that **${tag}** is "${content}".`, { parse_mode: 'Markdown' });
    console.log(`[MEMORY] User ${user.name} saved note with tag: ${tag}`);
}));

bot.onText(/\/myinfo/, withUser(async (msg, match, user) => {
    if (!user.notes || user.notes.length === 0) {
        return bot.sendMessage(msg.chat.id, "I don't have any information stored for you yet.");
    }
    let response = "Here's what I remember for you:\n\n";
    user.notes.forEach(note => {
        response += `• **${note.tag}**: ${note.content}\n`;
    });
    await bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
}));

bot.onText(/\/forget (\w+)/, withUser(async (msg, match, user) => {
    const tagToForget = match[1].toLowerCase();
    const initialNotes = user.notes || [];
    const initialNotesCount = initialNotes.length;
    user.notes = initialNotes.filter(note => note.tag !== tagToForget);
    if (user.notes.length === initialNotesCount) {
        return await bot.sendMessage(msg.chat.id, `🤔 I don't have any information stored for **${tagToForget}**.`, { parse_mode: 'Markdown' });
    }
    await user.save();
    await bot.sendMessage(msg.chat.id, `✅ Okay, I have forgotten about **${tagToForget}**.`, { parse_mode: 'Markdown' });
    console.log(`[MEMORY] User ${user.name} forgot note with tag: ${tagToForget}`);
}));


bot.onText(/\/remind me to (.+)/, withUser(async (msg, match, user) => {
    const fullReminderText = match[1];
    const parsedResult = chrono.parse(fullReminderText, new Date(), { forwardDate: true });
    if (!parsedResult || parsedResult.length === 0) {
        return bot.sendMessage(msg.chat.id, "🤔 I couldn't understand the time. Try something like `...in 1 hour` or `...tomorrow at 9am`.");
    }
    const remindAt = parsedResult[0].start.date();
    const reminderMessage = fullReminderText.replace(parsedResult[0].text, '').trim();
    if (!reminderMessage) return bot.sendMessage(msg.chat.id, "Please provide a message for the reminder!");
    let shortId;
    let isUnique = false;
    while (!isUnique) {
        shortId = nanoid(6);
        const existing = await Reminder.findOne({ shortId: shortId });
        if (!existing) {
            isUnique = true;
        }
    }
    await Reminder.create({ 
        user: user._id, 
        chatId: msg.chat.id.toString(), 
        message: reminderMessage, 
        remindAt,
        shortId: shortId
    });
    const confirmationTime = remindAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    await bot.sendMessage(msg.chat.id, `✅ Okay, I will remind you to "${reminderMessage}" at ${confirmationTime}.`);
    console.log(`[REMINDER SET] User ${user.name} set a reminder with short ID: ${shortId}`);
}));

bot.onText(/\/myreminders/, withUser(async (msg, match, user) => {
    const reminders = await Reminder.find({ user: user._id, isSent: false }).sort({ remindAt: 1 });
    if (reminders.length === 0) {
        return bot.sendMessage(msg.chat.id, "You have no active reminders.");
    }
    let response = "Here are your active reminders:\n\n";
    reminders.forEach(r => {
        response += `• "${r.message}" at ${r.remindAt.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}\n  (ID: \`${r.shortId}\`)\n`;
    });
    response += "\nTo delete one, use `/deletereminder <ID>`.";
    await bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
}));

bot.onText(/\/deletereminder (\w{6})/, withUser(async (msg, match, user) => {
    const shortId = match[1];
    try {
        const reminder = await Reminder.findOne({ shortId: shortId, user: user._id });
        if (!reminder) {
            return bot.sendMessage(msg.chat.id, "🤔 I couldn't find a reminder with that ID.");
        }
        await Reminder.findByIdAndDelete(reminder._id);
        await bot.sendMessage(msg.chat.id, `✅ Reminder "${reminder.message}" has been deleted.`);
        console.log(`[REMINDER DELETED] User ${user.name} deleted reminder with shortId: ${shortId}`);
    } catch (error) {
        console.error("Error in /deletereminder:", error);
        await bot.sendMessage(msg.chat.id, "Sorry, a server error occurred.");
    }
}));


// --- 11. MAIN AI CONVERSATION HANDLER ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (!messageText || messageText.startsWith('/') || msg.from.is_bot) return;

    console.log(`--- [GEMINI FLOW] Received message from chat ID: ${chatId} ---`);
    try {
        const appUser = await User.findOne({ telegramId: chatId.toString() });
        if (!appUser) return bot.sendMessage(chatId, "Your account isn't linked. Please use `/start`.");

        if (!appUser.isAiBotActive) {
            console.log(`[GEMINI FLOW] [INFO] Bot is not active for this user.`);
            return;
        }

        if (appUser.credits <= 0) {
            console.log(`[GEMINI FLOW] [FAIL] User has no credits.`);
            return bot.sendMessage(chatId, "⚠️ You have no credits left. Please top up on the website and upgrade your plan.");
        }

        await bot.sendChatAction(chatId, 'typing');

        let systemPrompt = `You are a helpful AI assistant. Act naturally, as if you already know the information the user has provided. Do not mention that you have "stored information" or "accessing notes". Just use the context seamlessly in your conversation.`;
        if (appUser.notes && appUser.notes.length > 0) {
            const userNotes = appUser.notes.map(n => `- ${n.tag}: ${n.content}`).join('\n');
            systemPrompt += `\n\nHere is some context about the user you should know:\n${userNotes}`;
        }
        const fullPrompt = systemPrompt + "\n\nUser's message: " + messageText;

        const geminiResponse = await callGeminiWithRetry(fullPrompt);

        if (!geminiResponse.data.candidates || geminiResponse.data.candidates.length === 0) {
            console.log('[GEMINI FLOW] [FAIL] Gemini response was empty or blocked.');
            return bot.sendMessage(chatId, '🤖 I could not get a valid response. Please try rephrasing.');
        }

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
        console.log(`[GEMINI FLOW] [COMPLETE] User has ${appUser.credits} credits remaining.`);

    } catch (err) {
        console.error('--- [GEMINI FLOW] FATAL ERROR ---', err.isAxiosError ? err.response.data : err);
        await bot.sendMessage(chatId, '🤖 Sorry, a critical error occurred. The developers have been notified.');
    }
});


// --- 12. BACKGROUND SCHEDULER & ERROR HANDLERS ---
console.log('⏰ Reminder scheduler initialized. Checking every minute.');
cron.schedule('* * * * *', async () => {
    const dueReminders = await Reminder.find({ remindAt: { $lte: new Date() }, isSent: false });
    for (const reminder of dueReminders) {
        try {
            await bot.sendMessage(reminder.chatId, `🔔 **Reminder:**\n${reminder.message}`, { parse_mode: 'Markdown' });
            reminder.isSent = true;
            await reminder.save();
            console.log(`[REMINDER SENT] Sent reminder to chat ID ${reminder.chatId}`);
        } catch (error) {
            console.error(`[SCHEDULER] Failed to send reminder ${reminder._id}:`, error);
            reminder.isSent = true;
            await reminder.save();
        }
    }
});

bot.on('polling_error', (error) => console.log(`[POLLING ERROR] ${error.code}: ${error.message}`));
bot.on('webhook_error', (error) => console.log(`[WEBHOOK ERROR] ${error.code}: ${error.message}`));

// --- 13. EXPORT ---
module.exports = { bot };
