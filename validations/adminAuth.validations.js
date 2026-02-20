const { body } = require('express-validator');

/**
 * Validation middleware for admin registration
 */
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role').optional().isIn(['super_admin', 'admin', 'manager']).withMessage('Invalid role')
];

/**
 * Validation middleware for admin login
 */
const validateLogin = [
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required')
];

module.exports = {
  validateRegister,
  validateLogin
};



