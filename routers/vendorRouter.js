const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const {
  validateCreateVendor,
  validateUpdateVendor,
  validateAddBranch,
  validateVendorOperatingHours,
  validateVendorBankAccounts,
  validateVendorDetailsUpdate,
  validateDeliveryRadius
} = require('../validations/vendor.validations');
const { parseVendorPayload, transformCoordinates, uploadVendorImages } = require('../documents/vendor.middleware');

const ensureVendorContext = (req, res, next) => {
  const userRole = req.user?.role;

  if (userRole === 'vendor') {
    const vendorId = req.user.vendorId || req.user.id;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID is missing in token'
      });
    }
    req.params.id = vendorId;
    return next();
  }

  if (!req.params.id) {
    return res.status(400).json({
      success: false,
      message: 'Vendor ID is required for admin requests'
    });
  }

  return next();
};

/**
 * Vendor Routes
 * IMPORTANT: Specific routes must come before parameterized routes
 */

// Search vendors by name (for adding branches)
router.get('/search', vendorController.searchVendors);

// Get all vendors with filtering and pagination
router.get('/', vendorController.getAllVendors);

// Create new vendor (Admin only)
router.post(
  '/',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  uploadVendorImages,
  parseVendorPayload,
  transformCoordinates,
  validateCreateVendor,
  vendorController.createVendor
);

// Add branch to vendor (Admin only) - Query params: vendor1Id, vendor2Id
router.post(
  '/branches',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  vendorController.addBranch
);

// Remove branch from vendor (Admin only) - Query params: vendor1Id, vendor2Id
router.delete(
  '/branches',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  vendorController.removeBranch
);

// Update vendor operating hours (Vendor/Admin)
router.patch(
  '/me/operating-hours',
  authenticateToken,
  parseVendorPayload,
  ensureVendorContext,
  validateVendorOperatingHours,
  vendorController.updateOperatingHours
);

router.patch(
  '/:id/operating-hours',
  authenticateToken,
  parseVendorPayload,
  ensureVendorContext,
  validateVendorOperatingHours,
  vendorController.updateOperatingHours
);

// Update vendor bank accounts (Vendor/Admin)
router.patch(
  '/me/bank-accounts',
  authenticateToken,
  parseVendorPayload,
  ensureVendorContext,
  validateVendorBankAccounts,
  vendorController.updateBankAccounts
);

router.patch(
  '/:id/bank-accounts',
  authenticateToken,
  parseVendorPayload,
  ensureVendorContext,
  validateVendorBankAccounts,
  vendorController.updateBankAccounts
);

// Update vendor details (Vendor/Admin)
router.patch(
  '/me/details',
  authenticateToken,
  parseVendorPayload,
  transformCoordinates,
  ensureVendorContext,
  validateVendorDetailsUpdate,
  vendorController.updateVendorDetails
);

router.patch(
  '/:id/details',
  authenticateToken,
  parseVendorPayload,
  transformCoordinates,
  ensureVendorContext,
  validateVendorDetailsUpdate,
  vendorController.updateVendorDetails
);

// Get all branches of a vendor
router.get('/:id/branches', vendorController.getBranches);

// Get vendor foods grouped by category (for details page)
// Using optionalAuth to get cart counts if user is authenticated
router.get('/:id/foods', optionalAuth, vendorController.getVendorFoodsByCategory);

// Check delivery availability (Public)
router.get('/:id/check-delivery', vendorController.checkDeliveryAvailability);

// Update delivery radius (Vendor/Admin)
router.patch(
  '/me/delivery-radius',
  authenticateToken,
  ensureVendorContext,
  validateDeliveryRadius,
  vendorController.updateDeliveryRadius
);

router.patch(
  '/:id/delivery-radius',
  authenticateToken,
  ensureVendorContext,
  validateDeliveryRadius,
  vendorController.updateDeliveryRadius
);

// Block/Unblock vendor (Admin only)
router.patch('/:id/block', 
  authenticateToken, 
  requireRole('admin', 'super_admin'), 
  vendorController.blockVendor
);

// Hard delete vendor (Super Admin only)
router.delete('/:id/hard', 
  authenticateToken, 
  requireRole('super_admin'), 
  vendorController.hardDeleteVendor
);

// Get single vendor by ID
router.get('/:id', vendorController.getVendorById);

// Update vendor (Admin only)
router.put(
  '/:id',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  uploadVendorImages,
  parseVendorPayload,
  transformCoordinates,
  validateUpdateVendor,
  vendorController.updateVendor
);

// Soft delete vendor (Admin only)
router.delete('/:id', 
  authenticateToken, 
  requireRole('admin', 'super_admin'), 
  vendorController.deleteVendor
);

module.exports = router;
