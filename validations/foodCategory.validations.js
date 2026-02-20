const { body } = require('express-validator');

/**
 * Validation middleware for food category creation
 * Note: Image can be either uploaded file or URL string
 */
const validateCreateFoodCategory = [
  body('categoryName')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('image')
    .optional()
    .trim()
    .custom((value, { req }) => {
      // If no file is uploaded and no URL is provided, return error
      if (!req.file && !value) {
        throw new Error('Image is required (either upload a file or provide a URL)');
      }
      // If URL is provided, validate it
      if (value && !req.file) {
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error('Image must be a valid URL');
        }
      }
      return true;
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
];

/**
 * Validation middleware for food category update
 */
const validateUpdateFoodCategory = [
  body('categoryName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('image')
    .optional()
    .trim()
    .custom((value, { req }) => {
      // If file is uploaded, no need to validate URL
      if (req.file) {
        return true;
      }
      // If no file and no URL provided, that's okay for update (optional field)
      if (!value) {
        return true;
      }
      // If URL is provided, validate it
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Image must be a valid URL');
      }
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

module.exports = {
  validateCreateFoodCategory,
  validateUpdateFoodCategory
};

