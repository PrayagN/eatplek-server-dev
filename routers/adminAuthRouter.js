const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../validations/adminAuth.validations');

/**
 * Admin Authentication Routes
 */

// Register new admin
router.post('/register', validateRegister, adminAuthController.register);

// Login admin
router.post('/login', validateLogin, adminAuthController.login);

// Get current admin profile (protected)
router.get('/profile', authenticateToken, adminAuthController.getProfile);

module.exports = router;
