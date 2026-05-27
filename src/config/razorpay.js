// src/config/razorpay.js

const Razorpay = require('razorpay');

// Razorpay is initialised with your key ID and secret from .env
// The SDK uses these to sign requests to Razorpay's API
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = razorpay;