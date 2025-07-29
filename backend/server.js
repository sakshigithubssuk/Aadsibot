const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const chrono = require('chrono-node');
const { nanoid } = require('nanoid');
const FormData = require('form-data');
const dateFnsTz = require('date-fns-tz');
const { zonedTimeToUtc, format } = dateFnsTz; // Correctly destructure both functions

// --- Part 2: Initialize the Express App ---
const app = express();
app.use(express.json());

// CORS Middleware
app.use(cors({
  origin: 'https://aadsibot.vercel.app',
  credentials: true,
}));

// --- Part 4: Environment Variable Validation ---
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;
const mongoURI = process.env.MONGO_URI;
const stabilityApiKey = process.env.STABILITY_API_KEY;
const tenorApiKey = process.env.TENOR_API_KEY;
const deepaiApiKey = process.env.DEEPAI_API_KEY;
const webhookUrl = process.env.WEBHOOK_URL;
const port = process.env.PORT || 5050;

if (!telegramBotToken || !mongoURI || !geminiApiKey || !webhookUrl) {
    console.error('FATAL ERROR: A required environment variable is missing.');
    process.exit(1); // Exit the process on fatal error
}

// --- Part 5: Database Connection ---
mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB connection successful.'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1); // Exit if DB connection fails
    });

// --- Part 6: Import Database Models and API Routes ---
const User = require('./models/User');
const Activity = require('./models/Activity');
const Reminder = require('./models/Reminder');

