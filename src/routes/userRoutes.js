// src/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { updateProfileSchema, changePasswordSchema } = require('../validators/userValidator');

// All user profile routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.patch('/profile/password', validate(changePasswordSchema), userController.changePassword);

module.exports = router;