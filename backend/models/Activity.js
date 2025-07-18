const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  activityType: {
    type: String,
    required: true,
    enum: [
      'user_registered',
      'plan_upgraded',
      'credits_purchased',
      'ai_reply_sent',
      'image_generated',
      'image_analyzed' // <-- ADD THIS LINE
    ]
  },

  description: { type: String, required: true },
  creditChange: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
