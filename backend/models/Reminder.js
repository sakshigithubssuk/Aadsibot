const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chatId: { type: String, required: true },
  message: { type: String, required: true },
  remindAt: { type: Date, required: true },
  isSent: { type: Boolean, default: false },

  // NEW: The user-friendly short ID
  shortId: {
    type: String,
    required: true,
    unique: true, // Guarantees no two reminders can have the same shortId
    index: true   // Makes finding by shortId very fast
  }
});

module.exports = mongoose.model('Reminder', reminderSchema);
