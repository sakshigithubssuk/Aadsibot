const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  whatsappNumber: { type: String, required: true},
  credits: { type: Number, default: 10 }, // Free credits

  // --- NEW FIELDS REQUIRED FOR TELEGRAM BOT ---

  // 1. To store the link between your user and their Telegram account.
  telegramId: {
    type: String,     // Telegram chat IDs are numbers, but storing as String is safer.
    default: null,    // Default to null, meaning the account is not linked yet.
    unique: true,     // One Telegram account can only be linked to one web user.
    sparse: true,     // CRITICAL: This allows many users to have a `null` value
                      // without violating the `unique` constraint.
  },

  // 2. The user's on/off switch for the AI assistant.
  isAiBotActive: {
    type: Boolean,
    default: false,   // IMPORTANT: The bot should always be OFF by default for safety.
  },

}, { timestamps: true });

// --- NO CHANGES NEEDED BELOW THIS LINE ---

// Hash password before saving (This logic is correct and remains the same)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password (This logic is correct and remains the same)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
