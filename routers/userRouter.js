const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, deactivateAccount, restoreAccount, hardDeleteAccount, updateProfile, getHomeData, getAppHome } = require('../controllers/userController');
const { sendOtpValidation, verifyOtpValidation, deactivateAccountValidation, updateProfileValidation, getHomeDataValidation, getAppHomeValidation } = require('../validations/user.validations');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

router.post('/send-otp', sendOtpValidation, sendOtp);
router.post('/verify-otp', verifyOtpValidation, verifyOtp);
router.put('/profile', authenticateToken, updateProfileValidation, updateProfile);
router.patch('/me/deactivate', authenticateToken, deactivateAccountValidation, deactivateAccount);
router.patch('/me/restore', authenticateToken, restoreAccount);
router.delete('/me/hard', authenticateToken, hardDeleteAccount);
router.get('/home', optionalAuth, getHomeDataValidation, getHomeData);
router.get('/app/home', getAppHomeValidation, getAppHome);

module.exports = router;


