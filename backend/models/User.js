const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // --- Original Fields ---
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  whatsappNumber: { type: String, required: true },
  credits: { type: Number, default: 10 },

  // --- Telegram Bot Fields ---
  telegramId: {
    type: String,
    unique: true,     // CORRECTED: Ensures one Telegram ID maps to only one user.
    sparse: true,     // Allows many users to have a `null` value without conflict.
  },
  isAiBotActive: {
    type: Boolean,
    default: true,   // Changed to true for easier testing, you can set to false later.
  },

  // --- NEW BOT MEMORY FIELD ---
  // This is the bot's long-term memory for this specific user.
  // It allows the bot to provide personalized, contextual responses.
  notes: [{
    tag: { type: String, lowercase: true, trim: true }, // A keyword to find the note, e.g., "project_name"
    content: String,                                   // The actual information, e.g., "Project Phoenix"
    createdAt: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

// --- NO CHANGES NEEDED BELOW THIS LINE ---

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
