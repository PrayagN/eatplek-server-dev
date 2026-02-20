const { body, query } = require('express-validator');

const sendOtpValidation = [
	body('dialCode').isString().trim().notEmpty().withMessage('dialCode is required'),
	body('phone')
		.isString()
		.trim()
		.matches(/^\d{10}$/)
		.withMessage('phone must be a 10 digit number'),
	body('firebaseToken').optional().isString().withMessage('firebaseToken must be a string'),
	body('deviceOs').optional().isString().withMessage('deviceOs must be a string'),
	body('deviceName').optional().isString().withMessage('deviceName must be a string')
];

const verifyOtpValidation = [
	body('dialCode').isString().trim().notEmpty().withMessage('dialCode is required'),
	body('phone')
		.isString()
		.trim()
		.matches(/^\d{10}$/)
		.withMessage('phone must be a 10 digit number'),
	body('otp').isString().matches(/^\d{6}$/).withMessage('otp must be 6 digits'),
	body('deviceOs').optional().isString().withMessage('deviceOs must be a string'),
	body('deviceName').optional().isString().withMessage('deviceName must be a string'),
	body('firebaseToken').optional().isString().withMessage('firebaseToken must be a string')
];

const deactivateAccountValidation = [
	body('reason')
		.optional()
		.isString()
		.trim()
		.isLength({ max: 500 })
		.withMessage('reason must be a string up to 500 characters')
];

const updateProfileValidation = [
	body('name').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 characters'),
	body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
	body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
	body('profileImage').optional().isString().withMessage('profileImage must be a string'),
	body('firebaseToken').optional().isString().withMessage('firebaseToken must be a string'),
	body('deviceOs').optional().isString().withMessage('deviceOs must be a string'),
	body('deviceName').optional().isString().withMessage('deviceName must be a string')
];

const getHomeDataValidation = [
	query('serviceOffered').optional().isString().isIn(['Delivery']).withMessage('Currently only "Delivery" service is supported'),
	query('userLatitude').optional().isFloat({ min: -90, max: 90 }).withMessage('userLatitude must be between -90 and 90'),
	query('userLongitude').optional().isFloat({ min: -180, max: 180 }).withMessage('userLongitude must be between -180 and 180'),
	query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('radius must be between 0.1 and 100 km'),
	query('currentTime').optional().isISO8601().withMessage('currentTime must be a valid ISO 8601 date string'),
	query('search').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('search must be 1-100 characters'),
	query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
];

const getAppHomeValidation = [
	query('latitude').isFloat({ min: -90, max: 90 }).withMessage('latitude is required and must be between -90 and 90'),
	query('longitude').isFloat({ min: -180, max: 180 }).withMessage('longitude is required and must be between -180 and 180'),
	query('serviceType')
		.optional()
		.isString()
		.trim()
		.custom((value) => {
			if (value === 'all') return true;
			const { normalizeServiceType } = require('../utils/serviceType');
			const normalized = normalizeServiceType(value);
			if (!normalized) {
				throw new Error(`serviceType must be one of: Dine in, Delivery, Takeaway, Pickup, Car Dine in, or all`);
			}
			return true;
		})
		.withMessage('serviceType must be one of: Dine in, Delivery, Takeaway, Pickup, Car Dine in, or all'),
	query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('radius must be between 0.1 and 100 km'),
	query('dateTime').optional().isISO8601().withMessage('dateTime must be a valid ISO 8601 date string'),
	query('search').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('search must be 1-100 characters')
];

module.exports = {
	sendOtpValidation,
	verifyOtpValidation,
	deactivateAccountValidation,
	updateProfileValidation,
	getHomeDataValidation,
	getAppHomeValidation
};


