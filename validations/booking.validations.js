const { body, param } = require('express-validator');
const { normalizeServiceType, SERVICE_TYPES } = require('../utils/serviceType');

const SERVICE_TYPE_REQUIREMENTS = {
	'Delivery': ['address', 'latitude', 'longitude', 'name', 'phoneNumber'],
	'Dine in': ['personCount', 'reachTime'],
	'Takeaway': ['reachTime'],
	'Pickup': ['reachTime'],
	'Car Dine in': ['reachTime']
};

const requireFieldsValidator = body().custom((_, { req }) => {
	const normalized = normalizeServiceType(req.body.serviceType);
	if (!normalized || !SERVICE_TYPE_REQUIREMENTS[normalized]) {
		throw new Error(`Invalid serviceType. Allowed: ${SERVICE_TYPES.join(', ')}`);
	}

	const requiredFields = SERVICE_TYPE_REQUIREMENTS[normalized];
	const missing = requiredFields.filter((field) => {
		const value = req.body[field];
		return value === undefined || value === null || value === '';
	});

	if (missing.length > 0) {
		throw new Error(`Missing required fields for ${normalized}: ${missing.join(', ')}`);
	}

	return true;
});

const bookingValidation = [
	body('serviceType')
		.exists().withMessage('serviceType is required')
		.bail()
		.isString().withMessage('serviceType must be a string'),
	body('address')
		.optional()
		.isString().withMessage('address must be text')
		.isLength({ min: 5, max: 500 }).withMessage('address must be 5-500 characters'),
	body('latitude')
		.optional()
		.isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
	body('longitude')
		.optional()
		.isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
	body('name')
		.optional()
		.isString().withMessage('name must be text')
		.isLength({ min: 2, max: 120 }).withMessage('name must be 2-120 characters'),
	body('phoneNumber')
		.optional()
		.matches(/^\+?[0-9]{6,15}$/).withMessage('phoneNumber must be 6-15 digits and may start with +'),
	body('personCount')
		.optional()
		.isInt({ min: 1, max: 50 }).withMessage('personCount must be between 1 and 50'),
	body('reachTime')
		.optional()
		.isISO8601().withMessage('reachTime must be a valid ISO date string'),
	body('vehicleDetails')
		.optional()
		.isString().withMessage('vehicleDetails must be text')
		.isLength({ max: 150 }).withMessage('vehicleDetails can contain up to 150 characters'),
	body('notes')
		.optional()
		.isString().withMessage('notes must be text')
		.isLength({ max: 500 }).withMessage('notes can contain up to 500 characters'),
	requireFieldsValidator
];

const respondToOrderValidation = [
	param('bookingId')
		.exists()
		.withMessage('Booking ID is required')
		.bail()
		.isMongoId()
		.withMessage('Booking ID must be a valid MongoDB ID'),
	body('action')
		.exists()
		.withMessage('Action is required')
		.bail()
		.isIn(['accept', 'reject'])
		.withMessage('Action must be either "accept" or "reject"'),
	body('rejectionReason')
		.optional()
		.isString()
		.trim()
		.isLength({ max: 500 })
		.withMessage('Rejection reason cannot exceed 500 characters'),
	body('suggestedTime')
		.optional()
		.custom((value) => {
			if (!value) return true;
			if (typeof value === 'string' && !value.trim()) return true;
			const date = new Date(value);
			if (isNaN(date.getTime())) {
				throw new Error('Suggested time must be a valid ISO 8601 date');
			}
			return true;
		}),
	body('modifiedItems')
		.optional()
		.isArray()
		.withMessage('Modified items must be an array'),
	body('modifiedItems.*.foodId')
		.optional()
		.isMongoId()
		.withMessage('Each food ID must be a valid MongoDB ID'),
	body('modifiedItems.*.updatedQuantity')
		.optional()
		.isInt({ min: 1 })
		.withMessage('Updated quantity must be a positive integer'),
	body('modifiedItems.*.reason')
		.optional()
		.isString()
		.trim()
		.isLength({ max: 200 })
		.withMessage('Item rejection reason cannot exceed 200 characters')
];

const updateOrderStatusValidation = [
	param('bookingId')
		.exists()
		.withMessage('Booking ID is required')
		.bail()
		.isMongoId()
		.withMessage('Booking ID must be a valid MongoDB ID')
];

module.exports = {
	bookingValidation,
	respondToOrderValidation,
	updateOrderStatusValidation,
	normalizeServiceType
};

