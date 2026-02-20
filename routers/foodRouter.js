const express = require('express');
const router = express.Router();
const foodController = require('../controllers/foodController');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { validateCreateFood, validateUpdateFood, validateAddDayOffer } = require('../validations/food.validations');
const { uploadImage } = require('../documents/food.middleware');

/**
 * Food Routes
 */

// Create new food item (Admin, Super Admin, and Vendor)
router.post('/', 
  authenticateToken, 
  requireRole('admin', 'super_admin', 'vendor'), 
  uploadImage,
  validateCreateFood,
  foodController.createFood
);

// Get all food items with filtering, search, and pagination
router.get('/', foodController.getAllFoods);

// Search foods by vendor (Vendor token or vendor ID required) - MUST BE BEFORE /:id
router.get('/search', 
  optionalAuth,
  foodController.searchFoodsByVendor
);

// Get single food item by ID
router.get('/:id', foodController.getFoodById);

// Update food active status (on/off) - Admin, Super Admin, Vendor
router.patch('/:id/active',
  authenticateToken,
  requireRole('admin', 'super_admin', 'vendor'),
  foodController.updateFoodStatus
);

// Update food item (Admin, Super Admin, and Vendor - vendors can only update their own)
router.put('/:id', 
  authenticateToken, 
  requireRole('admin', 'super_admin', 'vendor'), 
  uploadImage,
  validateUpdateFood,
  foodController.updateFood
);

// Soft delete food item (Admin, Super Admin, and Vendor - vendors can only delete their own)
router.delete('/:id', 
  authenticateToken, 
  requireRole('admin', 'super_admin', 'vendor'), 
  foodController.deleteFood
);

// Hard delete food item (Super Admin and Admin only)
router.delete('/:id/hard', 
  authenticateToken, 
  requireRole('super_admin', 'admin'), 
  foodController.hardDeleteFood
);

// Add day offer to food item (Admin, Super Admin, and Vendor)
router.post('/:id/day-offers', 
  authenticateToken, 
  requireRole('admin', 'super_admin', 'vendor'), 
  validateAddDayOffer,
  foodController.addDayOffer
);

// Remove day offer from food item (Admin, Super Admin, and Vendor)
router.delete('/:id/day-offers/:offerId', 
  authenticateToken, 
  requireRole('admin', 'super_admin', 'vendor'), 
  foodController.removeDayOffer
);

module.exports = router;

