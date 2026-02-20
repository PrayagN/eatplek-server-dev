const Vendor = require('../models/Vendor');
const Food = require('../models/Food');
const Banner = require('../models/Banner');
const Cart = require('../models/Cart');
const { calculateFoodPricing } = require('../utils/offerPricing');
const FoodCategory = require('../models/FoodCategory');
const { validationResult } = require('express-validator');
const { uploadFile, deleteFile } = require('../utils/imagekit');
const { SERVICE_TYPES, normalizeServiceType } = require('../utils/serviceType');
const { ensureSlugAndLink } = require('../utils/shareLink');

const extractPhoneParts = (phoneNumber) => {
  if (!phoneNumber) {
    return { dialCode: null, phone: null };
  }

  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length < 10) {
    return { dialCode: null, phone: digits || null };
  }

  const phone = digits.slice(-10);
  const dialCode = digits.slice(0, digits.length - 10) || null;

  return {
    dialCode,
    phone
  };
};

const ADMIN_ROLES = ['admin', 'super_admin'];

const hasVendorManagementAccess = (user, vendorId) => {
  if (!user) {
    return false;
  }

  if (ADMIN_ROLES.includes(user.role)) {
    return true;
  }

  if (user.role === 'vendor') {
    const userVendorId = user.vendorId || user.id;
    if (!userVendorId) {
      return false;
    }
    return userVendorId.toString() === vendorId.toString();
  }

  return false;
};

const resolveTargetVendorId = (req) => {
  if (req.user?.role === 'vendor') {
    return req.user.vendorId || req.user.id || null;
  }
  return req.params.id || null;
};

/**
 * Vendor Controller
 * Handles all vendor-related operations
 */
