// src/routes/cartRoutes.js

const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { addCartItemSchema, updateCartItemSchema } = require('../validators/cartValidator');

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(addCartItemSchema), cartController.addItem);
router.put('/items/:itemId', validate(updateCartItemSchema), cartController.updateItem);
router.delete('/items/:itemId', cartController.removeItem);

module.exports = router;