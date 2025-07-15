// controllers/paymentController.js
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Create Order Handler
exports.createOrder = async (req, res) => {
  const { amount, plan } = req.body;
  const credits = plan === '1month' ? 30 : 90;

  try {
    const options = {
      amount: amount * 100, // Amount in the smallest currency unit (paise)
      currency: 'INR',
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).send('Error creating order');
    }

    res.json({
      orderId: order.id,
      amount: order.amount,
      keyId: process.env.RAZORPAY_KEY_ID, // Send key to frontend
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

// 2. Verify Payment Handler (Webhook)
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const userId = req.user._id; // Get user from protect middleware
  
  // This is the crucial security step
  const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = shasum.digest('hex');

  if (digest === razorpay_signature) {
    // Payment is authentic
    try {
      // Find the user and add credits
      const user = await User.findById(userId);
      const creditsToAdd = req.body.plan === '1month' ? 30 : 90;
      user.credits += creditsToAdd;
      await user.save();

      // Create a payment record
      await Payment.create({
        user: userId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount: req.body.amount,
        credits_added: creditsToAdd,
        status: 'success',
      });
      
      res.json({ message: 'Payment successful', user });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating user credits.' });
    }
  } else {
    // Payment verification failed
    res.status(400).json({ message: 'Invalid signature.' });
  }
};