class VendorController {
  /**
   * Create a new vendor
   * POST /api/vendors
   * Only accessible by admins
   */
  async createVendor(req, res) {
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

      // Check if vendor with email already exists
      const existingVendor = await Vendor.findOne({
        $or: [
          { email: req.body.email },
          { phoneNumber: req.body.phoneNumber },
          { fssaiLicenseNumber: req.body.fssaiLicenseNumber },
          { gstNumber: req.body.gstNumber }
        ]
      });

      if (existingVendor) {
        let duplicateField = '';
        if (existingVendor.email === req.body.email) duplicateField = 'Email';
        else if (existingVendor.phoneNumber === req.body.phoneNumber) duplicateField = 'Phone number';
        else if (existingVendor.fssaiLicenseNumber === req.body.fssaiLicenseNumber) duplicateField = 'FSSAI license number';
        else if (existingVendor.gstNumber === req.body.gstNumber) duplicateField = 'GST number';

        return res.status(409).json({
          success: false,
          message: `${duplicateField} already exists in the system`
        });
      }

      // Handle image uploads to ImageKit
      const vendorData = { ...req.body };

      // Determine creator role to auto-approve when created by admin/super admin
      const userRole = req.user?.role;
      const isCreatedByAdmin = userRole === 'admin' || userRole === 'super_admin';

      if (isCreatedByAdmin) {
        vendorData.isVerified = true;
        vendorData.verificationStatus = 'Approved';
        vendorData.approvedAt = new Date();
      } else {
        vendorData.isVerified = false;
        vendorData.verificationStatus = 'Pending';
        vendorData.approvedAt = null;
      }

      const { dialCode, phone } = extractPhoneParts(vendorData.phoneNumber);
      vendorData.dialCode = dialCode;
      vendorData.phone = phone;
      
      // Upload profile image if provided
      if (req.files && req.files.profileImage && req.files.profileImage[0]) {
        try {
          const profileFile = req.files.profileImage[0];
          const uploadResult = await uploadFile(
            profileFile.buffer,
            profileFile.originalname,
            'vendors/profile',
            { width: 512, height: 512 }
          );
          vendorData.profileImage = uploadResult.url;
          vendorData.profileImageKitFileId = uploadResult.fileId;
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload profile image',
            error: uploadError.message
          });
        }
      }

      // Upload restaurant image if provided
      if (req.files && req.files.restaurantImage && req.files.restaurantImage[0]) {
        try {
          const restaurantFile = req.files.restaurantImage[0];
          const uploadResult = await uploadFile(
            restaurantFile.buffer,
            restaurantFile.originalname,
            'vendors/restaurant',
            { width: 820, height: 360 }
          );
          vendorData.restaurantImage = uploadResult.url;
          vendorData.restaurantImageKitFileId = uploadResult.fileId;
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload restaurant image',
            error: uploadError.message
          });
        }
      }

      // Create new vendor
      const vendor = new Vendor(vendorData);
      await vendor.save();

      // Remove sensitive data from response
      const vendorResponse = vendor.toObject();

      res.status(201).json({
        success: true,
        message: 'Vendor created successfully',
        data: vendorResponse
      });
    } catch (error) {
      console.error('Error creating vendor:', error);
      
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
        message: 'Error creating vendor',
        error: error.message
      });
    }
  }

  /**
   * Get all vendors with filtering and pagination
   * GET /api/vendors
   */
  async getAllVendors(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        isActive,
        isVerified,
        verificationStatus,
        city,
        state,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};
      
      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }
      
      if (isVerified !== undefined) {
        filter.isVerified = isVerified === 'true';
      }
      
      if (verificationStatus) {
        filter.verificationStatus = verificationStatus;
      }
      
      if (city) {
        filter['address.city'] = { $regex: city, $options: 'i' };
      }
      
      if (state) {
        filter['address.state'] = { $regex: state, $options: 'i' };
      }
      
      if (search) {
        // Escape special regex characters for security
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Google-like search across multiple fields
        filter.$or = [
          { restaurantName: { $regex: escapedSearch, $options: 'i' } },
          { ownerName: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { phoneNumber: { $regex: escapedSearch, $options: 'i' } },
          { fssaiLicenseNumber: { $regex: escapedSearch, $options: 'i' } },
          { gstNumber: { $regex: escapedSearch, $options: 'i' } },
          { 'address.fullAddress': { $regex: escapedSearch, $options: 'i' } },
          { 'address.city': { $regex: escapedSearch, $options: 'i' } },
          { 'address.state': { $regex: escapedSearch, $options: 'i' } },
          { 'address.pincode': { $regex: escapedSearch, $options: 'i' } }
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
      const [vendors, totalCount] = await Promise.all([
        Vendor.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Vendor.countDocuments(filter)
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.json({
        success: true,
        message: 'Vendors retrieved successfully',
        data: vendors,
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
      console.error('Error getting vendors:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving vendors',
        error: error.message
      });
    }
  }

  /**
   * Get a single vendor by ID
   * GET /api/vendors/:id
   */
  async getVendorById(req, res) {
    try {
      const vendor = await Vendor.findById(req.params.id);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.json({
        success: true,
        message: 'Vendor retrieved successfully',
        data: vendor
      });
    } catch (error) {
      console.error('Error getting vendor:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error retrieving vendor',
        error: error.message
      });
    }
  }

  /**
   * Update a vendor
   * PUT /api/vendors/:id
   */
  async updateVendor(req, res) {
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

      // Find vendor
      const vendor = await Vendor.findById(req.params.id);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Check for duplicate email, phone, etc. (excluding current vendor)
      if (req.body.email || req.body.phoneNumber || req.body.fssaiLicenseNumber || req.body.gstNumber) {
        const duplicateVendor = await Vendor.findOne({
          _id: { $ne: req.params.id },
          $or: [
            { email: req.body.email },
            { phoneNumber: req.body.phoneNumber },
            { fssaiLicenseNumber: req.body.fssaiLicenseNumber },
            { gstNumber: req.body.gstNumber }
          ]
        });

        if (duplicateVendor) {
          let duplicateField = '';
          if (duplicateVendor.email === req.body.email) duplicateField = 'Email';
          else if (duplicateVendor.phoneNumber === req.body.phoneNumber) duplicateField = 'Phone number';
          else if (duplicateVendor.fssaiLicenseNumber === req.body.fssaiLicenseNumber) duplicateField = 'FSSAI license number';
          else if (duplicateVendor.gstNumber === req.body.gstNumber) duplicateField = 'GST number';

          return res.status(409).json({
            success: false,
            message: `${duplicateField} already exists in the system`
          });
        }
      }

      // Handle image uploads to ImageKit
      const updateData = { ...req.body };

      if (updateData.phoneNumber) {
        const { dialCode, phone } = extractPhoneParts(updateData.phoneNumber);
        updateData.dialCode = dialCode;
        updateData.phone = phone;
      }

      // Upload profile image if provided
      if (req.files && req.files.profileImage && req.files.profileImage[0]) {
        try {
          // Delete old profile image from ImageKit if it exists
          if (vendor.profileImageKitFileId) {
            try {
              await deleteFile(vendor.profileImageKitFileId);
            } catch (deleteError) {
              console.error('Error deleting old profile image from ImageKit:', deleteError);
              // Continue even if deletion fails
            }
          }

          const profileFile = req.files.profileImage[0];
          const uploadResult = await uploadFile(
            profileFile.buffer,
            profileFile.originalname,
            'vendors/profile',
            { width: 512, height: 512 }
          );
          updateData.profileImage = uploadResult.url;
          updateData.profileImageKitFileId = uploadResult.fileId;
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload profile image',
            error: uploadError.message
          });
        }
      }

      // Upload restaurant image if provided
      if (req.files && req.files.restaurantImage && req.files.restaurantImage[0]) {
        try {
          // Delete old restaurant image from ImageKit if it exists
          if (vendor.restaurantImageKitFileId) {
            try {
              await deleteFile(vendor.restaurantImageKitFileId);
            } catch (deleteError) {
              console.error('Error deleting old restaurant image from ImageKit:', deleteError);
              // Continue even if deletion fails
            }
          }

          const restaurantFile = req.files.restaurantImage[0];
          const uploadResult = await uploadFile(
            restaurantFile.buffer,
            restaurantFile.originalname,
            'vendors/restaurant',
            { width: 820, height: 360 }
          );
          updateData.restaurantImage = uploadResult.url;
          updateData.restaurantImageKitFileId = uploadResult.fileId;
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload restaurant image',
            error: uploadError.message
          });
        }
      }

      // Update vendor
      const updatedVendor = await Vendor.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Vendor updated successfully',
        data: updatedVendor
      });
    } catch (error) {
      console.error('Error updating vendor:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
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
        message: 'Error updating vendor',
        error: error.message
      });
    }
  }

  /**
   * Update vendor operating hours (Vendor/Admin)
   * PATCH /api/vendors/:id/operating-hours
   */
  async updateOperatingHours(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const targetVendorId = resolveTargetVendorId(req);
      if (!targetVendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required'
        });
      }

      const vendor = await Vendor.findById(targetVendorId);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      if (!hasVendorManagementAccess(req.user, vendor._id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this vendor'
        });
      }

      vendor.operatingHours = req.body.operatingHours;
      vendor.markModified('operatingHours');
      await vendor.save();

      return res.json({
        success: true,
        message: 'Operating hours updated successfully',
        data: {
          id: vendor._id,
          operatingHours: vendor.operatingHours
        }
      });
    } catch (error) {
      console.error('Error updating vendor operating hours:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error updating operating hours',
        error: error.message
      });
    }
  }

  /**
   * Update vendor bank accounts (Vendor/Admin)
   * PATCH /api/vendors/:id/bank-accounts
   */
  async updateBankAccounts(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const targetVendorId = resolveTargetVendorId(req);
      if (!targetVendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required'
        });
      }

      const vendor = await Vendor.findById(targetVendorId);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      if (!hasVendorManagementAccess(req.user, vendor._id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this vendor'
        });
      }

      const bankAccounts = req.body.bankAccounts || [];
      if (bankAccounts.length > 0 && !bankAccounts.some(account => account.accountType === 'Primary')) {
        return res.status(400).json({
          success: false,
          message: 'At least one primary bank account is required'
        });
      }

      vendor.bankAccounts = bankAccounts;
      vendor.markModified('bankAccounts');
      await vendor.save();

      return res.json({
        success: true,
        message: 'Bank accounts updated successfully',
        data: {
          id: vendor._id,
          bankAccounts: vendor.bankAccounts
        }
      });
    } catch (error) {
      console.error('Error updating vendor bank accounts:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error updating bank accounts',
        error: error.message
      });
    }
  }

  /**
   * Update vendor basic details (Vendor/Admin)
   * PATCH /api/vendors/:id/details
   */
  async updateVendorDetails(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const targetVendorId = resolveTargetVendorId(req);
      if (!targetVendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required'
        });
      }

      const vendor = await Vendor.findById(targetVendorId);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      if (!hasVendorManagementAccess(req.user, vendor._id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this vendor'
        });
      }

      const { restaurantName, serviceOffered, address } = req.body;

      vendor.restaurantName = restaurantName;
      vendor.serviceOffered = serviceOffered;
      vendor.address = address;
      vendor.markModified('address');

      await vendor.save();

      return res.json({
        success: true,
        message: 'Vendor details updated successfully',
        data: {
          id: vendor._id,
          restaurantName: vendor.restaurantName,
          serviceOffered: vendor.serviceOffered,
          address: vendor.address
        }
      });
    } catch (error) {
      console.error('Error updating vendor details:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error updating vendor details',
        error: error.message
      });
    }
  }

  /**
   * Block/Unblock a vendor
   * PATCH /api/vendors/:id/block
   */
  async blockVendor(req, res) {
    try {
      const vendor = await Vendor.findById(req.params.id);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Toggle isActive status
      vendor.isActive = !vendor.isActive;
      await vendor.save();

      res.json({
        success: true,
        message: vendor.isActive ? 'Vendor unblocked successfully' : 'Vendor blocked successfully',
        data: {
          id: vendor._id,
          isActive: vendor.isActive
        }
      });
    } catch (error) {
      console.error('Error blocking vendor:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error blocking vendor',
        error: error.message
      });
    }
  }

  /**
   * Delete a vendor (soft delete by setting isActive to false)
   * DELETE /api/vendors/:id
   */
  async deleteVendor(req, res) {
    try {
      const vendor = await Vendor.findById(req.params.id);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Soft delete: Set isActive to false
      vendor.isActive = false;
      await vendor.save();

      res.json({
        success: true,
        message: 'Vendor deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting vendor:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting vendor',
        error: error.message
      });
    }
  }

  /**
   * Hard delete a vendor (permanently remove from database)
   * DELETE /api/vendors/:id/hard
   * WARNING: This permanently deletes the vendor
   */
  async hardDeleteVendor(req, res) {
    try {
      const vendor = await Vendor.findById(req.params.id);
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Delete images from ImageKit if they exist
      if (vendor.profileImageKitFileId) {
        try {
          await deleteFile(vendor.profileImageKitFileId);
        } catch (deleteError) {
          console.error('Error deleting profile image from ImageKit:', deleteError);
          // Continue even if deletion fails
        }
      }

      if (vendor.restaurantImageKitFileId) {
        try {
          await deleteFile(vendor.restaurantImageKitFileId);
        } catch (deleteError) {
          console.error('Error deleting restaurant image from ImageKit:', deleteError);
          // Continue even if deletion fails
        }
      }

      // Delete from database
      await Vendor.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Vendor permanently deleted'
      });
    } catch (error) {
      console.error('Error hard deleting vendor:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting vendor',
        error: error.message
      });
    }
  }

  /**
   * Search vendors by name
   * GET /api/vendors/search
   * Returns vendor name, location, and profile image
   */
  async searchVendors(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      // Escape special regex characters for security
      const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Search vendors by restaurant name
      const vendors = await Vendor.find({
        restaurantName: { $regex: escapedQuery, $options: 'i' },
        isActive: true
      })
      .select('_id restaurantName profileImage address.fullAddress address.city address.state address.pincode')
      .limit(20)
      .lean();

      // Format response
      const results = vendors.map(vendor => ({
        id: vendor._id,
        restaurantName: vendor.restaurantName,
        location: `${vendor.address.fullAddress}, ${vendor.address.city}, ${vendor.address.state} - ${vendor.address.pincode}`,
        profileImage: vendor.profileImage
      }));

      res.json({
        success: true,
        message: 'Vendors retrieved successfully',
        data: results
      });
    } catch (error) {
      console.error('Error searching vendors:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching vendors',
        error: error.message
      });
    }
  }

  /**
   * Add a branch to a vendor
   * POST /api/vendors/branches?vendor1Id=xxx&vendor2Id=xxx
   * Accepts two vendor IDs as query parameters
   * Creates bidirectional connection - both vendors add each other to branches
   */
  async addBranch(req, res) {
    try {
      const { vendor1Id, vendor2Id } = req.query;

      // Validate both IDs are provided
      if (!vendor1Id || !vendor2Id) {
        return res.status(400).json({
          success: false,
          message: 'Both vendor1Id and vendor2Id are required'
        });
      }

      // Validate that both are valid ObjectIds
      if (!vendor1Id.match(/^[0-9a-fA-F]{24}$/) || !vendor2Id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID format'
        });
      }

      // Check if trying to connect vendor to itself
      if (vendor1Id === vendor2Id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot connect a vendor to itself'
        });
      }

      // Find both vendors
      const [vendor1, vendor2] = await Promise.all([
        Vendor.findById(vendor1Id),
        Vendor.findById(vendor2Id)
      ]);

      if (!vendor1) {
        return res.status(404).json({
          success: false,
          message: 'Vendor 1 not found'
        });
      }

      if (!vendor2) {
        return res.status(404).json({
          success: false,
          message: 'Vendor 2 not found'
        });
      }

      // Check if connection already exists in vendor1's branches
      const existsInVendor1 = vendor1.branches.some(
        branch => branch.toString() === vendor2Id
      );

      if (existsInVendor1) {
        return res.status(409).json({
          success: false,
          message: 'Branch connection already exists'
        });
      }

      // Check if connection already exists in vendor2's branches
      const existsInVendor2 = vendor2.branches.some(
        branch => branch.toString() === vendor1Id
      );

      if (existsInVendor2) {
        return res.status(409).json({
          success: false,
          message: 'Branch connection already exists'
        });
      }

      // Create bidirectional connection
      // Add vendor2Id to vendor1's branches
      vendor1.branches.push(vendor2Id);
      await vendor1.save();

      // Add vendor1Id to vendor2's branches
      vendor2.branches.push(vendor1Id);
      await vendor2.save();

      res.status(200).json({
        success: true,
        message: 'Branch connection created successfully (bidirectional)',
        data: {
          vendor1: {
            id: vendor1._id,
            name: vendor1.restaurantName,
            totalBranches: vendor1.branches.length
          },
          vendor2: {
            id: vendor2._id,
            name: vendor2.restaurantName,
            totalBranches: vendor2.branches.length
          }
        }
      });
    } catch (error) {
      console.error('Error adding branch:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error adding branch',
        error: error.message
      });
    }
  }

  /**
   * Remove a branch from a vendor
   * DELETE /api/vendors/branches?vendor1Id=xxx&vendor2Id=xxx
   * Accepts two vendor IDs as query parameters
   * Removes bidirectional connection - both vendors remove each other from branches
   */
  async removeBranch(req, res) {
    try {
      const { vendor1Id, vendor2Id } = req.query;

      // Validate both IDs are provided
      if (!vendor1Id || !vendor2Id) {
        return res.status(400).json({
          success: false,
          message: 'Both vendor1Id and vendor2Id are required'
        });
      }

      // Validate that both are valid ObjectIds
      if (!vendor1Id.match(/^[0-9a-fA-F]{24}$/) || !vendor2Id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID format'
        });
      }

      // Find both vendors
      const [vendor1, vendor2] = await Promise.all([
        Vendor.findById(vendor1Id),
        Vendor.findById(vendor2Id)
      ]);

      if (!vendor1) {
        return res.status(404).json({
          success: false,
          message: 'Vendor 1 not found'
        });
      }

      if (!vendor2) {
        return res.status(404).json({
          success: false,
          message: 'Vendor 2 not found'
        });
      }

      // Check if connection exists in vendor1's branches
      const vendor2IndexInVendor1 = vendor1.branches.findIndex(
        branch => branch.toString() === vendor2Id
      );

      if (vendor2IndexInVendor1 === -1) {
        return res.status(404).json({
          success: false,
          message: 'Branch connection not found'
        });
      }

      // Remove bidirectional connection
      // Remove vendor2Id from vendor1's branches
      vendor1.branches.splice(vendor2IndexInVendor1, 1);
      await vendor1.save();

      // Remove vendor1Id from vendor2's branches
      const vendor1IndexInVendor2 = vendor2.branches.findIndex(
        branch => branch.toString() === vendor1Id
      );

      if (vendor1IndexInVendor2 !== -1) {
        vendor2.branches.splice(vendor1IndexInVendor2, 1);
        await vendor2.save();
      }

      res.json({
        success: true,
        message: 'Branch connection removed successfully (bidirectional)',
        data: {
          vendor1: {
            id: vendor1._id,
            name: vendor1.restaurantName,
            totalBranches: vendor1.branches.length
          },
          vendor2: {
            id: vendor2._id,
            name: vendor2.restaurantName,
            totalBranches: vendor2.branches.length
          }
        }
      });
    } catch (error) {
      console.error('Error removing branch:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error removing branch',
        error: error.message
      });
    }
  }

  /**
   * Get all branches of a vendor
   * GET /api/vendors/:id/branches
   * Returns all branch vendors with their details
   */
  async getBranches(req, res) {
    try {
      const { id } = req.params;

      // Find vendor and populate branches
      const vendor = await Vendor.findById(id)
        .populate({
          path: 'branches',
          select: 'restaurantName profileImage address averageRating reviewCount isActive'
        });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.json({
        success: true,
        message: 'Branches retrieved successfully',
        data: {
          vendorId: vendor._id,
          restaurantName: vendor.restaurantName,
          totalBranches: vendor.branches.length,
          branches: vendor.branches
        }
      });
    } catch (error) {
      console.error('Error getting branches:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error retrieving branches',
        error: error.message
      });
    }
  }

  /**
   * Get vendor foods grouped by category for details page
   * GET /api/vendors/:id/foods
   * Returns foods grouped by category, excluding prebook foods
   */
  async getVendorFoodsByCategory(req, res) {
    try {
      const { id } = req.params;
      const { service } = req.query; // service type: "dine-in", "delivery", "takeaway", "car-dine-in"

      // Validate vendor exists
      const vendor = await Vendor.findById(id);
      if (!vendor) {
        return res.status(404).json({
          status: false,
          message: 'Vendor not found'
        });
      }

      // Build food filter
      const foodFilter = {
        vendor: id,
        isActive: true,
        isPrebook: false // Exclude prebook foods
      };

      let normalizedService = null;

      // Add service type filter if provided
      if (service) {
        const { getServiceTypeVariations } = require('../utils/serviceType');
        normalizedService = normalizeServiceType(service);
        
        if (!normalizedService) {
          return res.status(400).json({
            status: false,
            message: `Invalid service type. Must be one of: ${SERVICE_TYPES.join(', ')}`
          });
        }

        // Get all possible variations (old and new formats) for database query
        // This handles foods that might still have old format in their orderTypes
        const serviceVariations = getServiceTypeVariations(service);
        foodFilter.orderTypes = { $in: serviceVariations };
      }

      // Get current date/time for offer calculation
      // Allow dateTime query parameter for testing/debugging
      const currentDate = req.query.dateTime ? new Date(req.query.dateTime) : new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = days[currentDate.getDay()];
      const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

      // Fetch foods with categories and vendor banners concurrently
      const [foods, vendorBanners] = await Promise.all([
        Food.find(foodFilter)
          .populate('category', 'categoryName')
          .sort({ category: 1, createdAt: -1 })
          .lean(),
        Banner.find({
          hotel: id,
          isActive: true,
          endDate: { $gte: currentDate }
        })
          .select('bannerImage')
          .lean()
      ]);

      // Fetch cart data if user is authenticated
      // Note: We don't filter by serviceType because we want to show cart counts
      // for the same food items regardless of which service type the user is viewing
      let cartData = null;
      
      if (req.user && req.user.id) {
        try {
          // Build cart query - fetch cart for user and vendor regardless of service type
          // Mongoose will automatically convert string IDs to ObjectId
          const cartQuery = {
            user: req.user.id,
            vendor: id,
            isPrebookCart: false
          };
          
          cartData = await Cart.findOne(cartQuery).lean();
        } catch (cartError) {
          console.error('Error fetching cart data:', cartError);
          // Continue without cart data if there's an error
        }
      }

      // Build cart count maps
      const foodCartCountMap = new Map(); // foodId -> total quantity
      const customizationCartCountMap = new Map(); // `${foodId}_${customizationId}` -> total quantity
      const addOnCartCountMap = new Map(); // `${foodId}_${addOnId}` -> total quantity

      if (cartData && cartData.items && cartData.items.length > 0) {
        cartData.items.forEach((cartItem, index) => {
          // Handle both 'food' (ObjectId) and 'foodId' (transformed) fields
          // When using .lean(), the food field is an ObjectId, so we need to convert it to string
          let foodId = null;
          
          if (cartItem.foodId) {
            foodId = cartItem.foodId.toString();
          } else if (cartItem.food) {
            // food is an ObjectId when using .lean()
            foodId = cartItem.food.toString();
          }
          
          if (foodId) {
            // Normalize foodId to string for consistent comparison
            const normalizedFoodId = foodId.toString();
            
            // Sum up food quantities
            const currentFoodCount = foodCartCountMap.get(normalizedFoodId) || 0;
            const newCount = currentFoodCount + (cartItem.quantity || 0);
            foodCartCountMap.set(normalizedFoodId, newCount);

            // Sum up customization quantities
            if (cartItem.customizations && cartItem.customizations.length > 0) {
              cartItem.customizations.forEach(customization => {
                const customizationId = customization.customizationId?.toString() || customization.customizationId;
                if (customizationId) {
                  const key = `${normalizedFoodId}_${customizationId}`;
                  const currentCount = customizationCartCountMap.get(key) || 0;
                  customizationCartCountMap.set(key, currentCount + (customization.quantity || 0));
                }
              });
            }

            // Sum up addOn quantities
            if (cartItem.addOns && cartItem.addOns.length > 0) {
              cartItem.addOns.forEach(addOn => {
                const addOnId = addOn.addOnId?.toString() || addOn.addOnId;
                if (addOnId) {
                  const key = `${normalizedFoodId}_${addOnId}`;
                  const currentCount = addOnCartCountMap.get(key) || 0;
                  addOnCartCountMap.set(key, currentCount + (addOn.quantity || 0));
                }
              });
            }
          }
        });
      }

      // Process foods and calculate offer prices, then group by category
      const categoryMap = new Map();

      for (const food of foods) {
        if (!food.shareLink) {
          try {
            const doc = await Food.findById(food._id);
            if (doc) {
              const updated = await ensureSlugAndLink(doc);
              if (updated) {
                await doc.save({ validateBeforeSave: false });
                food.shareLink = doc.shareLink;
              }
            }
          } catch (shareError) {
            console.warn('Unable to ensure share link for food', food._id?.toString(), shareError.message);
          }
        }
        // Get category name
        const categoryName = food.category?.categoryName || 'Uncategorized';
        
        // Initialize category array if not exists
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, []);
        }

        const pricing = calculateFoodPricing(food, { currentDay, currentMinutes });

        const foodId = food._id.toString();
        
        // Get cart count for this food - ensure we're using string comparison
        const foodCartCount = foodCartCountMap.get(foodId) || 0;

        // Build food object with all price information
        const customizations = (food.customizations || []).map(customization => {
          const customizationId = customization._id?.toString();
          const key = `${foodId}_${customizationId}`;
          const cartCount = customizationCartCountMap.get(key) || 0;
          
          return {
            customizationId: customizationId,
            id: customizationId,
            name: customization.name,
            price: customization.price,
            cartCount: cartCount
          };
        });

        const addOns = (food.addOns || []).map(addOn => {
          const addOnId = addOn._id?.toString();
          const key = `${foodId}_${addOnId}`;
          const cartCount = addOnCartCountMap.get(key) || 0;
          
          return {
            addOnId: addOnId,
            id: addOnId,
            name: addOn.name,
            price: addOn.price,
            image: addOn.image || null,
            imageKitFileId: addOn.imageKitFileId || null,
            cartCount: cartCount
          };
        });

        const foodData = {
          foodName: food.foodName,
          foodId: foodId,
          foodImage: food.foodImage || '',
          shareLink: food.shareLink || null,
          actualPrice: pricing.actualPrice,
          discountPrice: pricing.discountPrice,
          specialOfferPrice: pricing.specialOfferPrice,
          foodPrice: pricing.finalPrice,
          cartCount: foodCartCount,
          customizations,
          addOns
        };

        // Add food to category
        categoryMap.get(categoryName).push(foodData);
      }

      // Convert map to array format
      const data = Array.from(categoryMap.entries()).map(([categoryName, foods]) => ({
        category: categoryName,
        foods: foods
      }));

      // Determine service name for response
      const serviceName = normalizedService || 'all';

      // Prepare banner image list
      const banners = vendorBanners
        .map(banner => banner.bannerImage)
        .filter(Boolean);

      res.json({
        status: true,
        message: 'Data fetched',
        service: serviceName,
        data: data,
        banners
      });
    } catch (error) {
      console.error('Error getting vendor foods by category:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          status: false,
          message: 'Invalid vendor ID'
        });
      }

      res.status(500).json({
        status: false,
        message: 'Error retrieving vendor foods',
        error: error.message
      });
    }
  }

  /**
   * Update vendor delivery radius
   * PATCH /api/vendors/:id/delivery-radius
   * PATCH /api/vendors/me/delivery-radius
   * Accessible by vendor (own) or admin
   */
  async updateDeliveryRadius(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const vendorId = resolveTargetVendorId(req);
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required'
        });
      }

      // Check permissions
      if (!hasVendorManagementAccess(req.user, vendorId)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this vendor'
        });
      }

      const { deliveryRadius } = req.body;

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      vendor.deliveryRadius = deliveryRadius !== undefined && deliveryRadius !== null ? Number(deliveryRadius) : null;
      await vendor.save();

      res.json({
        success: true,
        message: 'Delivery radius updated successfully',
        data: {
          vendorId: vendor._id.toString(),
          deliveryRadius: vendor.deliveryRadius
        }
      });
    } catch (error) {
      console.error('Error updating delivery radius:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating delivery radius',
        error: error.message
      });
    }
  }

  /**
   * Check if user location is within vendor delivery radius
   * GET /api/vendors/:id/check-delivery
   * Public endpoint
   */
  async checkDeliveryAvailability(req, res) {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required'
        });
      }

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);

      if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude or longitude values'
        });
      }

      if (userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be between -90 and 90, longitude must be between -180 and 180'
        });
      }

      const vendor = await Vendor.findById(id).select('deliveryRadius address');
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Check if vendor has delivery radius set
      if (!vendor.deliveryRadius || vendor.deliveryRadius <= 0) {
        return res.json({
          success: true,
          data: {
            vendorId: vendor._id.toString(),
            isAvailable: false,
            message: 'Vendor has not set a delivery radius',
            distance: null,
            deliveryRadius: null
          }
        });
      }

      // Get vendor coordinates
      const vendorCoords = vendor.address?.coordinates?.coordinates;
      if (!vendorCoords || !Array.isArray(vendorCoords) || vendorCoords.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'Vendor location coordinates are not available'
        });
      }

      const vendorLon = vendorCoords[0];
      const vendorLat = vendorCoords[1];

      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in kilometers
      const dLat = this.toRadians(userLat - vendorLat);
      const dLon = this.toRadians(userLon - vendorLon);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRadians(vendorLat)) *
          Math.cos(this.toRadians(userLat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // Distance in kilometers

      const roundedDistance = Math.round(distance * 100) / 100; // Round to 2 decimal places

      const isAvailable = roundedDistance <= vendor.deliveryRadius;

      res.json({
        success: true,
        data: {
          vendorId: vendor._id.toString(),
          isAvailable,
          distance: roundedDistance,
          deliveryRadius: vendor.deliveryRadius,
          message: isAvailable
            ? `Delivery is available. Distance: ${roundedDistance} km`
            : `Delivery is not available. Distance: ${roundedDistance} km (exceeds radius of ${vendor.deliveryRadius} km)`
        }
      });
    } catch (error) {
      console.error('Error checking delivery availability:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking delivery availability',
        error: error.message
      });
    }
  }

  /**
   * Helper method to convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new VendorController();

