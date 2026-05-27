// src/routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// All order routes require authentication
router.use(authenticate);

router.post('/', orderController.placeOrder);
router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);

// Only admins can update order status
router.patch('/:id/status', authorize('admin'), orderController.updateOrderStatus);

module.exports = router;