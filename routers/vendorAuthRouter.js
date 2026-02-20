const express = require('express');
const router = express.Router();
const vendorAuthController = require('../controllers/vendorAuthController');
const { sendVendorOtpValidation, verifyVendorOtpValidation } = require('../validations/vendorAuth.validations');

router.post('/send-otp', sendVendorOtpValidation, (req, res) => vendorAuthController.sendOtp(req, res));
router.post('/verify-otp', verifyVendorOtpValidation, (req, res) => vendorAuthController.verifyOtp(req, res));

module.exports = router;

