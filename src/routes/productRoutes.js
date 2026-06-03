const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createProductSchema, updateProductSchema } = require('../validators/productValidator');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

router.post('/',
  authenticate,
  authorize('admin'),
  validate(createProductSchema),
  productController.createProduct
);

router.put('/:id',
  authenticate,
  authorize('admin'),
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete('/:id',
  authenticate,
  authorize('admin'),
  productController.deleteProduct
);

module.exports = router;