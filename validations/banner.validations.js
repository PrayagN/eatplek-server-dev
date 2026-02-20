const { body, query, param } = require('express-validator');

const createBannerValidation = [
	body('bannerImage')
		.optional()
		.isString()
		.trim()
		.notEmpty()
		.withMessage('Banner image must be a non-empty string if provided'),
	body('bannerImageKitFileId')
		.optional()
		.isString()
		.trim()
		.withMessage('Banner ImageKit file ID must be a string'),
	body('hotelId')
		.optional({ values: 'falsy' })
		.custom((value, { req }) => {
			// For vendors, hotelId is auto-assigned, so it's optional
			// For admins/super_admins, hotelId is optional but must be valid if provided
			if (value && !value.match(/^[0-9a-fA-F]{24}$/)) {
				throw new Error('Hotel ID must be a valid MongoDB ID');
			}
			return true;
		}),
	body('endDate')
		.isISO8601()
		.withMessage('End date must be a valid date')
		.custom((value) => {
			const endDate = new Date(value);
			if (endDate <= new Date()) {
				throw new Error('End date must be in the future');
			}
			return true;
		}),
	body('isPrebookRelated')
		.custom((value) => {
			// Handle string 'true'/'false' from form-data
			if (value === 'true' || value === true) return true;
			if (value === 'false' || value === false) return true;
			throw new Error('isPrebookRelated must be a boolean (true or false)');
		}),
	body('prebookId')
		.optional({ values: 'falsy' })
		.custom((value, { req }) => {
			// Check if isPrebookRelated is true (handle both boolean and string)
			const isPrebookRelated = req.body.isPrebookRelated === 'true' || req.body.isPrebookRelated === true;
			
			// If isPrebookRelated is true, prebookId is required
			if (isPrebookRelated && (!value || value === '')) {
				throw new Error('Prebook ID is required when isPrebookRelated is true');
			}
			
			// If value exists and is not empty, validate it's a valid MongoDB ID
			if (value && value !== '' && !value.match(/^[0-9a-fA-F]{24}$/)) {
				throw new Error('Prebook ID must be a valid MongoDB ID');
			}
			
			return true;
		})
];

const updateBannerValidation = [
	param('id')
		.isMongoId()
		.withMessage('Banner ID must be a valid MongoDB ID'),
	body('bannerImage')
		.optional()
		.isString()
		.trim()
		.notEmpty()
		.withMessage('Banner image must be a non-empty string'),
	body('bannerImageKitFileId')
		.optional()
		.isString()
		.trim()
		.withMessage('Banner ImageKit file ID must be a string'),
	body('hotelId')
		.optional()
		.custom((value) => {
			if (value !== null && value !== '' && !value.match(/^[0-9a-fA-F]{24}$/)) {
				throw new Error('Hotel ID must be a valid MongoDB ID or null');
			}
			return true;
		}),
	body('endDate')
		.optional()
		.isISO8601()
		.withMessage('End date must be a valid date')
		.custom((value) => {
			const endDate = new Date(value);
			if (endDate <= new Date()) {
				throw new Error('End date must be in the future');
			}
			return true;
		}),
	body('isPrebookRelated')
		.optional()
		.custom((value) => {
			// Handle string 'true'/'false' from form-data
			if (value === 'true' || value === true) return true;
			if (value === 'false' || value === false) return true;
			throw new Error('isPrebookRelated must be a boolean (true or false)');
		}),
	body('prebookId')
		.optional()
		.custom((value, { req }) => {
			// Only validate if isPrebookRelated is being set in this request
			if (req.body.isPrebookRelated !== undefined) {
				// Check if isPrebookRelated is true (handle both boolean and string)
				const isPrebookRelated = req.body.isPrebookRelated === 'true' || req.body.isPrebookRelated === true;
				
				// If isPrebookRelated is being set to true, prebookId is required
				if (isPrebookRelated && (!value || value === '' || value === null)) {
					throw new Error('Prebook ID is required when isPrebookRelated is true');
				}
			}
			
			// If value exists and is not empty, validate it's a valid MongoDB ID
			if (value && value !== '' && value !== null && !value.match(/^[0-9a-fA-F]{24}$/)) {
				throw new Error('Prebook ID must be a valid MongoDB ID');
			}
			
			return true;
		}),
	body('isActive')
		.optional()
		.isBoolean()
		.withMessage('isActive must be a boolean')
];

const getBannersValidation = [
	query('page')
		.optional()
		.isInt({ min: 1 })
		.withMessage('Page must be a positive integer'),
	query('limit')
		.optional()
		.isInt({ min: 1, max: 100 })
		.withMessage('Limit must be between 1 and 100'),
	query('isActive')
		.optional()
		.isIn(['true', 'false'])
		.withMessage('isActive must be true or false'),
	query('isPrebookRelated')
		.optional()
		.isIn(['true', 'false'])
		.withMessage('isPrebookRelated must be true or false'),
	query('includeExpired')
		.optional()
		.isIn(['true', 'false'])
		.withMessage('includeExpired must be true or false')
];

const bannerIdValidation = [
	param('id')
		.isMongoId()
		.withMessage('Banner ID must be a valid MongoDB ID')
];

module.exports = {
	createBannerValidation,
	updateBannerValidation,
	getBannersValidation,
	bannerIdValidation
};
