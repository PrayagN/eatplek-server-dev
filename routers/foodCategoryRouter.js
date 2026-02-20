const express = require('express');
const router = express.Router();
const foodCategoryController = require('../controllers/foodCategoryController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateCreateFoodCategory, validateUpdateFoodCategory } = require('../validations/foodCategory.validations');
const { uploadImage } = require('../documents/foodCategory.middleware');

/**
 * Food Category Routes
 */

// Create new food category (Admin, Super Admin, and Vendor)
router.post('/', 
  authenticateToken, 
  requireRole('admin', 'super_admin', 'vendor'), 
  uploadImage,
  validateCreateFoodCategory,
  foodCategoryController.createFoodCategory
);

// Get all food categories with filtering and pagination
router.get('/', foodCategoryController.getAllFoodCategories);

// Get single food category by ID
router.get('/:id', foodCategoryController.getFoodCategoryById);

// Update food category (Admin only)
router.put('/:id', 
  authenticateToken, 
  requireRole('admin', 'super_admin', 'vendor'), 
  uploadImage,
  validateUpdateFoodCategory,
  foodCategoryController.updateFoodCategory
);

// Soft delete food category (Admin only)
router.delete('/:id', 
  authenticateToken, 
  requireRole('admin', 'super_admin', 'vendor'), 
  foodCategoryController.deleteFoodCategory
);

// Hard delete food category (Super Admin only)
router.delete('/:id/hard', 
  authenticateToken, 
  requireRole('super_admin' , 'admin', 'vendor'), 
  foodCategoryController.hardDeleteFoodCategory
);

module.exports = router;
