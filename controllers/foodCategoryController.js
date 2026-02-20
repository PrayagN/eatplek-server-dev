const FoodCategory = require('../models/FoodCategory');
const { validationResult } = require('express-validator');
const { uploadFile, deleteFile } = require('../utils/imagekit');
const Admin = require('../models/Admin');
const Vendor = require('../models/Vendor');

/**
 * Food Category Controller
 * Handles all food category-related operations
 */
class FoodCategoryController {
  /**
   * Create a new food category
   * POST /api/food-categories
   * Accessible by admins, super admins, and vendors
   */
  async createFoodCategory(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Get category name and description from body
      const { categoryName, description } = req.body;

      // Handle image: upload to ImageKit if file exists, otherwise use URL from body
      let imageUrl = req.body.image; // Default to URL if provided
      let imageKitFileId = null;

      if (req.file) {
        try {
          // Upload file to ImageKit
          const uploadResult = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            'categories',
            { width: 512, height: 512 }
          );
          imageUrl = uploadResult.url;
          imageKitFileId = uploadResult.fileId;
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: uploadError.message
          });
        }
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Image is required (either upload a file or provide a URL)'
        });
      }

      // Normalize category name (trim and normalize whitespace)
      const normalizedCategoryName = categoryName.trim().replace(/\s+/g, ' ');

      // Handle admin and vendor assignment based on user role
      let adminId = null;
      let vendorId = null;

      if (req.user && req.user.role) {
        const userRole = req.user.role;
        
        // If user is admin or super_admin, set admin field
        if (userRole === 'admin' || userRole === 'super_admin') {
          // Verify admin exists
          const admin = await Admin.findById(req.user.id);
          if (!admin) {
            return res.status(404).json({
              success: false,
              message: 'Admin profile not found'
            });
          }
          adminId = req.user.id;
        }
        
        // If user is vendor, set vendor field
        if (userRole === 'vendor') {
          // Check if vendorId is in token, otherwise lookup by email or id
          if (req.user.vendorId) {
            vendorId = req.user.vendorId;
          } else if (req.user.id) {
            // Try to find vendor by ID (if vendor ID is same as user ID)
            const vendorById = await Vendor.findById(req.user.id);
            if (vendorById) {
              vendorId = vendorById._id;
            } else if (req.user.email) {
              // Lookup vendor by email
              const vendorByEmail = await Vendor.findOne({ email: req.user.email });
              if (vendorByEmail) {
                vendorId = vendorByEmail._id;
              }
            }
          }
          
          if (!vendorId) {
            return res.status(403).json({
              success: false,
              message: 'Vendor profile not found. Please contact administrator.'
            });
          }

          // Verify vendor exists
          const vendor = await Vendor.findById(vendorId);
          if (!vendor) {
            return res.status(404).json({
              success: false,
              message: 'Vendor not found'
            });
          }
        }
      }

      // Check if category with same name already exists (case-insensitive, ignore whitespace)
      // Also check within the same admin/vendor scope if needed
      const existingCategoryFilter = {
        categoryName: {
          $regex: new RegExp(`^${normalizedCategoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
        }
      };

      const existingCategory = await FoodCategory.findOne(existingCategoryFilter);

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'Category name already exists'
        });
      }

      // Create new food category (use normalized name)
      const foodCategory = new FoodCategory({
        categoryName: normalizedCategoryName,
        image: imageUrl,
        description: description || null,
        imageKitFileId: imageKitFileId, // Store ImageKit file ID for future reference
        admin: adminId,
        vendor: vendorId
      });
      await foodCategory.save();

      // Populate admin and vendor fields before sending response
      await foodCategory.populate([
        { path: 'admin', select: 'name email role' },
        { path: 'vendor', select: 'restaurantName ownerName email' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Food category created successfully',
        data: foodCategory
      });
    } catch (error) {
      console.error('Error creating food category:', error);

      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({
          success: false,
          message: `${field} already exists in the system`
        });
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating food category',
        error: error.message
      });
    }
  }

  /**
   * Get all food categories with filtering and pagination
   * GET /api/food-categories
   */
  async getAllFoodCategories(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};

      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      if (search) {
        // Escape special regex characters for security
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Google-like search across multiple fields
        filter.$or = [
          { categoryName: { $regex: escapedSearch, $options: 'i' } },
          { description: { $regex: escapedSearch, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const [categories, totalCount] = await Promise.all([
        FoodCategory.find(filter)
          .populate({
            path: 'admin',
            select: 'name email role',
            options: { lean: false }
          })
          .populate({
            path: 'vendor',
            select: 'restaurantName ownerName email',
            options: { lean: false }
          })
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        FoodCategory.countDocuments(filter)
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.json({
        success: true,
        message: 'Food categories retrieved successfully',
        data: categories,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage
        }
      });
    } catch (error) {
      console.error('Error getting food categories:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving food categories',
        error: error.message
      });
    }
  }

  /**
   * Get a single food category by ID
   * GET /api/food-categories/:id
   */
  async getFoodCategoryById(req, res) {
    try {
      const foodCategory = await FoodCategory.findById(req.params.id)
        .populate('admin', 'name email role')
        .populate('vendor', 'restaurantName ownerName email');

      if (!foodCategory) {
        return res.status(404).json({
          success: false,
          message: 'Food category not found'
        });
      }

      res.json({
        success: true,
        message: 'Food category retrieved successfully',
        data: foodCategory
      });
    } catch (error) {
      console.error('Error getting food category:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food category ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error retrieving food category',
        error: error.message
      });
    }
  }

  /**
   * Update a food category
   * PUT /api/food-categories/:id
   */
  async updateFoodCategory(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Find food category
      const foodCategory = await FoodCategory.findById(req.params.id);
      if (!foodCategory) {
        return res.status(404).json({
          success: false,
          message: 'Food category not found'
        });
      }

      // Handle image upload if file is provided
      const updateData = { ...req.body };

      // Check for duplicate category name (excluding current category)
      if (req.body.categoryName) {
        // Normalize category name (trim and normalize whitespace)
        const normalizedCategoryName = req.body.categoryName.trim().replace(/\s+/g, ' ');

        const duplicateCategory = await FoodCategory.findOne({
          _id: { $ne: req.params.id },
          categoryName: {
            $regex: new RegExp(`^${normalizedCategoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
          }
        });

        if (duplicateCategory) {
          return res.status(409).json({
            success: false,
            message: 'Category name already exists'
          });
        }

        // Use normalized name in update data
        updateData.categoryName = normalizedCategoryName;
      }

      if (req.file) {
        try {
          // Delete old image from ImageKit if it exists
          if (foodCategory.imageKitFileId) {
            try {
              await deleteFile(foodCategory.imageKitFileId);
            } catch (deleteError) {
              console.error('Error deleting old image from ImageKit:', deleteError);
              // Continue even if deletion fails
            }
          }

          // Upload new file to ImageKit
          const uploadResult = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            'categories',
            { width: 512, height: 512 }
          );
          updateData.image = uploadResult.url;
          updateData.imageKitFileId = uploadResult.fileId;
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: uploadError.message
          });
        }
      }

      // Update food category
      const updatedCategory = await FoodCategory.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('admin', 'name email role')
        .populate('vendor', 'restaurantName ownerName email');

      res.json({
        success: true,
        message: 'Food category updated successfully',
        data: updatedCategory
      });
    } catch (error) {
      console.error('Error updating food category:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food category ID'
        });
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({
          success: false,
          message: `${field} already exists in the system`
        });
      }

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating food category',
        error: error.message
      });
    }
  }

  /**
   * Delete a food category (soft delete by setting isActive to false)
   * DELETE /api/food-categories/:id
   */
  async deleteFoodCategory(req, res) {
    try {
      const foodCategory = await FoodCategory.findById(req.params.id);
      if (!foodCategory) {
        return res.status(404).json({
          success: false,
          message: 'Food category not found'
        });
      }

      // Check if already deleted
      if (!foodCategory.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Food category is already deleted'
        });
      }

      // Soft delete: Set isActive to false using findByIdAndUpdate to bypass validation
      const updatedCategory = await FoodCategory.findByIdAndUpdate(
        req.params.id,
        { 
          $set: { 
            isActive: false,
            updatedAt: Date.now()
          } 
        },
        { new: true, runValidators: false }
      );

      if (!updatedCategory) {
        return res.status(404).json({
          success: false,
          message: 'Food category not found'
        });
      }

      res.json({
        success: true,
        message: 'Food category deleted successfully',
        data: {
          id: updatedCategory._id,
          categoryName: updatedCategory.categoryName,
          isActive: updatedCategory.isActive
        }
      });
    } catch (error) {
      console.error('Error deleting food category:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food category ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting food category',
        error: error.message
      });
    }
  }

  /**
   * Hard delete a food category (permanently remove from database)
   * DELETE /api/food-categories/:id/hard
   * WARNING: This permanently deletes the food category
   */
  async hardDeleteFoodCategory(req, res) {
    try {
      const foodCategory = await FoodCategory.findById(req.params.id);

      if (!foodCategory) {
        return res.status(404).json({
          success: false,
          message: 'Food category not found'
        });
      }

      // Delete image from ImageKit if it exists
      if (foodCategory.imageKitFileId) {
        try {
          await deleteFile(foodCategory.imageKitFileId);
        } catch (deleteError) {
          console.error('Error deleting image from ImageKit:', deleteError);
          // Continue with database deletion even if ImageKit deletion fails
          return res.status(404).json({
            success: false,
            message: 'Image Kit Problome'
          });
        }
      }

      // Delete from database
      await FoodCategory.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Food category permanently deleted'
      });
    } catch (error) {
      console.error('Error hard deleting food category:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food category ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting food category',
        error: error.message
      });
    }
  }
}

module.exports = new FoodCategoryController();

