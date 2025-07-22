
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const Reminder = require('../models/Reminder');

// Load environment variables for the cron job context
require('dotenv').config({ path: '.env.local' });

module.exports = async function handler(request, response) {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const mongoURI = process.env.MONGO_URI;

    if (!telegramBotToken || !mongoURI) {
        console.error("Cron Job: Missing environment variables.");
        return response.status(500).send("Server configuration error.");
    }

    try {
        await mongoose.connect(mongoURI);
        
        const bot = new TelegramBot(telegramBotToken);
        
        const nowUtc = new Date(); // The server's current time is always UTC

        // Find all reminders where the scheduled UTC time is in the past and they haven't been sent
        const dueReminders = await Reminder.find({ remindAt: { $lte: nowUtc }, isSent: false });
        
        if (dueReminders.length > 0) {
            console.log(`Cron Job: Found ${dueReminders.length} due reminders.`);
        }

        for (const reminder of dueReminders) {
            try {
                await bot.sendMessage(reminder.chatId, `🔔 **Reminder:**\n${reminder.message}`, { parse_mode: 'Markdown' });
                reminder.isSent = true;
                await reminder.save();
                console.log(`Cron Job: Sent reminder ${reminder.shortId}.`);
            } catch (error) {
                console.error(`Cron Job: Failed to send reminder ${reminder.shortId}. Error: ${error.message}`);
                // Mark as sent even if it fails to prevent spamming a user whose chat is broken
                reminder.isSent = true;
                await reminder.save();
            }
        }

        await mongoose.connection.close();
        
        response.status(200).send(`Cron job finished. Processed ${dueReminders.length} reminders.`);

    } catch (error) {
        console.error('Cron Job: A fatal error occurred:', error);
        if (mongoose.connection.readyState === 1) { // Check if connection is open before trying to close
            await mongoose.connection.close();
        }
        response.status(500).send("An error occurred during the cron job execution.");
    }
};
