const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  whatsappNumber: { type: String},
  credits: { type: Number, default: 10 }, // Free credits
  profilePicture: { 
    type: String, 
    default: '' // Default to an empty string
  },
  // 1. To store the link between your user and their Telegram account.
  telegramId: {
    type: String,
    default: null,
    sparse: true,
    unique: true,
       },

  // 2. The user's on/off switch for the AI assistant.
  isAiBotActive: {
    type: Boolean,
    default: false,
  },

  // 3. NEW: To store user-specific information for the /remember command.
  notes: {
    type: [{
      tag: { type: String, required: true, lowercase: true },
      content: { type: String, required: true }
    }],
    default: [] // IMPORTANT: Default to an empty array.
  }

}, { timestamps: true });


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
