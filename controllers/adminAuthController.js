const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

/**
 * Admin Authentication Controller
 * Handles admin login and registration
 */
class AdminAuthController {
  /**
   * Register a new admin
   * POST /api/admin/register
   */
  async register(req, res) {
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

      const { name, email, password, role } = req.body;

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: 'Admin with this email already exists'
        });
      }

      // Create new admin
      const admin = await Admin.create({
        name,
        email,
        password,
        role: role || 'admin'
      });

      // Generate JWT token
      const token = this.generateToken(admin._id, admin.email, admin.role);

      // Remove password from response
      const adminResponse = {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt
      };

      res.status(201).json({
        success: true,
        message: 'Admin registered successfully',
        data: adminResponse,
        token
      });
    } catch (error) {
      console.error('Error registering admin:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Admin with this email already exists'
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
        message: 'Error registering admin',
        error: error.message
      });
    }
  }

  /**
   * Login admin
   * POST /api/admin/login
   */
  async login(req, res) {
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

      const { email, password } = req.body;

      // Find admin and include password for comparison
      const admin = await Admin.findOne({ email }).select('+password');

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact the administrator.'
        });
      }

      // Compare passwords
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update last login
      await admin.updateLastLogin();

      // Generate JWT token
      const token = this.generateToken(admin._id, admin.email, admin.role);

      // Remove password from response
      const adminResponse = {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin
      };

      res.json({
        success: true,
        message: 'Login successful',
        data: adminResponse,
        token
      });
    } catch (error) {
      console.error('Error logging in admin:', error);
      res.status(500).json({
        success: false,
        message: 'Error logging in',
        error: error.message
      });
    }
  }

  /**
   * Get current admin profile
   * GET /api/admin/profile
   */
  async getProfile(req, res) {
    try {
      const admin = await Admin.findById(req.user.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: admin
      });
    } catch (error) {
      console.error('Error getting admin profile:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving profile',
        error: error.message
      });
    }
  }

  /**
   * Generate JWT token
   * @private
   */
  generateToken(id, email, role) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(
      { id, email, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

const controllerInstance = new AdminAuthController();

// Bind methods to preserve 'this' context when used as Express route handlers
module.exports = {
  register: controllerInstance.register.bind(controllerInstance),
  login: controllerInstance.login.bind(controllerInstance),
  getProfile: controllerInstance.getProfile.bind(controllerInstance)
};

