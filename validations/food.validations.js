const { body } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Validation middleware for food creation
 * Note: Image can be either uploaded file or URL string
 */
const validateCreateFood = [
  body('foodName')
    .trim()
    .notEmpty()
    .withMessage('Food name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Food name must be between 2 and 200 characters'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid category ID format');
      }
      return true;
    }),
  
  body('type')
    .notEmpty()
    .withMessage('Food type is required')
    .isIn(['veg', 'non-veg'])
    .withMessage('Food type must be either "veg" or "non-veg"'),
  
  body('foodImage')
    .optional()
    .trim()
    .custom((value, { req }) => {
      // If no file is uploaded and no URL is provided, return error
      if (!req.file && !value) {
        throw new Error('Food image is required (either upload a file or provide a URL)');
      }
      // If URL is provided, validate it
      if (value && !req.file) {
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error('Food image must be a valid URL');
        }
      }
      return true;
    }),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('basePrice')
    .notEmpty()
    .withMessage('Base price is required')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  
  body('discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a positive number')
    .custom((value, { req }) => {
      if (value !== null && value !== undefined && req.body.basePrice) {
        if (parseFloat(value) >= parseFloat(req.body.basePrice)) {
          throw new Error('Discount price must be less than base price');
        }
      }
      return true;
    }),
  
  body('preparationTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Preparation time must be a positive integer (in minutes)'),
  
  body('packingCharges')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Packing charges must be a positive number'),
  
  body('orderTypes')
    .notEmpty()
    .withMessage('At least one order type is required')
    .custom((value) => {
      let orderTypes;
      
      if (Array.isArray(value)) {
        orderTypes = value;
      } else if (typeof value === 'string') {
        // Try to parse as JSON first
        try {
          orderTypes = JSON.parse(value);
        } catch (e) {
          // If JSON parsing fails, treat as comma-separated string
          orderTypes = value.split(',').map(type => type.trim()).filter(type => type.length > 0);
        }
      } else {
        throw new Error('Order types must be an array, JSON string, or comma-separated string');
      }
      
      if (!Array.isArray(orderTypes) || orderTypes.length === 0) {
        throw new Error('At least one order type is required');
      }
      
      const { SERVICE_TYPES } = require('../utils/serviceType');
      const validTypes = SERVICE_TYPES;
      const invalidTypes = orderTypes.filter(type => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid order types: ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
      }
      
      return true;
    }),
  
  body('vendor')
    .optional() // Optional because vendors don't need to provide it (will be auto-set)
    .custom((value, { req }) => {
      // For vendors, vendor field is optional (will be auto-set to their own vendor ID)
      if (req.user && req.user.role === 'vendor') {
        // If vendor is provided (even empty string), ignore it for vendors
        return true;
      }
      // For admins/super_admins, vendor must be provided and valid
      if (!value || value === '' || value === null || value === undefined) {
        throw new Error('Vendor is required');
      }
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid vendor ID format');
      }
      return true;
    }),
  
  body('addOns')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const addOns = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(addOns)) {
        throw new Error('Add-ons must be an array');
      }
      addOns.forEach((addOn, index) => {
        if (!addOn.name || typeof addOn.name !== 'string') {
          throw new Error(`Add-on at index ${index} must have a valid name`);
        }
        if (addOn.price === undefined || isNaN(parseFloat(addOn.price)) || parseFloat(addOn.price) < 0) {
          throw new Error(`Add-on at index ${index} must have a valid price (positive number)`);
        }
      });
      return true;
    }),
  
  body('customizations')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const customizations = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(customizations)) {
        throw new Error('Customizations must be an array');
      }
      customizations.forEach((customization, index) => {
        if (!customization.name || typeof customization.name !== 'string') {
          throw new Error(`Customization at index ${index} must have a valid name`);
        }
        if (customization.price === undefined || isNaN(parseFloat(customization.price)) || parseFloat(customization.price) < 0) {
          throw new Error(`Customization at index ${index} must have a valid price (positive number)`);
        }
      });
      return true;
    }),
  
  body('dayOffers')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const dayOffers = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(dayOffers)) {
        throw new Error('Day offers must be an array');
      }
      dayOffers.forEach((offer, index) => {
        if (!['percentage', 'fixed'].includes(offer.discountType)) {
          throw new Error(`Day offer at index ${index} must have a valid discountType (percentage or fixed)`);
        }
        if (offer.discountValue === undefined || isNaN(parseFloat(offer.discountValue)) || parseFloat(offer.discountValue) < 0) {
          throw new Error(`Day offer at index ${index} must have a valid discountValue (positive number)`);
        }
        if (offer.discountType === 'percentage' && (offer.discountValue < 0 || offer.discountValue > 100)) {
          throw new Error(`Day offer at index ${index}: percentage discount must be between 0 and 100`);
        }
        if (!Array.isArray(offer.activeDays) || offer.activeDays.length === 0) {
          throw new Error(`Day offer at index ${index} must have at least one active day`);
        }
        const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const invalidDays = offer.activeDays.filter(day => !validDays.includes(day));
        if (invalidDays.length > 0) {
          throw new Error(`Day offer at index ${index} has invalid days: ${invalidDays.join(', ')}`);
        }
      });
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  body('isPrebook')
    .optional()
    .isBoolean()
    .withMessage('isPrebook must be a boolean value'),
  
  body('prebookStartDate')
    .optional()
    .custom((value, { req }) => {
      const isPrebook = req.body.isPrebook === true || req.body.isPrebook === 'true';
      
      // If isPrebook is false, don't validate dates
      if (!isPrebook) {
        return true;
      }
      
      // If isPrebook is true, prebookStartDate is required
      if (isPrebook && !value) {
        throw new Error('Prebook start date is required when isPrebook is true');
      }
      
      // If provided, must be a valid date
      if (value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid prebook start date format');
        }
      }
      return true;
    }),
  
  body('prebookEndDate')
    .optional()
    .custom((value, { req }) => {
      const isPrebook = req.body.isPrebook === true || req.body.isPrebook === 'true';
      
      // If isPrebook is false, don't validate dates
      if (!isPrebook) {
        return true;
      }
      
      // If isPrebook is true, prebookEndDate is required
      if (isPrebook && !value) {
        throw new Error('Prebook end date is required when isPrebook is true');
      }
      
      // If provided, must be a valid date
      if (value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid prebook end date format');
        }
      }
      
      // Validate that end date is after start date if both are provided and isPrebook is true
      if (isPrebook && value && req.body.prebookStartDate) {
        const startDate = new Date(req.body.prebookStartDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('Prebook end date must be after prebook start date');
        }
      }
      return true;
    })
];

