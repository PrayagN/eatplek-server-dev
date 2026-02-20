const { body, param, query } = require('express-validator');

const createCouponValidation = [
	body('code')
		.exists()
		.withMessage('Coupon code is required')
		.bail()
		.isString()
		.trim()
		.isLength({ min: 4, max: 20 })
		.withMessage('Coupon code must be between 4 and 20 characters')
		.matches(/^[A-Z0-9]+$/i)
		.withMessage('Coupon code must contain only letters and numbers'),
	body('discountType')
		.exists()
		.withMessage('Discount type is required')
		.bail()
		.isIn(['percentage', 'fixed'])
		.withMessage('Discount type must be either "percentage" or "fixed"'),
	body('discountValue')
		.exists()
		.withMessage('Discount value is required')
		.bail()
		.isFloat({ min: 0 })
		.withMessage('Discount value must be a positive number'),
	body('maxDiscountAmount')
		.optional({ nullable: true, checkFalsy: false })
		.custom((value) => {
			if (value === null || value === undefined || value === '') return true;
			const num = Number(value);
			if (!Number.isFinite(num) || num < 0) {
				throw new Error('Max discount amount must be a positive number');
			}
			return true;
		}),
	body('minOrderAmount')
		.optional({ nullable: true, checkFalsy: false })
		.custom((value) => {
			if (value === null || value === undefined || value === '') return true;
			const num = Number(value);
			if (!Number.isFinite(num) || num < 0) {
				throw new Error('Minimum order amount must be a positive number');
			}
			return true;
		}),
	body('isOneTimeUse')
		.optional({ nullable: true, checkFalsy: false })
		.isBoolean()
		.withMessage('isOneTimeUse must be a boolean'),
	body('usageLimit')
		.optional({ nullable: true, checkFalsy: false })
		.custom((value) => {
			if (value === null || value === undefined || value === '') return true;
			const num = Number(value);
			if (!Number.isInteger(num) || num < 1) {
				throw new Error('Usage limit must be a positive integer');
			}
			return true;
		}),
	body('expiresAt')
		.optional({ nullable: true, checkFalsy: false })
		.custom((value) => {
			if (value === null || value === undefined || value === '') return true;
			if (typeof value === 'string' && !value.trim()) return true;
			const date = new Date(value);
			if (isNaN(date.getTime())) {
				throw new Error('Expiry date must be a valid ISO 8601 date');
			}
			if (date < new Date()) {
				throw new Error('Expiry date must be in the future');
			}
			return true;
		}),
	body('description')
		.optional({ nullable: true, checkFalsy: false })
		.custom((value) => {
			if (value === null || value === undefined || value === '') return true;
			if (typeof value !== 'string') {
				throw new Error('Description must be a string');
			}
			if (value.trim().length > 500) {
				throw new Error('Description cannot exceed 500 characters');
			}
			return true;
		}),
	body('vendorId')
		.optional({ nullable: true, checkFalsy: false })
		.custom((value, { req }) => {
			// Vendor ID is only allowed for admins. Vendors cannot specify vendorId - it's automatically set from their token.
			const isVendor = req.user?.role === 'vendor';
			if (isVendor && value !== null && value !== undefined && value !== '') {
				// Silently ignore vendorId if sent by vendor - it will be set from token anyway
				return true;
			}
			// For admins, validate vendorId if provided
			if (value === null || value === undefined || value === '') return true;
			if (typeof value !== 'string' || !/^[0-9a-fA-F]{24}$/.test(value)) {
				throw new Error('Vendor ID must be a valid MongoDB ID');
			}
			return true;
		})
];

const updateCouponValidation = [
	param('id')
		.exists()
		.withMessage('Coupon ID is required')
		.bail()
		.isMongoId()
		.withMessage('Coupon ID must be a valid MongoDB ID'),
	body('discountType')
		.optional()
		.isIn(['percentage', 'fixed'])
		.withMessage('Discount type must be either "percentage" or "fixed"'),
	body('discountValue')
		.optional()
		.isFloat({ min: 0 })
		.withMessage('Discount value must be a positive number'),
	body('maxDiscountAmount')
		.optional()
		.isFloat({ min: 0 })
		.withMessage('Max discount amount must be a positive number')
		.custom((value, { req }) => {
			if (value === null) return true;
			return true;
		}),
	body('minOrderAmount')
		.optional()
		.isFloat({ min: 0 })
		.withMessage('Minimum order amount must be a positive number')
		.custom((value, { req }) => {
			if (value === null) return true;
			return true;
		}),
	body('isOneTimeUse')
		.optional()
		.isBoolean()
		.withMessage('isOneTimeUse must be a boolean'),
	body('usageLimit')
		.optional()
		.isInt({ min: 1 })
		.withMessage('Usage limit must be a positive integer')
		.custom((value, { req }) => {
			if (value === null) return true;
			return true;
		}),
	body('expiresAt')
		.optional()
		.custom((value) => {
			if (value === null) return true;
			if (!value) return true;
			if (typeof value === 'string' && !value.trim()) return true;
			const date = new Date(value);
			if (isNaN(date.getTime())) {
				throw new Error('Expiry date must be a valid date');
			}
			return true;
		}),
	body('description')
		.optional()
		.isString()
		.trim()
		.isLength({ max: 500 })
		.withMessage('Description cannot exceed 500 characters'),
	body('isActive')
		.optional()
		.isBoolean()
		.withMessage('isActive must be a boolean')
];

const getCouponByIdValidation = [
	param('id')
		.exists()
		.withMessage('Coupon ID is required')
		.bail()
		.isMongoId()
		.withMessage('Coupon ID must be a valid MongoDB ID')
];

const deleteCouponValidation = [
	param('id')
		.exists()
		.withMessage('Coupon ID is required')
		.bail()
		.isMongoId()
		.withMessage('Coupon ID must be a valid MongoDB ID')
];

const validateCouponValidation = [
	body('code')
		.exists()
		.withMessage('Coupon code is required')
		.bail()
		.isString()
		.trim()
		.notEmpty()
		.withMessage('Coupon code cannot be empty')
];

const applyCouponValidation = [
	body('code')
		.exists()
		.withMessage('Coupon code is required')
		.bail()
		.isString()
		.trim()
		.notEmpty()
		.withMessage('Coupon code cannot be empty')
];

module.exports = {
	createCouponValidation,
	updateCouponValidation,
	getCouponByIdValidation,
	deleteCouponValidation,
	validateCouponValidation,
	applyCouponValidation
};

