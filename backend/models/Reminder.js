const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    chatId: { // Storing chatId for direct messaging
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    remindAt: { // The exact time the reminder is due
        type: Date,
        required: true,
    },
    // A flag to ensure we don't send a reminder twice
    isSent: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

// Create an index on remindAt for efficient querying
reminderSchema.index({ remindAt: 1, isSent: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;
