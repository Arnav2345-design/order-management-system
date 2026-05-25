const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// Public routes — no token needed
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Admin only routes — token + admin role required
router.post('/', authenticate, authorize('admin'), productController.createProduct);
router.put('/:id', authenticate, authorize('admin'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteProduct);

module.exports = router;