const authRoutes = require('./routes/authRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const activityRoutes = require('./routes/activityRoutes');

const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
const tempDownloadsDir = path.join(os.tmpdir(), 'bot-downloads');
if (!fs.existsSync(tempDownloadsDir)) {
  fs.mkdirSync(tempDownloadsDir, { recursive: true });
}
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/activity', activityRoutes);
// --- Part 8: Telegram Bot Setup & Logic ---
const bot = new TelegramBot(telegramBotToken, { polling: false });

const withUser = (commandLogic) => async (msg, match) => {
    const chatId = msg.chat.id;
    try {
        console.log(`[withUser] Authenticating user for chat ID: ${chatId}`);
        const user = await User.findOne({ telegramId: chatId.toString() });
        if (!user) {
            console.warn(`[withUser] Authentication failed: User not found for chat ID: ${chatId}`);
            return bot.sendMessage(chatId, "Your Telegram account isn't linked. Please use your unique `/start` command first.");
        }
        console.log(`[withUser] User ${user.name} authenticated. Proceeding.`);
        await commandLogic(msg, match, user);
    } catch (error) {
        console.error(`[withUser] Error in middleware for command ${match ? match[0] : 'N/A'}:`, error);
        await bot.sendMessage(chatId, "Sorry, a server error occurred while processing that.");
    }
};

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

async function callGeminiWithRetry(prompt, key, maxRetries = 3) {
    if (!key) {
        throw new Error("Gemini API key was not provided to callGeminiWithRetry function.");
    }
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const geminiResponse = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
                { contents: [{ parts: [{ text: prompt }] }] }
            );
            return geminiResponse;
        } catch (error) {
            if (error.isAxiosError && error.response && error.response.status === 503) {
                attempt++;
                if (attempt >= maxRetries) throw error;
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}
// All your bot.on() and bot.onText() handlers go here
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = match[1];
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) return bot.sendMessage(chatId, '❌ Invalid link code.');
        
        const user = await User.findByIdAndUpdate(userId, { telegramId: chatId.toString() }, { new: true });
        if (!user) return bot.sendMessage(chatId, '❌ User account not found.');
        
        console.log(`[SUCCESS] User ${user.name} linked to chat ${chatId}.`);
        await bot.sendMessage(chatId, `✅ Welcome, ${user.name}! Your Telegram account is now linked.`);
        await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('--- FATAL ERROR IN /start HANDLER ---', err);
        await bot.sendMessage(chatId, '❌ Linking failed due to a server error.');
    }
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
});


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
            { headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${stabilityApiKey}`, 'Accept': 'image/*' }, responseType: 'arraybuffer' }
        );

        const imageBuffer = Buffer.from(response.data);
        await bot.sendPhoto(chatId, imageBuffer, { caption: `"${prompt}"` });

        user.credits -= imageCost;
        await user.save();
        await Activity.create({ user: user._id, activityType: 'image_generated', description: `Generated image with prompt: ${prompt}`, creditChange: -imageCost });
        console.log(`[IMAGE] User ${user.name} generated an image. Credits left: ${user.credits}`);

    } catch (error) {
        console.error('[STABILITY AI ERROR]', error.response ? error.response.data.toString() : error.message);
        bot.sendMessage(chatId, "Sorry, I couldn't generate the image.");
    }
}));

bot.on('photo', withUser(async (msg, match, user) => {
    const chatId = msg.chat.id;
    const caption = msg.caption ? msg.caption.trim() : "";

    if (caption.startsWith('/cartoon')) {
        const cartoonCost = 3; 
        if (user.credits < cartoonCost) {
            return bot.sendMessage(chatId, `⚠️ You need at least ${cartoonCost} credits to cartoonify. You have ${user.credits}.`);
        }
        await bot.sendMessage(chatId, "🎨 Cartoonifying your image... Please wait.");
        await bot.sendChatAction(chatId, 'upload_photo');
        
        let tempFilePath;
        try {
            const photo = msg.photo[msg.photo.length - 1];
            // Use the correct serverless writable path
            tempFilePath = await bot.downloadFile(photo.file_id, downloadsDir);

            const form = new FormData();
            form.append('image', fs.createReadStream(tempFilePath));
            form.append('text', 'toonify');

            const response = await axios.post('https://api.deepai.org/api/image-editor', form, { headers: { ...form.getHeaders(), 'api-key': deepaiApiKey } });

            if (!response.data || !response.data.output_url) throw new Error('Invalid API response from DeepAI.');

            await bot.sendPhoto(chatId, response.data.output_url, { caption: "Here is your cartoon!" });

            user.credits -= cartoonCost;
            await user.save();
            await Activity.create({ user: user._id, activityType: 'image_cartoonified', description: 'Cartoonified an image.', creditChange: -cartoonCost });
            console.log(`[CARTOON] User ${user.name} cartoonified an image. Credits left: ${user.credits}`);

        } catch (error) {
            console.error('[DEEP AI ERROR]', error.response ? error.response.data : error.message);
            bot.sendMessage(chatId, "Sorry, I couldn't cartoonify the image.");
        } finally {
            if (tempFilePath) fs.unlinkSync(tempFilePath);
        }

    } else if (caption.startsWith('/')) {
        return; // Ignore other commands with photos to let their handlers work
    } else {
        const visionCost = 2; 
        if (user.credits < visionCost) {
            return bot.sendMessage(chatId, `⚠️ You need at least ${visionCost} credits to analyze an image. You have ${user.credits}.`);
        }
        const userPrompt = caption || "Describe this image in detail."; 
        await bot.sendMessage(chatId, `🧠 Analyzing your image with prompt: "${userPrompt}"`);
        await bot.sendChatAction(chatId, 'typing');

        const photo = msg.photo[msg.photo.length - 1];
        try {
            const fileStream = bot.getFileStream(photo.file_id);
            const chunks = [];
            for await (const chunk of fileStream) { chunks.push(chunk); }
            const base64Image = Buffer.concat(chunks).toString('base64');

            const geminiVisionUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;
            const response = await axios.post(geminiVisionUrl, {
                contents: [{ parts: [{ text: userPrompt }, { inline_data: { mime_type: "image/jpeg", data: base64Image } }] }]
            });

            if (!response.data.candidates || response.data.candidates.length === 0) {
                return bot.sendMessage(chatId, "I couldn't get a valid analysis for this image.");
            }
            const aiResponse = response.data.candidates[0].content.parts[0].text;
            await bot.sendMessage(chatId, aiResponse);

            user.credits -= visionCost;
            await user.save(); 
            await Activity.create({ user: user._id, activityType: 'image_analyzed', description: `Analyzed image with prompt: ${userPrompt}`, creditChange: -visionCost });
            console.log(`[VISION] User ${user.name} analyzed an image. Credits left: ${user.credits}`);
        } catch (error) {
            console.error('[GEMINI 1.5 VISION ERROR]', error.response ? error.response.data.toString() : error.message);
            bot.sendMessage(chatId, "Sorry, a server error occurred while analyzing the image.");
        }
    }
}));

bot.onText(/\/gif (.+)/, async (msg, match) => {
    if (!tenorApiKey) {
        return bot.sendMessage(msg.chat.id, "Sorry, the GIF feature is currently disabled.");
    }
    const chatId = msg.chat.id;
    const searchTerm = match[1];
    await bot.sendChatAction(chatId, 'upload_photo');
    try {
        const response = await axios.get('https://tenor.googleapis.com/v2/search', {
            params: { key: tenorApiKey, q: searchTerm, limit: 20, media_filter: 'minimal' }
        });
        const gifs = response.data.results;
        if (gifs.length === 0) {
            return bot.sendMessage(chatId, `😢 Sorry, couldn't find any GIFs for "${searchTerm}".`);
        }
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        const gifUrl = randomGif.media_formats.gif.url;
        await bot.sendAnimation(chatId, gifUrl, { caption: `Here's a GIF for "${searchTerm}"` });
    } catch (error) {
        console.error('[TENOR API ERROR]', error.response ? error.response.data : error.message);
        await bot.sendMessage(chatId, "Sorry, couldn't connect to the GIF library.");
    }
});

