const mongoose = require('mongoose');
const Food = require('../models/Food');
const FoodCategory = require('../models/FoodCategory');
const Vendor = require('../models/Vendor');
const { validationResult } = require('express-validator');
const { uploadFile, deleteFile } = require('../utils/imagekit');

/**
 * Food Controller
 * Handles all food-related operations
 */
class FoodController {
  /**
   * Create a new food item
   * POST /api/foods
   * Accessible by admins, super admins, and vendors
   */
  async createFood(req, res) {
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

      // Validate category exists
      const category = await FoodCategory.findById(req.body.category);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Food category not found'
        });
      }

      // Handle vendor assignment based on user role
      let vendorId = req.body.vendor;
      
      // If user is a vendor, automatically set vendor to their own vendor ID
      if (req.user.role === 'vendor') {
        // Check if vendorId is in token, otherwise lookup by email
        if (req.user.vendorId) {
          vendorId = req.user.vendorId;
        } else if (req.user.email) {
          // Lookup vendor by email
          const vendorByEmail = await Vendor.findOne({ email: req.user.email });
          if (!vendorByEmail) {
            return res.status(403).json({
              success: false,
              message: 'Vendor profile not found. Please contact administrator.'
            });
          }
          vendorId = vendorByEmail._id;
        } else {
          return res.status(403).json({
            success: false,
            message: 'Unable to identify vendor. Please contact administrator.'
          });
        }

        // Force vendor field to authenticated vendor
        req.body.vendor = vendorId.toString();
      }

      // Validate vendor exists
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Handle image: upload to ImageKit if file exists, otherwise use URL from body
      let imageUrl = req.body.foodImage; // Default to URL if provided
      let imageKitFileId = null;

      if (req.file) {
        try {
          // Upload file to ImageKit
          const uploadResult = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            'foods',
            { width: 800, height: 600 }
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
          message: 'Food image is required (either upload a file or provide a URL)'
        });
      }

      // Parse orderTypes if provided as string (comma-separated or JSON)
      let orderTypes = req.body.orderTypes;
      if (orderTypes && typeof orderTypes === 'string') {
        try {
          // Try JSON parse first
          orderTypes = JSON.parse(orderTypes);
        } catch (e) {
          // If JSON parsing fails, treat as comma-separated string
          orderTypes = orderTypes.split(',').map(type => type.trim()).filter(type => type.length > 0);
        }
      }

      // Prepare food data
      const foodData = {
        ...req.body,
        vendor: vendorId, // Use the determined vendor ID
        foodImage: imageUrl,
        imageKitFileId: imageKitFileId,
        orderTypes: orderTypes // Use parsed orderTypes
      };

      // Normalize addOns (allow empty string or JSON string)
      if (typeof foodData.addOns === 'string') {
        if (foodData.addOns.trim() === '') {
          foodData.addOns = [];
        } else {
          try {
            foodData.addOns = JSON.parse(foodData.addOns);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'Invalid addOns format. Must be valid JSON array'
            });
          }
        }
      }

      // Normalize dayOffers (allow empty string or JSON string)
      if (typeof foodData.dayOffers === 'string') {
        if (foodData.dayOffers.trim() === '') {
          foodData.dayOffers = [];
        } else {
          try {
            foodData.dayOffers = JSON.parse(foodData.dayOffers);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'Invalid dayOffers format. Must be valid JSON array'
            });
          }
        }
      }

      // Normalize customizations (allow empty string or JSON string)
      if (typeof foodData.customizations === 'string') {
        if (foodData.customizations.trim() === '') {
          foodData.customizations = [];
        } else {
          try {
            foodData.customizations = JSON.parse(foodData.customizations);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'Invalid customizations format. Must be valid JSON array'
            });
          }
        }
      }

      // Handle discountPrice: set to null if not provided, is 0, or empty string
      if (foodData.discountPrice !== undefined) {
        const discountPriceValue = foodData.discountPrice;
        if (discountPriceValue === null || discountPriceValue === '' || discountPriceValue === 0) {
          foodData.discountPrice = null;
        } else {
          const parsedDiscountPrice = Number(discountPriceValue);
          if (!Number.isFinite(parsedDiscountPrice) || parsedDiscountPrice < 0) {
            return res.status(400).json({
              success: false,
              message: 'Discount price must be a valid positive number or null'
            });
          }
          // Validate discountPrice is less than basePrice
          const basePriceValue = Number(foodData.basePrice);
          if (!Number.isFinite(basePriceValue) || basePriceValue <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Base price must be a valid positive number'
            });
          }
          if (parsedDiscountPrice >= basePriceValue) {
            return res.status(400).json({
              success: false,
              message: 'Discount price must be less than base price'
            });
          }
          foodData.discountPrice = parsedDiscountPrice;
        }
      }

      // Create new food item
      const food = new Food(foodData);
      await food.save();

      // Populate references
      await food.populate('category vendor');

      res.status(201).json({
        success: true,
        message: 'Food item created successfully',
        data: food
      });
    } catch (error) {
      console.error('Error creating food item:', error);

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
        message: 'Error creating food item',
        error: error.message
      });
    }
  }

  /**
   * Get all food items with filtering, search, and pagination
   * GET /api/foods
   * Google-like search across multiple fields
   */
  async getAllFoods(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        isActive,
        search,
        category,
        vendor,
        type,
        minPrice,
        maxPrice,
        orderType,
        isPrebook,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};

      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      if (category) {
        filter.category = category;
      }

      if (vendor) {
        filter.vendor = vendor;
      }

      if (type) {
        filter.type = type.toLowerCase();
      }

      if (isPrebook !== undefined) {
        filter.isPrebook = isPrebook === 'true';
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.basePrice = {};
        if (minPrice !== undefined) {
          filter.basePrice.$gte = parseFloat(minPrice);
        }
        if (maxPrice !== undefined) {
          filter.basePrice.$lte = parseFloat(maxPrice);
        }
      }

      if (orderType) {
        const { normalizeServiceType, getServiceTypeVariations } = require('../utils/serviceType');
        const normalized = normalizeServiceType(orderType);
        if (normalized) {
          // Get all possible variations (old and new formats) for database query
          const serviceVariations = getServiceTypeVariations(orderType);
          filter.orderTypes = { $in: serviceVariations };
        } else {
          // If normalization fails, use the original value
          filter.orderTypes = { $in: [orderType] };
        }
      }

      // Google-like search across multiple fields
      if (search) {
        // Escape special regex characters for security
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Search across food name, description, and add-ons
        filter.$or = [
          { foodName: { $regex: escapedSearch, $options: 'i' } },
          { description: { $regex: escapedSearch, $options: 'i' } },
          { 'addOns.name': { $regex: escapedSearch, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with population
      const [foods, totalCount] = await Promise.all([
        Food.find(filter)
          .populate('category', 'categoryName image')
          .populate('vendor', 'restaurantName')
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Food.countDocuments(filter)
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.json({
        success: true,
        message: 'Food items retrieved successfully',
        data: foods,
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
      console.error('Error getting food items:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving food items',
        error: error.message
      });
    }
  }

  /**
   * Get a single food item by ID
   * GET /api/foods/:id
   */
  async getFoodById(req, res) {
    try {
      const food = await Food.findById(req.params.id)
        .populate('category', 'categoryName image description')
        .populate('vendor', 'restaurantName ownerName address profileImage restaurantImage');

      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      res.json({
        success: true,
        message: 'Food item retrieved successfully',
        data: food
      });
    } catch (error) {
      console.error('Error getting food item:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food item ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error retrieving food item',
        error: error.message
      });
    }
  }

  /**
   * Update a food item
   * PUT /api/foods/:id
   * Accessible by admins, super admins, and vendors (vendors can only update their own)
   */
  async updateFood(req, res) {
    try {
      // Validate food ID format first
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid food item ID format'
        });
      }

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Find food item
      const food = await Food.findById(req.params.id);
      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      // Check vendor access: vendors can only update their own foods
      if (req.user.role === 'vendor') {
        let vendorId = null;
        
        // Get vendor ID from token or lookup by email
        if (req.user.vendorId) {
          vendorId = req.user.vendorId.toString();
        } else if (req.user.email) {
          const vendorByEmail = await Vendor.findOne({ email: req.user.email });
          if (!vendorByEmail) {
            return res.status(403).json({
              success: false,
              message: 'Vendor profile not found'
            });
          }
          vendorId = vendorByEmail._id.toString();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Unable to identify vendor'
          });
        }

        // Check if food belongs to this vendor
        if (food.vendor.toString() !== vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own food items'
          });
        }

        // Vendors cannot change the vendor field
        if (req.body.vendor && req.body.vendor !== food.vendor.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You cannot change the vendor for food items'
          });
        }
      }

      // Validate category if provided
      if (req.body.category) {
        if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid category ID format'
          });
        }
        const category = await FoodCategory.findById(req.body.category);
        if (!category) {
          return res.status(404).json({
            success: false,
            message: 'Food category not found'
          });
        }
      }

      // Validate vendor if provided (only for admins)
      if (req.body.vendor && req.user.role !== 'vendor') {
        if (!mongoose.Types.ObjectId.isValid(req.body.vendor)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid vendor ID format'
          });
        }
        const vendor = await Vendor.findById(req.body.vendor);
        if (!vendor) {
          return res.status(404).json({
            success: false,
            message: 'Vendor not found'
          });
        }
      }

      // Parse orderTypes if provided as string (comma-separated or JSON)
      if (req.body.orderTypes && typeof req.body.orderTypes === 'string') {
        try {
          // Try JSON parse first
          req.body.orderTypes = JSON.parse(req.body.orderTypes);
        } catch (e) {
          // If JSON parsing fails, treat as comma-separated string
          req.body.orderTypes = req.body.orderTypes.split(',').map(type => type.trim()).filter(type => type.length > 0);
        }
      }

      // Prepare update data
      const updateData = { ...req.body };

      // Remove vendor field if it's empty or if user is a vendor (vendors can't change vendor)
      if (updateData.vendor === '' || updateData.vendor === null || updateData.vendor === undefined) {
        delete updateData.vendor;
      }
      if (req.user.role === 'vendor') {
        delete updateData.vendor; // Vendors cannot change vendor field
      }

      // Handle image upload if file is provided
      if (req.file) {
        try {
          // Delete old image from ImageKit if it exists
          if (food.imageKitFileId) {
            try {
              await deleteFile(food.imageKitFileId);
            } catch (deleteError) {
              console.error('Error deleting old image from ImageKit:', deleteError);
              // Continue even if deletion fails
            }
          }

          // Upload new file to ImageKit
          const uploadResult = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            'foods',
            { width: 800, height: 600 }
          );
          updateData.foodImage = uploadResult.url;
          updateData.imageKitFileId = uploadResult.fileId;
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: uploadError.message
          });
        }
      }

      // Normalize addOns (allow empty string or JSON string)
      if (typeof updateData.addOns === 'string') {
        if (updateData.addOns.trim() === '') {
          updateData.addOns = [];
        } else {
          try {
            updateData.addOns = JSON.parse(updateData.addOns);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'Invalid addOns format. Must be valid JSON array'
            });
          }
        }
      }

      // Normalize dayOffers (allow empty string or JSON string)
      if (typeof updateData.dayOffers === 'string') {
        if (updateData.dayOffers.trim() === '') {
          updateData.dayOffers = [];
        } else {
          try {
            updateData.dayOffers = JSON.parse(updateData.dayOffers);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'Invalid dayOffers format. Must be valid JSON array'
            });
          }
        }
      }

      // Normalize customizations (allow empty string or JSON string)
      if (typeof updateData.customizations === 'string') {
        if (updateData.customizations.trim() === '') {
          updateData.customizations = [];
        } else {
          try {
            updateData.customizations = JSON.parse(updateData.customizations);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'Invalid customizations format. Must be valid JSON array'
            });
          }
        }
      }

      // Handle basePrice: ensure it's a valid number
      if (updateData.basePrice !== undefined) {
        const parsedBasePrice = Number(updateData.basePrice);
        if (!Number.isFinite(parsedBasePrice) || parsedBasePrice <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Base price must be a valid positive number'
          });
        }
        updateData.basePrice = parsedBasePrice;
      }

      // Handle discountPrice: set to null if not provided, is 0, or empty string
      if (updateData.discountPrice !== undefined) {
        const discountPriceValue = updateData.discountPrice;
        if (discountPriceValue === null || discountPriceValue === '' || discountPriceValue === 0) {
          updateData.discountPrice = null;
        } else {
          const parsedDiscountPrice = Number(discountPriceValue);
          if (!Number.isFinite(parsedDiscountPrice) || parsedDiscountPrice < 0) {
            return res.status(400).json({
              success: false,
              message: 'Discount price must be a valid positive number or null'
            });
          }
          // Get basePrice for validation (use provided value or existing value)
          const basePriceValue = updateData.basePrice !== undefined 
            ? updateData.basePrice  // Already parsed above
            : Number(food.basePrice); // Convert existing value to number
          
          if (!Number.isFinite(basePriceValue) || basePriceValue <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Base price must be set and valid before setting discount price'
            });
          }
          
          if (parsedDiscountPrice >= basePriceValue) {
            return res.status(400).json({
              success: false,
              message: 'Discount price must be less than base price'
            });
          }
          updateData.discountPrice = parsedDiscountPrice;
        }
      }

      // Update food item - use save() instead of findByIdAndUpdate to ensure model validation sees updated values
      Object.assign(food, updateData);
      const updatedFood = await food.save();
      await updatedFood.populate('category vendor');

      res.json({
        success: true,
        message: 'Food item updated successfully',
        data: updatedFood
      });
    } catch (error) {
      console.error('Error updating food item:', error);

      if (error.name === 'CastError') {
        // Provide more specific error message based on which field caused the CastError
        const field = error.path || 'ID';
        return res.status(400).json({
          success: false,
          message: `Invalid ${field} format`,
          error: error.message
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
        message: 'Error updating food item',
        error: error.message
      });
    }
  }

  /**
   * Delete a food item (soft delete by setting isActive to false)
   * DELETE /api/foods/:id
   * Accessible by admins, super admins, and vendors (vendors can only delete their own)
   */
  async deleteFood(req, res) {
    try {
      const food = await Food.findById(req.params.id);
      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      // Check vendor access: vendors can only delete their own foods
      if (req.user.role === 'vendor') {
        let vendorId = null;
        
        // Get vendor ID from token or lookup by email
        if (req.user.vendorId) {
          vendorId = req.user.vendorId.toString();
        } else if (req.user.email) {
          const vendorByEmail = await Vendor.findOne({ email: req.user.email });
          if (!vendorByEmail) {
            return res.status(403).json({
              success: false,
              message: 'Vendor profile not found'
            });
          }
          vendorId = vendorByEmail._id.toString();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Unable to identify vendor'
          });
        }

        // Check if food belongs to this vendor
        if (food.vendor.toString() !== vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only delete your own food items'
          });
        }
      }

      // Soft delete: Set isActive to false
      food.isActive = false;
      await food.save();

      res.json({
        success: true,
        message: 'Food item deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting food item:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food item ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting food item',
        error: error.message
      });
    }
  }

  /**
   * Update food active status (on/off)
   * PATCH /api/foods/:id/active
   * Accessible by admins, super admins, and vendors (vendors can only update their own)
   */
  async updateFoodStatus(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid food item ID'
        });
      }

      const food = await Food.findById(id);
      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      // Vendors can only update their own foods
      if (req.user.role === 'vendor') {
        let vendorId = null;

        if (req.user.vendorId) {
          vendorId = req.user.vendorId.toString();
        } else if (req.user.email) {
          const vendorByEmail = await Vendor.findOne({ email: req.user.email });
          if (!vendorByEmail) {
            return res.status(403).json({
              success: false,
              message: 'Vendor profile not found'
            });
          }
          vendorId = vendorByEmail._id.toString();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Unable to identify vendor'
          });
        }

        if (food.vendor.toString() !== vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own food items'
          });
        }
      }

      let newIsActive;
      const { status, isActive } = req.body;

      if (typeof isActive === 'boolean') {
        newIsActive = isActive;
      } else if (typeof status === 'string') {
        if (status.toLowerCase() === 'off') {
          newIsActive = false;
        } else if (status.toLowerCase() === 'on') {
          newIsActive = true;
        }
      }

      if (typeof newIsActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Please provide either "isActive" (boolean) or "status" as "on"/"off"'
        });
      }

      food.isActive = newIsActive;
      await food.save();

      return res.json({
        success: true,
        message: newIsActive ? 'Food item turned on successfully' : 'Food item turned off successfully',
        data: {
          id: food._id,
          isActive: food.isActive
        }
      });
    } catch (error) {
      console.error('Error updating food status:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food item ID'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error updating food status',
        error: error.message
      });
    }
  }

  /**
   * Hard delete a food item (permanently remove from database)
   * DELETE /api/foods/:id/hard
   * Only accessible by super admins
   * WARNING: This permanently deletes the food item
   */
  async hardDeleteFood(req, res) {
    try {
      const food = await Food.findById(req.params.id);

      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      // Delete image from ImageKit if it exists
      if (food.imageKitFileId) {
        try {
          await deleteFile(food.imageKitFileId);
        } catch (deleteError) {
          console.error('Error deleting image from ImageKit:', deleteError);
          // Continue with database deletion even if ImageKit deletion fails
        }
      }

      // Delete add-on images from ImageKit if any
      if (food.addOns && food.addOns.length > 0) {
        for (const addOn of food.addOns) {
          if (addOn.imageKitFileId) {
            try {
              await deleteFile(addOn.imageKitFileId);
            } catch (deleteError) {
              console.error('Error deleting add-on image from ImageKit:', deleteError);
            }
          }
        }
      }

      // Delete from database
      await Food.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Food item permanently deleted'
      });
    } catch (error) {
      console.error('Error hard deleting food item:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food item ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting food item',
        error: error.message
      });
    }
  }

  /**
   * Add a day offer to a food item
   * POST /api/foods/:id/day-offers
   * Accessible by admins, super admins, and vendors (vendors can only add to their own foods)
   */
  async addDayOffer(req, res) {
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

      // Find food item
      const food = await Food.findById(req.params.id);
      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      // Check vendor access: vendors can only add offers to their own foods
      if (req.user && req.user.role === 'vendor') {
        let vendorId = null;
        
        // Get vendor ID from token or lookup by email
        if (req.user.vendorId) {
          vendorId = req.user.vendorId.toString();
        } else if (req.user.email) {
          const vendorByEmail = await Vendor.findOne({ email: req.user.email });
          if (!vendorByEmail) {
            return res.status(403).json({
              success: false,
              message: 'Vendor profile not found'
            });
          }
          vendorId = vendorByEmail._id.toString();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Unable to identify vendor'
          });
        }

        // Check if food belongs to this vendor
        if (food.vendor.toString() !== vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only add offers to your own food items'
          });
        }
      }

      // Parse day offer data
      const dayOfferData = {
        discountType: req.body.discountType,
        discountValue: parseFloat(req.body.discountValue),
        activeDays: Array.isArray(req.body.activeDays) 
          ? req.body.activeDays 
          : JSON.parse(req.body.activeDays || '[]'),
        startTime: req.body.startTime.trim(),
        endTime: req.body.endTime.trim(),
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
      };

      // Sort activeDays array for consistent comparison
      dayOfferData.activeDays = dayOfferData.activeDays.sort();

      // Validate discount value based on type
      if (dayOfferData.discountType === 'percentage' && 
          (dayOfferData.discountValue < 0 || dayOfferData.discountValue > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Percentage discount must be between 0 and 100'
        });
      }

      if (dayOfferData.discountType === 'fixed' && dayOfferData.discountValue <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Fixed discount must be greater than 0'
        });
      }

      // Initialize dayOffers array if it doesn't exist
      if (!food.dayOffers) {
        food.dayOffers = [];
      }

      // Check for duplicate day offer
      // A duplicate is one with same discountType, discountValue, activeDays, startTime, and endTime
      const duplicateOffer = food.dayOffers.find(offer => {
        // Normalize times for comparison (remove spaces and convert to lowercase)
        const normalizedExistingStartTime = offer.startTime?.trim().toLowerCase();
        const normalizedExistingEndTime = offer.endTime?.trim().toLowerCase();
        const normalizedNewStartTime = dayOfferData.startTime.toLowerCase();
        const normalizedNewEndTime = dayOfferData.endTime.toLowerCase();

        // Sort active days for comparison
        const existingActiveDays = Array.isArray(offer.activeDays) 
          ? [...offer.activeDays].sort() 
          : [];
        
        // Compare all relevant fields
        return (
          offer.discountType === dayOfferData.discountType &&
          offer.discountValue === dayOfferData.discountValue &&
          JSON.stringify(existingActiveDays) === JSON.stringify(dayOfferData.activeDays) &&
          normalizedExistingStartTime === normalizedNewStartTime &&
          normalizedExistingEndTime === normalizedNewEndTime
        );
      });

      if (duplicateOffer) {
        return res.status(409).json({
          success: false,
          message: 'A day offer with the same configuration already exists for this food item',
          duplicateOffer: {
            id: duplicateOffer._id,
            discountType: duplicateOffer.discountType,
            discountValue: duplicateOffer.discountValue,
            activeDays: duplicateOffer.activeDays,
            startTime: duplicateOffer.startTime,
            endTime: duplicateOffer.endTime
          }
        });
      }
      
      // Add day offer to food
      food.dayOffers.push(dayOfferData);
      await food.save();

      // Populate references
      await food.populate('category vendor');

      res.status(201).json({
        success: true,
        message: 'Day offer added successfully',
        data: food
      });
    } catch (error) {
      console.error('Error adding day offer:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food item ID'
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
        message: 'Error adding day offer',
        error: error.message
      });
    }
  }

  /**
   * Remove a day offer from a food item
   * DELETE /api/foods/:id/day-offers/:offerId
   * Accessible by admins, super admins, and vendors (vendors can only remove from their own foods)
   */
  async removeDayOffer(req, res) {
    try {
      // Find food item
      const food = await Food.findById(req.params.id);
      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      // Check vendor access: vendors can only remove offers from their own foods
      if (req.user && req.user.role === 'vendor') {
        let vendorId = null;
        
        // Get vendor ID from token or lookup by email
        if (req.user.vendorId) {
          vendorId = req.user.vendorId.toString();
        } else if (req.user.email) {
          const vendorByEmail = await Vendor.findOne({ email: req.user.email });
          if (!vendorByEmail) {
            return res.status(403).json({
              success: false,
              message: 'Vendor profile not found'
            });
          }
          vendorId = vendorByEmail._id.toString();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Unable to identify vendor'
          });
        }

        // Check if food belongs to this vendor
        if (food.vendor.toString() !== vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only remove offers from your own food items'
          });
        }
      }

      const offerId = req.params.offerId;

      // Check if day offers array exists and has items
      if (!food.dayOffers || food.dayOffers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No day offers found for this food item'
        });
      }

      // Find and remove the offer
      const offerIndex = food.dayOffers.findIndex(
        offer => offer._id.toString() === offerId
      );

      if (offerIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Day offer not found'
        });
      }

      food.dayOffers.splice(offerIndex, 1);
      await food.save();

      // Populate references
      await food.populate('category vendor');

      res.json({
        success: true,
        message: 'Day offer removed successfully',
        data: food
      });
    } catch (error) {
      console.error('Error removing day offer:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid food item ID or offer ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error removing day offer',
        error: error.message
      });
    }
  }

  /**
   * Search foods by vendor
   * GET /api/foods/search
   * Requires vendor ID (from token or query parameter)
   * Returns only foods for that vendor with: food name, picture, food id
   */
  async searchFoodsByVendor(req, res) {
    try {
      const { search, page = 1, limit = 10 } = req.query;

      // Get vendor ID from token or query parameter
      let vendorId = req.query.vendor;

      // If token is provided, extract vendor ID from it
      if (req.user && req.user.role === 'vendor') {
        if (req.user.vendorId) {
          vendorId = req.user.vendorId.toString();
        } else if (req.user.email) {
          const vendorByEmail = await Vendor.findOne({ email: req.user.email });
          if (!vendorByEmail) {
            return res.status(403).json({
              success: false,
              message: 'Vendor profile not found'
            });
          }
          vendorId = vendorByEmail._id.toString();
        } else if (req.user.id) {
          // Try to find vendor by ID (if vendor ID is same as user ID)
          const vendorById = await Vendor.findById(req.user.id);
          if (vendorById) {
            vendorId = vendorById._id.toString();
          }
        }
      }

      // If still no vendor ID, check if admin/super_admin provided one
      if (!vendorId && req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
        vendorId = req.query.vendor;
      }

      // Vendor ID is required
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required. Provide it as a query parameter or authenticate with a vendor token.'
        });
      }

      // Validate vendor exists
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Build filter - only this vendor's foods
      const filter = {
        vendor: vendorId,
        isActive: true
      };

      // Add search filter if provided
      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { foodName: { $regex: escapedSearch, $options: 'i' } },
          { description: { $regex: escapedSearch, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Execute query - only return food name, picture, and id
      const [foods, totalCount] = await Promise.all([
        Food.find(filter)
          .select('foodName foodImage _id')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Food.countDocuments(filter)
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.json({
        success: true,
        message: 'Foods retrieved successfully',
        data: foods.map(food => ({
          foodId: food._id,
          foodName: food.foodName,
          picture: food.foodImage
        })),
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
      console.error('Error searching foods by vendor:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error searching foods',
        error: error.message
      });
    }
  }
}

module.exports = new FoodController();