/**
 * Validation middleware for food update
 */
const validateUpdateFood = [
  body('foodName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Food name cannot be empty')
    .isLength({ min: 2, max: 200 })
    .withMessage('Food name must be between 2 and 200 characters'),
  
  body('category')
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid category ID format');
      }
      return true;
    }),
  
  body('type')
    .optional()
    .isIn(['veg', 'non-veg'])
    .withMessage('Food type must be either "veg" or "non-veg"'),
  
  body('foodImage')
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
        throw new Error('Food image must be a valid URL');
      }
    }),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  
  body('discountPrice')
    .optional()
    .custom((value, { req }) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null/empty for clearing discount
      }
      if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
        throw new Error('Discount price must be a positive number');
      }
      // Validate discountPrice is less than basePrice if basePrice is provided
      if (req.body.basePrice !== undefined && req.body.basePrice !== null && req.body.basePrice !== '') {
        const basePrice = parseFloat(req.body.basePrice);
        const discountPrice = parseFloat(value);
        if (!isNaN(basePrice) && !isNaN(discountPrice) && discountPrice >= basePrice) {
          throw new Error('Discount price must be less than base price');
        }
      }
      return true;
    }),
  
  body('preparationTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Preparation time must be a positive integer (in minutes)'),
  
  body('packingCharges')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Packing charges must be a positive number'),
  
  body('orderTypes')
    .optional()
    .custom((value) => {
      if (!value) return true;
      
      let orderTypes;
      
      if (Array.isArray(value)) {
        orderTypes = value;
      } else if (typeof value === 'string') {
        // Try to parse as JSON first
        try {
          orderTypes = JSON.parse(value);
        } catch (e) {
          // If JSON parsing fails, treat as comma-separated string
          orderTypes = value.split(',').map(type => type.trim()).filter(type => type.length > 0);
        }
      } else {
        throw new Error('Order types must be an array, JSON string, or comma-separated string');
      }
      
      if (!Array.isArray(orderTypes) || orderTypes.length === 0) {
        throw new Error('At least one order type is required');
      }
      
      const { SERVICE_TYPES } = require('../utils/serviceType');
      const validTypes = SERVICE_TYPES;
      const invalidTypes = orderTypes.filter(type => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid order types: ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
      }
      
      return true;
    }),
  
  body('vendor')
    .optional()
    .custom((value, { req }) => {
      // For vendors, vendor field should not be validated (they can't change it anyway)
      if (req.user && req.user.role === 'vendor') {
        return true;
      }
      // If value is empty/null/undefined, skip validation (optional field)
      if (!value || value === '' || value === null || value === undefined) {
        return true;
      }
      // For admins, validate vendor ID format if provided
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid vendor ID format');
      }
      return true;
    }),
  
  body('addOns')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const addOns = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(addOns)) {
        throw new Error('Add-ons must be an array');
      }
      addOns.forEach((addOn, index) => {
        if (!addOn.name || typeof addOn.name !== 'string') {
          throw new Error(`Add-on at index ${index} must have a valid name`);
        }
        if (addOn.price === undefined || isNaN(parseFloat(addOn.price)) || parseFloat(addOn.price) < 0) {
          throw new Error(`Add-on at index ${index} must have a valid price (positive number)`);
        }
      });
      return true;
    }),
  
  body('customizations')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const customizations = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(customizations)) {
        throw new Error('Customizations must be an array');
      }
      customizations.forEach((customization, index) => {
        if (!customization.name || typeof customization.name !== 'string') {
          throw new Error(`Customization at index ${index} must have a valid name`);
        }
        if (customization.price === undefined || isNaN(parseFloat(customization.price)) || parseFloat(customization.price) < 0) {
          throw new Error(`Customization at index ${index} must have a valid price (positive number)`);
        }
      });
      return true;
    }),
  
  body('dayOffers')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const dayOffers = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(dayOffers)) {
        throw new Error('Day offers must be an array');
      }
      dayOffers.forEach((offer, index) => {
        if (!['percentage', 'fixed'].includes(offer.discountType)) {
          throw new Error(`Day offer at index ${index} must have a valid discountType (percentage or fixed)`);
        }
        if (offer.discountValue === undefined || isNaN(parseFloat(offer.discountValue)) || parseFloat(offer.discountValue) < 0) {
          throw new Error(`Day offer at index ${index} must have a valid discountValue (positive number)`);
        }
        if (offer.discountType === 'percentage' && (offer.discountValue < 0 || offer.discountValue > 100)) {
          throw new Error(`Day offer at index ${index}: percentage discount must be between 0 and 100`);
        }
        if (!Array.isArray(offer.activeDays) || offer.activeDays.length === 0) {
          throw new Error(`Day offer at index ${index} must have at least one active day`);
        }
      });
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  body('isPrebook')
    .optional()
    .isBoolean()
    .withMessage('isPrebook must be a boolean value'),
  
  body('prebookStartDate')
    .optional()
    .custom((value, { req }) => {
      const isPrebook = req.body.isPrebook === true || req.body.isPrebook === 'true';
      
      // If isPrebook is false, don't validate dates
      if (!isPrebook) {
        return true;
      }
      
      // If isPrebook is true, prebookStartDate is required
      if (isPrebook && !value) {
        throw new Error('Prebook start date is required when isPrebook is true');
      }
      
      // If provided, must be a valid date
      if (value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid prebook start date format');
        }
      }
      return true;
    }),
  
  body('prebookEndDate')
    .optional()
    .custom((value, { req }) => {
      const isPrebook = req.body.isPrebook === true || req.body.isPrebook === 'true';
      
      // If isPrebook is false, don't validate dates
      if (!isPrebook) {
        return true;
      }
      
      // If isPrebook is true, prebookEndDate is required
      if (isPrebook && !value) {
        throw new Error('Prebook end date is required when isPrebook is true');
      }
      
      // If provided, must be a valid date
      if (value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid prebook end date format');
        }
      }
      
      // Validate that end date is after start date if both are provided and isPrebook is true
      if (isPrebook && value && req.body.prebookStartDate) {
        const startDate = new Date(req.body.prebookStartDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('Prebook end date must be after prebook start date');
        }
      }
      return true;
    })
];

/**
 * Validation middleware for adding day offer
 */
const validateAddDayOffer = [
  body('discountType')
    .notEmpty()
    .withMessage('Discount type is required')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be either "percentage" or "fixed"'),
  
  body('discountValue')
    .notEmpty()
    .withMessage('Discount value is required')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  
  body('activeDays')
    .notEmpty()
    .withMessage('Active days are required')
    .custom((value) => {
      const activeDays = Array.isArray(value) ? value : JSON.parse(value || '[]');
      if (!Array.isArray(activeDays) || activeDays.length === 0) {
        throw new Error('At least one active day is required');
      }
      const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const invalidDays = activeDays.filter(day => !validDays.includes(day));
      if (invalidDays.length > 0) {
        throw new Error(`Invalid days: ${invalidDays.join(', ')}. Valid days are: ${validDays.join(', ')}`);
      }
      return true;
    }),
  
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?[AaPp][Mm])?$/)
    .withMessage('Start time must be in format HH:MM or HH:MM AM/PM'),
  
  body('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?[AaPp][Mm])?$/)
    .withMessage('End time must be in format HH:MM or HH:MM AM/PM'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

module.exports = {
  validateCreateFood,
  validateUpdateFood,
  validateAddDayOffer
};

