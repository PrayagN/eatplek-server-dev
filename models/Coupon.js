const mongoose = require('mongoose');

const DISCOUNT_TYPES = ['percentage', 'fixed'];
const CREATED_BY_TYPES = ['admin', 'vendor'];

const couponSchema = new mongoose.Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			uppercase: true,
			match: [/^[A-Z0-9]+$/, 'Coupon code must contain only uppercase letters and numbers'],
			minlength: [4, 'Coupon code must be at least 4 characters'],
			maxlength: [20, 'Coupon code must not exceed 20 characters']
		},
		createdBy: {
			type: String,
			enum: CREATED_BY_TYPES,
			required: true
		},
		createdByAdmin: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Admin',
			default: null
		},
		createdByVendor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Vendor',
			default: null
		},
		vendor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Vendor',
			default: null,
			index: true,
			// If vendor creates coupon, only that vendor can use it
		},
		discountType: {
			type: String,
			enum: DISCOUNT_TYPES,
			required: true
		},
		discountValue: {
			type: Number,
			required: true,
			min: [0, 'Discount value must be positive']
		},
		// For percentage discounts, max discount amount
		maxDiscountAmount: {
			type: Number,
			default: null,
			min: [0, 'Max discount amount must be positive']
		},
		// Minimum order amount to apply coupon
		minOrderAmount: {
			type: Number,
			default: null,
			min: [0, 'Minimum order amount must be positive']
		},
		// One-time use coupon (can only be used once by one user)
		isOneTimeUse: {
			type: Boolean,
			default: true
		},
		// Usage limit (first 100 or 1000 users)
		usageLimit: {
			type: Number,
			default: null,
			min: [1, 'Usage limit must be at least 1']
		},
		usedCount: {
			type: Number,
			default: 0,
			min: [0, 'Used count cannot be negative']
		},
		// Users who have used this coupon (for one-time use tracking)
		usedByUsers: {
			type: [
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User'
				}
			],
			default: []
		},
		// Expiry date
		expiresAt: {
			type: Date,
			default: null,
			index: true
		},
		// Active status
		isActive: {
			type: Boolean,
			default: true,
			index: true
		},
		description: {
			type: String,
			trim: true,
			maxlength: [500, 'Description cannot exceed 500 characters'],
			default: null
		}
	},
	{
		timestamps: true
	}
);

// Compound index for vendor-specific coupons
couponSchema.index({ vendor: 1, isActive: 1 });
couponSchema.index({ code: 1, isActive: 1 });
// Note: expiresAt index is defined in the schema field definition (index: true)

// Method to check if coupon is valid
couponSchema.methods.isValid = function (userId, orderAmount, vendorId) {
	// Check if coupon is active
	if (!this.isActive) {
		return { valid: false, error: 'Coupon is not active' };
	}

	// Check expiry
	if (this.expiresAt && new Date() > this.expiresAt) {
		return { valid: false, error: 'Coupon has expired' };
	}

	// Check vendor restriction
	if (this.vendor) {
		const vendorIdStr = vendorId?.toString ? vendorId.toString() : String(vendorId);
		const couponVendorIdStr = this.vendor?.toString ? this.vendor.toString() : String(this.vendor);
		if (vendorIdStr !== couponVendorIdStr) {
			return { valid: false, error: 'This coupon is not valid for this vendor' };
		}
	}

	// Check minimum order amount
	if (this.minOrderAmount && orderAmount < this.minOrderAmount) {
		return {
			valid: false,
			error: `Minimum order amount of ${this.minOrderAmount} is required to use this coupon`
		};
	}

	// Check usage limit
	if (this.usageLimit && this.usedCount >= this.usageLimit) {
		return { valid: false, error: 'Coupon usage limit has been reached' };
	}

	// Check one-time use
	if (this.isOneTimeUse && userId) {
		const userIdStr = userId?.toString ? userId.toString() : String(userId);
		const hasUsed = this.usedByUsers.some((id) => {
			const usedIdStr = id?.toString ? id.toString() : String(id);
			return usedIdStr === userIdStr;
		});
		if (hasUsed) {
			return { valid: false, error: 'You have already used this coupon' };
		}
	}

	return { valid: true };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function (orderAmount) {
	if (this.discountType === 'percentage') {
		let discount = (orderAmount * this.discountValue) / 100;
		// Apply max discount limit if set
		if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
			discount = this.maxDiscountAmount;
		}
		return Math.round(discount * 100) / 100;
	} else {
		// Fixed amount discount, cannot exceed order amount
		const discount = Math.min(this.discountValue, orderAmount);
		return Math.round(discount * 100) / 100;
	}
};

// Static method to validate and get coupon
couponSchema.statics.validateCoupon = async function (code, userId, orderAmount, vendorId) {
	const coupon = await this.findOne({ code: code.toUpperCase(), isActive: true });

	if (!coupon) {
		return { valid: false, error: 'Invalid coupon code' };
	}

	const validation = coupon.isValid(userId, orderAmount, vendorId);
	if (!validation.valid) {
		return validation;
	}

	const discount = coupon.calculateDiscount(orderAmount);
	return {
		valid: true,
		coupon: coupon,
		discount: discount
	};
};

// Method to mark coupon as used
couponSchema.methods.markAsUsed = async function (userId) {
	this.usedCount += 1;
	if (this.isOneTimeUse && userId) {
		if (!this.usedByUsers.some((id) => id.toString() === userId.toString())) {
			this.usedByUsers.push(userId);
		}
	}
	return await this.save();
};

const Coupon = mongoose.model('Coupon', couponSchema);

Coupon.DISCOUNT_TYPES = DISCOUNT_TYPES;
Coupon.CREATED_BY_TYPES = CREATED_BY_TYPES;

module.exports = Coupon;

