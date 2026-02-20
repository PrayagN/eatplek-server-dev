const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const { normalizeServiceType, SERVICE_TYPES } = require('../utils/serviceType');

const addToCartValidation = [
	body('foodId')
		.exists().withMessage('foodId is required')
		.bail()
		.isMongoId().withMessage('foodId must be a valid ID'),
	body('quantity')
		.optional()
		.custom((value) => {
			if (typeof value === 'boolean') return true;
			if (Number.isInteger(value) && value >= 0 && value <= 50) return true;
			throw new Error('quantity must be boolean (increment/decrement), 0 (to remove), or a positive integer up to 50');
		}),
	body('serviceType')
		.exists().withMessage('serviceType is required')
		.bail()
		.isString().withMessage('serviceType must be a string')
		.custom((value) => {
			const normalized = normalizeServiceType(value);
			if (!normalized) {
				throw new Error(`serviceType must be one of: ${SERVICE_TYPES.join(', ')}`);
			}
			return true;
		}),
	body('customizations')
		.optional()
		.isArray({ max: 20 }).withMessage('customizations must be an array'),
	body('customizations.*')
		.optional()
	.custom((value) => {
		if (typeof value === 'string') {
			if (!mongoose.Types.ObjectId.isValid(value)) {
				throw new Error('Each customization must be a valid ID');
			}
			return true;
		}

		if (typeof value === 'object' && value !== null) {
			if (!mongoose.Types.ObjectId.isValid(value.customizationId || value.id)) {
				throw new Error('customizationId must be a valid ID');
			}
			if (
				value.quantity !== undefined &&
				(!Number.isInteger(value.quantity) || value.quantity < 0 || value.quantity > 10)
			) {
				throw new Error('customization quantity must be between 0 and 10');
			}
			return true;
		}

		throw new Error('Each customization must be an ID or object');
		}),
	body('addOns')
		.optional()
		.isArray({ max: 20 }).withMessage('addOns must be an array'),
	body('addOns.*')
		.optional()
		.custom((value) => {
			if (typeof value === 'string') {
				if (!mongoose.Types.ObjectId.isValid(value)) {
					throw new Error('addOnId must be a valid ID');
				}
				return true;
			}

			if (typeof value === 'object' && value !== null) {
				if (!mongoose.Types.ObjectId.isValid(value.addOnId || value.id)) {
					throw new Error('addOnId must be a valid ID');
				}
			if (
				value.quantity !== undefined &&
				(!Number.isInteger(value.quantity) || value.quantity < 0 || value.quantity > 10)
			) {
				throw new Error('add-on quantity must be between 0 and 10');
				}
				return true;
			}

			throw new Error('Each add-on must be an ID or object');
		}),
	body('notes')
		.optional()
		.isString().withMessage('notes must be text')
		.isLength({ max: 500 }).withMessage('notes can contain up to 500 characters')
];

const removeCartItemValidation = [
	param('itemId')
		.exists().withMessage('itemId is required')
		.bail()
		.isMongoId().withMessage('itemId must be a valid ID')
];

const connectCartValidation = [
	body('cartCode')
		.exists().withMessage('cartCode is required')
		.bail()
		.isString().withMessage('cartCode must be a string')
		.trim()
		.isLength({ min: 1, max: 20 }).withMessage('cartCode must be between 1 and 20 characters')
		.matches(/^CART\d{4}$/i).withMessage('cartCode must be in format CART followed by 4 digits (e.g., CART0001)')
];

module.exports = {
	addToCartValidation,
	removeCartItemValidation,
	connectCartValidation
};

