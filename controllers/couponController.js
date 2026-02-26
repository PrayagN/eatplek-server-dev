const { validationResult } = require('express-validator');
const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');

class CouponController {
	formatCouponResponse(coupon) {
		if (!coupon) return null;

		return {
			id: coupon._id?.toString(),
			code: coupon.code,
			createdBy: coupon.createdBy,
			createdByAdmin: coupon.createdByAdmin?.toString() || null,
			createdByVendor: coupon.createdByVendor?.toString() || null,
			vendor: coupon.vendor?.toString() || null,
			vendorDetails: coupon.vendor
				? {
					id: coupon.vendor._id?.toString() || coupon.vendor.toString(),
					name: coupon.vendor.restaurantName || null
				}
				: null,
			discountType: coupon.discountType,
			discountValue: coupon.discountValue,
			maxDiscountAmount: coupon.maxDiscountAmount,
			minOrderAmount: coupon.minOrderAmount,
			isOneTimeUse: coupon.isOneTimeUse,
			usageLimit: coupon.usageLimit,
			usedCount: coupon.usedCount,
			expiresAt: coupon.expiresAt,
			isActive: coupon.isActive,
			description: coupon.description,
			createdAt: coupon.createdAt,
			updatedAt: coupon.updatedAt
		};
	}

	async createCoupon(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

			const { code, discountType, discountValue, maxDiscountAmount, minOrderAmount, isOneTimeUse, usageLimit, expiresAt, description, vendorId } = req.body;

			const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
			const isVendor = req.user.role === 'vendor';

			// Check if code already exists
			const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
			if (existingCoupon) {
				return res.status(409).json({
					success: false,
					message: 'Coupon code already exists'
				});
			}

			let couponData = {
				code: code.toUpperCase(),
				discountType,
				discountValue,
				maxDiscountAmount: maxDiscountAmount !== undefined && maxDiscountAmount !== null && maxDiscountAmount !== '' ? maxDiscountAmount : null,
				minOrderAmount: minOrderAmount !== undefined && minOrderAmount !== null && minOrderAmount !== '' ? minOrderAmount : null,
				isOneTimeUse: isOneTimeUse !== undefined ? isOneTimeUse : true,
				usageLimit: usageLimit !== undefined && usageLimit !== null && usageLimit !== '' ? usageLimit : null,
				expiresAt: expiresAt && expiresAt !== null && expiresAt !== '' ? new Date(expiresAt) : null,
				description: description && description !== null && description !== '' ? description.trim() : null,
				isActive: true
			};

			if (isAdmin) {
				// Admin creates coupon - use admin ID from token
				couponData.createdBy = 'admin';
				couponData.createdByAdmin = req.user.id; // Admin ID from token
				// Admin can create coupons for specific vendor or global (no vendor restriction)
				if (vendorId) {
					couponData.vendor = vendorId;
				}
				// If vendorId not provided, coupon is global (can be used by any vendor)
			} else if (isVendor) {
				// Vendor creates coupon - use vendor ID from token
				couponData.createdBy = 'vendor';
				couponData.createdByVendor = req.user.id; // Vendor ID from token
				// Vendor can only create coupons for themselves - vendorId from body is ignored
				couponData.vendor = req.user.id; // Always restrict to the vendor creating the coupon
			} else {
				return res.status(403).json({
					success: false,
					message: 'Unauthorized to create coupons'
				});
			}

			// Validate discount value
			if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
				return res.status(400).json({
					success: false,
					message: 'Percentage discount must be between 0 and 100'
				});
			}

			if (discountType === 'fixed' && discountValue <= 0) {
				return res.status(400).json({
					success: false,
					message: 'Fixed discount must be greater than 0'
				});
			}

			const coupon = await Coupon.create(couponData);
			await coupon.populate('vendor', 'restaurantName');

