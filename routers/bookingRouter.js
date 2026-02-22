const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createBooking, confirmPayment, getUserOrders, getOrderTrackerDetails, streamOrderStatus } = require('../controllers/bookingController');
const { bookingValidation } = require('../validations/booking.validations');

router.post('/', authenticateToken, bookingValidation, createBooking);
router.get('/my-orders', authenticateToken, getUserOrders);
router.get('/:bookingId', authenticateToken, getOrderTrackerDetails);
router.post('/:bookingId/payment-confirm', authenticateToken, confirmPayment);
router.get('/:bookingId/stream', authenticateToken, streamOrderStatus);

module.exports = router;

