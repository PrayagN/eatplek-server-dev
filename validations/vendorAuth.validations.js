const { body } = require('express-validator');

const sendVendorOtpValidation = [
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

const verifyVendorOtpValidation = [
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

module.exports = {
  sendVendorOtpValidation,
  verifyVendorOtpValidation
};

