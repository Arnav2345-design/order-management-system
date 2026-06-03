// src/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { initiatePaymentSchema, verifyPaymentSchema } = require('../validators/paymentValidator');

// Webhook — no auth, no body validation (raw body needed for HMAC)
router.post('/webhook', paymentController.handleWebhook);

router.use(authenticate);

router.post('/initiate', validate(initiatePaymentSchema), paymentController.initiatePayment);
router.post('/verify', validate(verifyPaymentSchema), paymentController.verifyPayment);
router.get('/order/:orderId', paymentController.getPaymentByOrderId);

module.exports = router;