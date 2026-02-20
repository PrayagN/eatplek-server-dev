const { body } = require('express-validator');

const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];

const uploadImageValidation = [
  body('width')
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage('width must be an integer between 1 and 5000'),
  body('height')
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage('height must be an integer between 1 and 5000'),
  body('quality')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('quality must be an integer between 1 and 100'),
  body('format')
    .optional()
    .isString()
    .custom(value => allowedFormats.includes(value.toLowerCase()))
    .withMessage(`format must be one of: ${allowedFormats.join(', ')}`),
  body('folder')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('folder must be a non-empty string up to 100 characters')
];

module.exports = {
  uploadImageValidation
};

