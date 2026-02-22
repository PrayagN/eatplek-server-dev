const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
	getVendorOrders,
	respondToOrder,
	getVendorActiveOrders,
	updateOrderStatus
} = require('../controllers/bookingController');
const { respondToOrderValidation, updateOrderStatusValidation } = require('../validations/booking.validations');

// Get vendor's active/paid orders
router.get(
	'/orders/active',
	authenticateToken,
	requireRole('vendor'),
	getVendorActiveOrders
);

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

// Update order status (strict sequence: accepted → preparing → next → completed)
router.patch(
	'/orders/:bookingId/status',
	authenticateToken,
	requireRole('vendor'),
	updateOrderStatusValidation,
	updateOrderStatus
);

module.exports = router;