bot.onText(/\/remember (\w+) (.+)/, withUser(async (msg, match, user) => {
    const tag = match[1].toLowerCase();
    const content = match[2];
    user.notes = (user.notes || []).filter(note => note.tag !== tag);
    user.notes.push({ tag, content });
    await user.save();
    await bot.sendMessage(msg.chat.id, `✅ Got it. I'll remember that **${tag}** is "${content}".`, { parse_mode: 'Markdown' });
}));

bot.onText(/\/myinfo/, withUser(async (msg, match, user) => {
    if (!user.notes || user.notes.length === 0) return bot.sendMessage(msg.chat.id, "I don't have any information stored for you yet.");
    let response = "Here's what I remember for you:\n\n" + user.notes.map(note => `• **${note.tag}**: ${note.content}`).join('\n');
    await bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
}));

bot.onText(/\/forget (\w+)/, withUser(async (msg, match, user) => {
    const tagToForget = match[1].toLowerCase();
    const initialNotesCount = (user.notes || []).length;
    user.notes = (user.notes || []).filter(note => note.tag !== tagToForget);
    if (user.notes.length === initialNotesCount) return bot.sendMessage(msg.chat.id, `🤔 I don't have anything stored for **${tagToForget}**.`, { parse_mode: 'Markdown' });
    await user.save();
    await bot.sendMessage(msg.chat.id, `✅ Okay, I've forgotten about **${tagToForget}**.`, { parse_mode: 'Markdown' });
}));

// Replace your existing /remind me to handler with this
// =================================================================
// FINAL CORRECTED REMINDER HANDLERS
// =================================================================

bot.onText(/\/remind me to (.+)/s, withUser(async (msg, match, user) => {
    const chatId = msg.chat.id;
    const fullReminderText = match[1];

    try {
        const userTimezone = user.timezone || 'UTC'; 
        
        // chrono-node is powerful and will parse "after 10 minutes" and "at 6:10pm"
        const parsedResults = chrono.parse(fullReminderText, new Date(), { forwardDate: true });

        if (!parsedResults || parsedResults.length === 0) {
            return bot.sendMessage(chatId, "🤔 I couldn't understand the time. Please try being more specific, like `...in 10 minutes` or `...tomorrow at 7pm`.");
        }

        const parsedResult = parsedResults[0];
        const localParsedDate = parsedResult.start.date();
        
        // Extract the reminder message by removing the time part that chrono identified
        const reminderMessage = fullReminderText.replace(parsedResult.text, '').trim();

        if (!reminderMessage) {
            return bot.sendMessage(msg.chat.id, "Please provide a message for the reminder! Example: `/remind me to call mom at 8pm`");
        }

        const remindAtUtc = zonedTimeToUtc(localParsedDate, userTimezone);
        
        if (remindAtUtc < new Date()) {
            return bot.sendMessage(chatId, `The time you provided seems to be in the past. Please try again with a future time.`);
        }

        let shortId;
        while (true) {
            shortId = nanoid(6);
            if (!await Reminder.findOne({ shortId })) break;
        }

        await Reminder.create({
            user: user._id,
            chatId: msg.chat.id.toString(),
            message: reminderMessage,
            remindAt: remindAtUtc,
            shortId: shortId
        });

        const confirmationTime = format(remindAtUtc, "MMM d, yyyy, h:mm a (zzzz)", { timeZone: userTimezone });
        
        await bot.sendMessage(msg.chat.id, `✅ Okay, I will remind you to "${reminderMessage}" at ${confirmationTime}.`);

    } catch (error) {
        // This new catch block will give you a much more specific error message.
        console.error('[REMINDER PARSING ERROR]', error);
        bot.sendMessage(chatId, "Sorry, I encountered an error while setting your reminder. Please check your formatting and try again.");
    }
}));

