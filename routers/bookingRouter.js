const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createBooking, confirmPayment } = require('../controllers/bookingController');
const { bookingValidation } = require('../validations/booking.validations');

router.post('/', authenticateToken, bookingValidation, createBooking);
router.post('/:bookingId/payment-confirm', authenticateToken, confirmPayment);

module.exports = router;

