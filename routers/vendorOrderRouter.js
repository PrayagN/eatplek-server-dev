const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
	getVendorOrders,
	respondToOrder
} = require('../controllers/bookingController');
const { respondToOrderValidation } = require('../validations/booking.validations');

// Get vendor's pending orders
router.get(
	'/orders',
	authenticateToken,
	requireRole('vendor'),
	getVendorOrders
);

// Accept or reject an order
router.put(
	'/orders/:bookingId/respond',
	authenticateToken,
	requireRole('vendor'),
	respondToOrderValidation,
	respondToOrder
);

module.exports = router;

