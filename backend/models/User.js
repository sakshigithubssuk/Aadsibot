const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  whatsappNumber: { type: String },
  credits: { type: Number, default: 10 }, // Free credits
  profilePicture: { 
    type: String, 
    default: '' // Default to an empty string
  },
  // 1. Correctly defined telegramId field
  telegramId: {
    type: String,
    default: null,
    // REMOVED unique and sparse from here
  },

  // 2. The user's on/off switch for the AI assistant.
  isAiBotActive: {
    type: Boolean,
    default: true,
  },

  // 3. NEW: To store user-specific information for the /remember command.
  notes: {
    type: [{
      tag: { type: String, required: true, lowercase: true },
      content: { type: String, required: true }
    }],
    default: []
  }

}, { timestamps: true });

// ** NEW: Define the partial index on the schema **
// This index will enforce uniqueness on the telegramId field,
// but ONLY for documents where telegramId is not null.
userSchema.index(
  { telegramId: 1 }, 
  { unique: true, partialFilterExpression: { telegramId: { $ne: null } } }
);

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
