// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  razorpay_order_id: { type: String, required: true },
  razorpay_payment_id: { type: String },
  razorpay_signature: { type: String },
  amount: { type: Number, required: true }, // Store amount in rupees for your records
  credits_added: { type: Number, required: true },
  status: { type: String, default: 'created' }, // created, success, failed
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);