// src/routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const { orderLimiter } = require('../middleware/rateLimiter');
const {
  createOrderSchema,
  updateOrderStatusSchema,
  paginationQuerySchema,
} = require('../validators/orderValidator');

router.use(authenticate);

router.post('/', orderLimiter, validate(createOrderSchema), orderController.placeOrder);
router.get('/', validateQuery(paginationQuerySchema), orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);
router.patch('/:id/status',
  authorize('admin'),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

module.exports = router;