// Replace your existing /myreminders handler with this
bot.onText(/\/myreminders/, withUser(async (msg, match, user) => {
    const reminders = await Reminder.find({ user: user._id, isSent: false }).sort({ remindAt: 1 });
    if (reminders.length === 0) {
        return bot.sendMessage(msg.chat.id, "You have no active reminders.");
    }

    const userTimezone = user.timezone || 'UTC';
    let response = "Here are your active reminders:\n\n";
    reminders.forEach(r => {
        // This will now work correctly
        const localTime = format(r.remindAt, 'MMM d, h:mm a', { timeZone: userTimezone });
        response += `• "${r.message}" at ${localTime}\n  (ID: \`${r.shortId}\`)\n`;
    });
    response += "\nTo delete one, use `/deletereminder <ID>`.";
    await bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
}));
bot.onText(/\/deletereminder (\w{6})/, withUser(async (msg, match, user) => {
    const shortId = match[1];
    const reminder = await Reminder.findOneAndDelete({ shortId: shortId, user: user._id });
    if (!reminder) return bot.sendMessage(msg.chat.id, "🤔 I couldn't find a reminder with that ID belonging to you.");
    await bot.sendMessage(msg.chat.id, `✅ Reminder "${reminder.message}" has been deleted.`);
}));

// Replace your existing bot.on('message', ...) handler with this
bot.on('message', async (msg) => {
    if (!msg || !msg.text || msg.text.startsWith('/') || (msg.from && msg.from.is_bot)) {
        return;
    }
    const chatId = msg.chat.id;
    const messageText = msg.text;

    console.log(`[FLOW START] Received message: "${messageText}" from chat ID: ${chatId}`);
    try {
        const appUser = await User.findOne({ telegramId: chatId.toString() });
        if (!appUser) {
            console.log("[FLOW END] User not found in database.");
            return bot.sendMessage(chatId, "Your account isn't linked. Please use your unique `/start` command first.");
        }

        if (!appUser.isAiBotActive) {
            console.log(`[FLOW END] Bot is not active for user ${appUser.name}.`);
            return; // Silently exit
        }

        if (appUser.credits <= 0) {
            console.log(`[FLOW END] User ${appUser.name} has no credits.`);
            return bot.sendMessage(chatId, "⚠️ You have no credits left. Please top up on the website to continue.");
        }

        await bot.sendChatAction(chatId, 'typing');

        let systemPrompt = `You are a helpful AI assistant...`; // Your full prompt logic
        if (appUser.notes && appUser.notes.length > 0) {
            systemPrompt += `\n\nHere is some context...: \n${appUser.notes.map(n => `- ${n.tag}: ${n.content}`).join('\n')}`;
        }
        const fullPrompt = systemPrompt + "\n\nUser's message: " + messageText;

        const geminiApiKey = process.env.GEMINI_API_KEY;
        const geminiResponse = await callGeminiWithRetry(fullPrompt, geminiApiKey);

        if (!geminiResponse || !geminiResponse.data.candidates || !geminiResponse.data.candidates.length === 0) {
            console.error("[GEMINI ERROR] Gemini response was empty or blocked.");
            return bot.sendMessage(chatId, '🤖 My AI brain returned an empty response. Please try rephrasing.');
        }

        const aiReply = geminiResponse.data.candidates[0].content.parts[0].text;
        
        await bot.sendMessage(chatId, aiReply);

        appUser.credits -= 1;
        await appUser.save();

        await Activity.create({
            user: appUser._id,
            activityType: 'ai_reply_sent',
            description: `AI replied to: "${messageText.substring(0, 100)}"`,
            creditChange: -1
        });
        
        console.log(`[FLOW COMPLETE] Reply sent and logged. User has ${appUser.credits} credits.`);

    } catch (err) {
        console.error('--- [FATAL ERROR IN MESSAGE HANDLER] ---');
        console.error(err); // Log the full error to Render
        await bot.sendMessage(chatId, '🤖 Sorry, a critical error occurred. The developers have been notified.');
    }
});
// --- Part 9: Setup Telegram Webhook Route ---

app.post('/api/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200); // Acknowledge the request
});

// A simple health-check route
app.get('/', (req, res) => {
    res.status(200).send('Aadsibot API and Bot Server is running.');
});



app.listen(port, () => {
    console.log(`✅ Server is running and listening on port ${port}`);
   });


module.exports = app;