			return res.status(201).json({
				success: true,
				message: 'Coupon created successfully',
				data: this.formatCouponResponse(coupon)
			});
		} catch (error) {
			console.error('Error creating coupon:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to create coupon',
				error: error.message
			});
		}
	}

	async getCoupons(req, res) {
		try {
			const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
			const isVendor = req.user.role === 'vendor';

			let query = {};

			if (isVendor) {
				// Vendor can only see their own coupons
				query = { createdByVendor: req.user.id };
			} else if (!isAdmin) {
				return res.status(403).json({
					success: false,
					message: 'Unauthorized to view coupons'
				});
			}
			// Admin sees all coupons (query is empty)

			const { isActive, vendor, search } = req.query;

			if (isActive !== undefined) {
				query.isActive = isActive === 'true';
			}

			if (vendor && isAdmin) {
				query.vendor = vendor;
			}

			if (search) {
				query.code = { $regex: search.toUpperCase(), $options: 'i' };
			}

			const coupons = await Coupon.find(query)
				.populate('vendor', 'restaurantName')
				.populate('createdByAdmin', 'name email')
				.populate('createdByVendor', 'restaurantName email')
				.sort({ createdAt: -1 });

			return res.json({
				success: true,
				message: 'Coupons retrieved successfully',
				data: coupons.map((coupon) => this.formatCouponResponse(coupon))
			});
		} catch (error) {
			console.error('Error fetching coupons:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to fetch coupons',
				error: error.message
			});
		}
	}

	async getCouponById(req, res) {
		try {
			const { id } = req.params;
			const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
			const isVendor = req.user.role === 'vendor';

			let query = { _id: id };

			if (isVendor) {
				query.createdByVendor = req.user.id;
			}

			const coupon = await Coupon.findOne(query)
				.populate('vendor', 'restaurantName')
				.populate('createdByAdmin', 'name email')
				.populate('createdByVendor', 'restaurantName email');

			if (!coupon) {
				return res.status(404).json({
					success: false,
					message: 'Coupon not found'
				});
			}

			return res.json({
				success: true,
				message: 'Coupon retrieved successfully',
				data: this.formatCouponResponse(coupon)
			});
		} catch (error) {
			console.error('Error fetching coupon:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to fetch coupon',
				error: error.message
			});
		}
	}

	async updateCoupon(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

			const { id } = req.params;
			const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
			const isVendor = req.user.role === 'vendor';

			let query = { _id: id };

			if (isVendor) {
				query.createdByVendor = req.user.id;
			}

			const coupon = await Coupon.findOne(query);

			if (!coupon) {
				return res.status(404).json({
					success: false,
					message: 'Coupon not found'
				});
			}

			const {
				discountType,
				discountValue,
				maxDiscountAmount,
				minOrderAmount,
				isOneTimeUse,
				usageLimit,
				expiresAt,
				description,
				isActive
			} = req.body;

			// Update allowed fields
			if (discountType !== undefined) coupon.discountType = discountType;
			if (discountValue !== undefined) coupon.discountValue = discountValue;
			if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
			if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount;
			if (isOneTimeUse !== undefined) coupon.isOneTimeUse = isOneTimeUse;
			if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
			if (expiresAt !== undefined) coupon.expiresAt = expiresAt ? new Date(expiresAt) : null;
			if (description !== undefined) coupon.description = description;
			if (isActive !== undefined && isAdmin) {
				coupon.isActive = isActive;
			}

			// Validate discount value
			if (coupon.discountType === 'percentage' && (coupon.discountValue < 0 || coupon.discountValue > 100)) {
				return res.status(400).json({
					success: false,
					message: 'Percentage discount must be between 0 and 100'
				});
			}

			if (coupon.discountType === 'fixed' && coupon.discountValue <= 0) {
				return res.status(400).json({
					success: false,
					message: 'Fixed discount must be greater than 0'
				});
			}

			await coupon.save();
			await coupon.populate('vendor', 'restaurantName');

			return res.json({
				success: true,
				message: 'Coupon updated successfully',
				data: this.formatCouponResponse(coupon)
			});
		} catch (error) {
			console.error('Error updating coupon:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to update coupon',
				error: error.message
			});
		}
	}

	async deleteCoupon(req, res) {
		try {
			const { id } = req.params;
			const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
			const isVendor = req.user.role === 'vendor';

			let query = { _id: id };

			if (isVendor) {
				query.createdByVendor = req.user.id;
			}

			const coupon = await Coupon.findOne(query);

			if (!coupon) {
				return res.status(404).json({
					success: false,
					message: 'Coupon not found'
				});
			}

			// Soft delete by setting isActive to false
			coupon.isActive = false;
			await coupon.save();

			return res.json({
				success: true,
				message: 'Coupon deactivated successfully'
			});
		} catch (error) {
			console.error('Error deleting coupon:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to delete coupon',
				error: error.message
			});
		}
	}

	async validateCoupon(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

			const { code } = req.body;
			const userId = req.user?.id;

			// Get user's cart to check order amount and vendor
			const cart = await Cart.findOne({ user: userId }).populate('vendor');

			if (!cart || cart.items.length === 0) {
				return res.status(400).json({
					success: false,
					message: 'Cart is empty. Please add items to cart before validating coupon.'
				});
			}

			const orderAmount = cart.totals?.grandTotal || cart.totals?.subTotal || 0;
			const vendorId = cart.vendor?._id || cart.vendor;

			const validation = await Coupon.validateCoupon(code, userId, orderAmount, vendorId);

			if (!validation.valid) {
				return res.status(400).json({
					success: false,
					message: validation.error,
					data: {
						valid: false,
						error: validation.error
					}
				});
			}

			return res.json({
				success: true,
				message: 'Coupon is valid',
				data: {
					valid: true,
					coupon: this.formatCouponResponse(validation.coupon),
					discount: validation.discount,
					orderAmount: orderAmount,
					finalAmount: Math.round((orderAmount - validation.discount) * 100) / 100
				}
			});
		} catch (error) {
			console.error('Error validating coupon:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to validate coupon',
				error: error.message
			});
		}
	}

	async applyCoupon(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

			const { code } = req.body;
			const userId = req.user.id;

			const cart = await Cart.findOne({ user: userId }).populate('vendor');

			if (!cart || cart.items.length === 0) {
				return res.status(400).json({
					success: false,
					message: 'Cart is empty. Please add items to cart before applying coupon.'
				});
			}

			const orderAmount = cart.totals?.grandTotal || cart.totals?.subTotal || 0;
			const vendorId = cart.vendor?._id || cart.vendor;

			const validation = await Coupon.validateCoupon(code, userId, orderAmount, vendorId);

			if (!validation.valid) {
				return res.status(400).json({
					success: false,
					message: validation.error
				});
			}

			// Apply coupon to cart
			cart.couponCode = validation.coupon.code;
			cart.couponDiscount = validation.discount;
			cart.totals.couponDiscount = validation.discount;

			// Recalculate totals (this will apply coupon discount)
			cart.calculateTotals();
			await cart.save();

			await cart.populate([
				{ path: 'vendor', select: 'restaurantName profileImage address serviceOffered gstPercentage' },
				{ path: 'items.food', select: 'foodName foodImage type' }
			]);

			// Re-fetch cart to get updated totals
			const updatedCart = await Cart.findById(cart._id)
				.populate('vendor', 'restaurantName profileImage address serviceOffered gstPercentage')
				.populate('items.food', 'foodName foodImage type');

			return res.json({
				success: true,
				message: 'Coupon applied successfully',
				data: {
					coupon: this.formatCouponResponse(validation.coupon),
					discount: validation.discount,
					originalAmount: orderAmount,
					finalAmount: updatedCart.totals.grandTotal
				}
			});
		} catch (error) {
			console.error('Error applying coupon:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to apply coupon',
				error: error.message
			});
		}
	}

	async removeCoupon(req, res) {
		try {
			const userId = req.user.id;

			const cart = await Cart.findOne({ user: userId });

			if (!cart) {
				return res.status(404).json({
					success: false,
					message: 'Cart not found'
				});
			}

			if (!cart.couponCode) {
				return res.status(400).json({
					success: false,
					message: 'No coupon applied to cart'
				});
			}

			// Remove coupon from cart
			cart.couponCode = null;
			cart.couponDiscount = 0;
			cart.totals.couponDiscount = 0;

			// Recalculate totals without coupon
			cart.calculateTotals();
			await cart.save();

			await cart.populate([
				{ path: 'vendor', select: 'restaurantName profileImage address serviceOffered gstPercentage' },
				{ path: 'items.food', select: 'foodName foodImage type' }
			]);

			return res.json({
				success: true,
				message: 'Coupon removed successfully'
			});
		} catch (error) {
			console.error('Error removing coupon:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to remove coupon',
				error: error.message
			});
		}
	}

	async getUserCoupons(req, res) {
		try {
			const userId = req.user.id;
			const { vendorId } = req.query;
			const now = new Date();

			// Base query: only active, non-expired coupons
			const query = {
				isActive: true,
				$or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
			};

			// If vendorId provided, return vendor-specific coupons for that vendor + global coupons
			// If no vendorId, return all coupons (global + all vendor-specific)
			if (vendorId) {
				query.$and = [{ $or: [{ vendor: vendorId }, { vendor: null }] }];
			}

			const coupons = await Coupon.find(query)
				.populate('vendor', 'restaurantName')
				.sort({ createdAt: -1 });

			// Further filter in JS:
			// 1. Usage limit not exhausted
			// 2. One-time use: current user hasn't used it
			const userIdStr = userId.toString();
			const usableCoupons = coupons.filter((coupon) => {
				// Check usage limit
				if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
					return false;
				}
				// Check one-time use — exclude if user already used it
				if (coupon.isOneTimeUse) {
					const hasUsed = coupon.usedByUsers.some(
						(id) => id.toString() === userIdStr
					);
					if (hasUsed) return false;
				}
				return true;
			});

			const formattedCoupons = usableCoupons.map((coupon) => ({
				id: coupon._id?.toString(),
				code: coupon.code,
				discountType: coupon.discountType,
				discountValue: coupon.discountValue,
				maxDiscountAmount: coupon.maxDiscountAmount,
				minOrderAmount: coupon.minOrderAmount,
				isOneTimeUse: coupon.isOneTimeUse,
				usageLimit: coupon.usageLimit,
				usedCount: coupon.usedCount,
				expiresAt: coupon.expiresAt,
				description: coupon.description,
				vendorDetails: coupon.vendor
					? {
						id: coupon.vendor._id?.toString() || coupon.vendor.toString(),
						name: coupon.vendor.restaurantName || null
					}
					: null
			}));

			return res.json({
				success: true,
				message: 'Coupons retrieved successfully',
				count: formattedCoupons.length,
				data: formattedCoupons
			});
		} catch (error) {
			console.error('Error fetching user coupons:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to fetch coupons',
				error: error.message
			});
		}
	}
}

const controller = new CouponController();

module.exports = {
	createCoupon: controller.createCoupon.bind(controller),
	getCoupons: controller.getCoupons.bind(controller),
	getCouponById: controller.getCouponById.bind(controller),
	updateCoupon: controller.updateCoupon.bind(controller),
	deleteCoupon: controller.deleteCoupon.bind(controller),
	validateCoupon: controller.validateCoupon.bind(controller),
	applyCoupon: controller.applyCoupon.bind(controller),
	removeCoupon: controller.removeCoupon.bind(controller),
	getUserCoupons: controller.getUserCoupons.bind(controller)
};

