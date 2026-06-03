// src/routes/addressRoutes.js

const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createAddressSchema } = require('../validators/addressValidator');

router.use(authenticate);

router.get('/', addressController.getAddresses);
router.post('/', validate(createAddressSchema), addressController.addAddress);

module.exports = router;