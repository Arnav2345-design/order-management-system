// src/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authenticate = require('../middleware/authenticate');

// ── Webhook route — no auth ───────────────────────────────────────────────
// Must be defined BEFORE router.use(authenticate).
// Razorpay is an external server — it has no JWT.
// Security is handled inside the service via HMAC signature verification.
router.post('/webhook', paymentController.handleWebhook);

// ── All other payment routes require authentication ───────────────────────
router.use(authenticate);

router.post('/initiate', paymentController.initiatePayment);
router.post('/verify', paymentController.verifyPayment);
router.get('/order/:orderId', paymentController.getPaymentByOrderId);

module.exports = router;