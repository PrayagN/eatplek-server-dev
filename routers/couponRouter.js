const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
	createCoupon,
	getCoupons,
	getCouponById,
	updateCoupon,
	deleteCoupon,
	validateCoupon,
	applyCoupon,
	removeCoupon
} = require('../controllers/couponController');
const {
	createCouponValidation,
	updateCouponValidation,
	getCouponByIdValidation,
	deleteCouponValidation,
	validateCouponValidation,
	applyCouponValidation
} = require('../validations/coupon.validations');

// Admin and Vendor routes for managing coupons
router.post(
	'/',
	authenticateToken,
	requireRole('admin', 'super_admin', 'vendor'),
	createCouponValidation,
	createCoupon
);

router.get(
	'/',
	authenticateToken,
	requireRole('admin', 'super_admin', 'vendor'),
	getCoupons
);

router.get(
	'/:id',
	authenticateToken,
	requireRole('admin', 'super_admin', 'vendor'),
	getCouponByIdValidation,
	getCouponById
);

router.put(
	'/:id',
	authenticateToken,
	requireRole('admin', 'super_admin', 'vendor'),
	updateCouponValidation,
	updateCoupon
);

router.delete(
	'/:id',
	authenticateToken,
	requireRole('admin', 'super_admin', 'vendor'),
	deleteCouponValidation,
	deleteCoupon
);

// User routes for coupon operations
router.post(
	'/validate',
	authenticateToken,
	validateCouponValidation,
	validateCoupon
);

router.post(
	'/apply',
	authenticateToken,
	applyCouponValidation,
	applyCoupon
);

router.delete(
	'/remove',
	authenticateToken,
	removeCoupon
);

module.exports = router;

