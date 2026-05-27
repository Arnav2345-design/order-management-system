// src/controllers/paymentController.js

const paymentService = require('../services/paymentService');

async function initiatePayment(req, res, next) {
  try {
    const { orderId, method } = req.body;

    if (!orderId || !method) {
      return res.status(400).json({
        status: 'error',
        message: 'orderId and method are required',
      });
    }

    const result = await paymentService.initiatePayment(req.user.id, { orderId, method });

    res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        status: 'error',
        message: 'orderId, razorpayOrderId, razorpayPaymentId, and razorpaySignature are required',
      });
    }

    const payment = await paymentService.verifyPayment(req.user.id, {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    res.status(200).json({ status: 'success', data: { payment } });
  } catch (err) {
    next(err);
  }
}

async function getPaymentByOrderId(req, res, next) {
  try {
    const payment = await paymentService.getPaymentByOrderId(
      req.user.id,
      req.params.orderId
    );

    res.status(200).json({ status: 'success', data: { payment } });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiatePayment, verifyPayment, getPaymentByOrderId };