const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createBooking } = require('../controllers/bookingController');
const { bookingValidation } = require('../validations/booking.validations');

router.post('/', authenticateToken, bookingValidation, createBooking);

module.exports = router;

