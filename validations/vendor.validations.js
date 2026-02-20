const { body } = require('express-validator');

const validServices = ['Dine in', 'Delivery', 'Takeaway', 'Pickup', 'Car Dine in'];
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Validation middleware for vendor creation
 */
const validateCreateVendor = [
  // Personal Information
  body('ownerName').trim().notEmpty().withMessage('Owner name is required'),
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format'),
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  
  // Restaurant Information
  body('restaurantName').trim().notEmpty().withMessage('Restaurant name is required'),
  body('serviceOffered').isArray({ min: 1 }).withMessage('At least one service type is required')
    .custom(value => {
      if (value.every(service => validServices.includes(service))) {
        return true;
      }
      throw new Error('Invalid service type');
    }),
  body('fssaiLicenseNumber').trim().notEmpty().withMessage('FSSAI license number is required'),
  body('gstNumber').trim().notEmpty().withMessage('GST number is required')
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST number format'),
  
  // Address
  body('address.fullAddress').trim().notEmpty().withMessage('Full address is required'),
  body('address.pincode').trim().notEmpty().withMessage('Pincode is required')
    .matches(/^\d{6}$/).withMessage('Invalid pincode format'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.state').trim().notEmpty().withMessage('State is required'),
  body('address.coordinates').custom(value => {
    // Check if it's an array (before transformation) or GeoJSON (after transformation)
    if (Array.isArray(value)) {
      if (value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
        return true;
      }
      throw new Error('Invalid coordinates format [longitude, latitude]');
    }
    if (typeof value === 'object' && value.type === 'Point' && Array.isArray(value.coordinates)) {
      if (value.coordinates.length === 2 && 
          typeof value.coordinates[0] === 'number' && typeof value.coordinates[1] === 'number') {
        return true;
      }
      throw new Error('Invalid GeoJSON coordinates [longitude, latitude]');
    }
    throw new Error('Coordinates must be an array [longitude, latitude]');
  }),
  
  // Operating Hours
  body('operatingHours').isArray({ min: 1 }).withMessage('Operating hours are required'),
  
  // Bank Accounts
  body('bankAccounts').optional().isArray(),
  body('bankAccounts.*.bankName').optional().trim().notEmpty().withMessage('Bank name is required'),
  body('bankAccounts.*.accountHolderName').optional().trim().notEmpty().withMessage('Account holder name is required'),
  body('bankAccounts.*.accountNumber').optional().trim().notEmpty().withMessage('Account number is required'),
  body('bankAccounts.*.ifscCode').optional().trim().notEmpty().withMessage('IFSC code is required')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code format'),
  body('bankAccounts.*.accountType').optional().isIn(['Primary', 'Secondary']).withMessage('Invalid account type'),
  
  // Commission
  body('commissionRate').isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0 and 100'),
  
  // GST
  body('gstPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('GST percentage must be between 0 and 100'),
  
  // Images (optional)
  body('profileImage').optional().trim(),
  body('restaurantImage').optional().trim()
];

/**
 * Validation middleware for vendor update
 */
const validateUpdateVendor = [
  body('ownerName').optional().trim().notEmpty().withMessage('Owner name cannot be empty'),
  body('phoneNumber').optional().trim().notEmpty().withMessage('Phone number cannot be empty')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format'),
  body('email').optional().trim().notEmpty().withMessage('Email cannot be empty')
    .isEmail().withMessage('Invalid email format'),
  body('restaurantName').optional().trim().notEmpty().withMessage('Restaurant name cannot be empty'),
  body('serviceOffered').optional().isArray({ min: 1 }).withMessage('At least one service type is required')
    .custom(value => {
      if (value.every(service => validServices.includes(service))) {
        return true;
      }
      throw new Error('Invalid service type');
    }),
  body('gstNumber').optional().trim().notEmpty().withMessage('GST number cannot be empty')
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST number format'),
  body('address.pincode').optional().matches(/^\d{6}$/).withMessage('Invalid pincode format'),
  body('address.coordinates').optional().custom(value => {
    if (Array.isArray(value)) {
      if (value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
        return true;
      }
      throw new Error('Invalid coordinates format [longitude, latitude]');
    }
    if (typeof value === 'object' && value.type === 'Point' && Array.isArray(value.coordinates)) {
      if (value.coordinates.length === 2 && 
          typeof value.coordinates[0] === 'number' && typeof value.coordinates[1] === 'number') {
        return true;
      }
      throw new Error('Invalid GeoJSON coordinates [longitude, latitude]');
    }
    throw new Error('Coordinates must be an array [longitude, latitude]');
  }),
  body('commissionRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0 and 100'),
  body('gstPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('GST percentage must be between 0 and 100')
];

/**
 * Validation middleware for adding a branch
 */
const validateAddBranch = [
  body('branchId').trim().notEmpty().withMessage('Branch ID is required')
    .matches(/^[0-9a-fA-F]{24}$/).withMessage('Invalid branch ID format')
];

const validateVendorOperatingHours = [
  body('operatingHours')
    .isArray({ min: 7, max: 7 })
    .withMessage('Operating hours must include exactly 7 days')
    .custom(hours => {
      const providedDays = hours.map(hour => hour.day);
      const hasAllDays = weekDays.every(day => providedDays.includes(day));
      if (!hasAllDays) {
        throw new Error('Operating hours must cover all days of the week');
      }

      const uniqueDays = new Set(providedDays);
      if (uniqueDays.size !== hours.length) {
        throw new Error('Duplicate days are not allowed in operating hours');
      }

      return hours.every(hour => {
        if (!hour.day || typeof hour.day !== 'string') {
          throw new Error('Each operating hour entry must include a valid day');
        }
        if (!weekDays.includes(hour.day)) {
          throw new Error(`Invalid day provided: ${hour.day}`);
        }
        if (hour.isClosed) {
          return true;
        }
        if (!hour.openTime || !hour.closeTime) {
          throw new Error(`Open and close time are required for ${hour.day}`);
        }
        return true;
      });
    })
];

const validateVendorBankAccounts = [
  body('bankAccounts')
    .isArray()
    .withMessage('Bank accounts must be provided as an array'),
  body('bankAccounts.*.bankName')
    .trim()
    .notEmpty()
    .withMessage('Bank name is required'),
  body('bankAccounts.*.accountHolderName')
    .trim()
    .notEmpty()
    .withMessage('Account holder name is required'),
  body('bankAccounts.*.accountNumber')
    .trim()
    .notEmpty()
    .withMessage('Account number is required'),
  body('bankAccounts.*.ifscCode')
    .trim()
    .notEmpty()
    .withMessage('IFSC code is required')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Invalid IFSC code format'),
  body('bankAccounts.*.accountType')
    .trim()
    .notEmpty()
    .withMessage('Account type is required')
    .isIn(['Primary', 'Secondary'])
    .withMessage('Invalid account type'),
  body('bankAccounts.*.isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const validateVendorDetailsUpdate = [
  body('restaurantName')
    .trim()
    .notEmpty()
    .withMessage('Restaurant name is required'),
  body('serviceOffered')
    .isArray({ min: 1 })
    .withMessage('At least one service type is required')
    .custom(value => {
      if (value.every(service => validServices.includes(service))) {
        return true;
      }
      throw new Error('Invalid service type');
    }),
  body('address.fullAddress')
    .trim()
    .notEmpty()
    .withMessage('Full address is required'),
  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('address.pincode')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Invalid pincode format'),
  body('address.coordinates')
    .custom(value => {
      if (Array.isArray(value)) {
        if (value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
          return true;
        }
        throw new Error('Invalid coordinates format [longitude, latitude]');
      }
      if (typeof value === 'object' && value.type === 'Point' && Array.isArray(value.coordinates)) {
        if (value.coordinates.length === 2 &&
            typeof value.coordinates[0] === 'number' && typeof value.coordinates[1] === 'number') {
          return true;
        }
        throw new Error('Invalid GeoJSON coordinates [longitude, latitude]');
      }
      throw new Error('Coordinates must be an array [longitude, latitude]');
    })
];

const validateDeliveryRadius = [
  body('deliveryRadius')
    .isFloat({ min: 0 })
    .withMessage('Delivery radius must be a positive number')
    .optional({ nullable: true })
];

module.exports = {
  validateCreateVendor,
  validateUpdateVendor,
  validateAddBranch,
  validateVendorOperatingHours,
  validateVendorBankAccounts,
  validateVendorDetailsUpdate,
  validateDeliveryRadius
};



