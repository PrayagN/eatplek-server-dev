const mongoose = require('mongoose');
const { SERVICE_TYPES, normalizeServiceType } = require('../utils/serviceType');

const cartItemCustomizationSchema = new mongoose.Schema(
	{
		customizationId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true
		},
		name: {
			type: String,
			required: true,
			trim: true
		},
		price: {
			type: Number,
			required: true,
			min: 0
		},
		quantity: {
			type: Number,
			min: 1,
			default: 1
		}
	},
	{ _id: false }
);

const cartItemAddOnSchema = new mongoose.Schema(
	{
		addOnId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true
		},
		name: {
			type: String,
			required: true,
			trim: true
		},
		price: {
			type: Number,
			required: true,
			min: 0
		},
		quantity: {
			type: Number,
			min: 1,
			default: 1
		}
	},
	{ _id: false }
);

const cartItemSchema = new mongoose.Schema(
	{
		food: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Food',
			required: true
		},
		foodName: {
			type: String,
			required: true
		},
		foodImage: {
			type: String,
			default: null
		},
		foodType: {
			type: String,
			enum: ['veg', 'non-veg'],
			required: true
		},
		quantity: {
			type: Number,
			required: true,
			min: 1,
			default: 1
		},
		basePrice: {
			type: Number,
			required: true,
			min: 0
		},
		discountPrice: {
			type: Number,
			min: 0,
			default: null
		},
		effectivePrice: {
			type: Number,
			required: true,
			min: 0
		},
		usesCustomizationPrice: {
			type: Boolean,
			default: false
		},
		customizations: {
			type: [cartItemCustomizationSchema],
			default: []
		},
		addOns: {
			type: [cartItemAddOnSchema],
			default: []
		},
		isPrebook: {
			type: Boolean,
			default: false
		},
		notes: {
			type: String,
			default: null,
			trim: true,
			maxlength: 500
		},
		packingCharge: {
			type: Number,
			default: 0,
			min: 0
		},
		itemTotal: {
			type: Number,
			required: true,
			min: 0
		}
	},
	{
		_id: true,
		timestamps: true
	}
);

const cartSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			unique: true
		},
		vendor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Vendor',
			required: true
		},
		serviceType: {
			type: String,
			enum: SERVICE_TYPES,
			required: true
		},
		items: {
			type: [cartItemSchema],
			default: []
		},
		isPrebookCart: {
			type: Boolean,
			default: false,
			index: true
		},
		gstPercentage: {
			type: Number,
			default: 0,
			min: 0,
			max: 100
		},
		totals: {
			subTotal: {
				type: Number,
				default: 0,
				min: 0
			},
			addOnTotal: {
				type: Number,
				default: 0,
				min: 0
			},
			customizationTotal: {
				type: Number,
				default: 0,
				min: 0
			},
			packingChargeTotal: {
				type: Number,
				default: 0,
				min: 0
			},
			grandTotal: {
				type: Number,
				default: 0,
				min: 0
			},
			discountTotal: {
				type: Number,
				default: 0,
				min: 0
			},
			couponDiscount: {
				type: Number,
				default: 0,
				min: 0
			},
			taxAmount: {
				type: Number,
				default: 0,
				min: 0
			},
			taxPercentage: {
				type: Number,
				default: 0,
				min: 0,
				max: 100
			},
			itemCount: {
				type: Number,
				default: 0,
				min: 0
			}
		},
		lastUpdatedAt: {
			type: Date,
			default: Date.now
		},
		couponCode: {
			type: String,
			default: null,
			trim: true,
			uppercase: true
		},
		couponDiscount: {
			type: Number,
			default: 0,
			min: 0
		},
		cartCode: {
			type: String,
			trim: true,
			uppercase: true,
			unique: true,
			sparse: true,
			index: true
		},
		connectedCart: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Cart',
			default: null,
			index: true
		},
		connectedUsers: {
			type: [
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User'
				}
			],
			default: []
		}
	},
	{
		timestamps: true
	}
);

cartSchema.methods.calculateTotals = function () {
	let subTotal = 0;
	let addOnTotal = 0;
	let customizationTotal = 0;
	let packingChargeTotal = 0;
	let discountTotal = 0;
	let itemCount = 0;

	this.items.forEach((item) => {
		const usesCustomizationPrice = Boolean(item.usesCustomizationPrice);
		const addOnOrderTotal = (item.addOns || []).reduce((sum, addOn) => sum + addOn.price * (addOn.quantity || 1), 0);
		const customizationUnitTotal = (item.customizations || []).reduce(
			(sum, customization) => sum + customization.price * (customization.quantity || 1),
			0
		);

		const customizationContribution = usesCustomizationPrice ? 0 : customizationUnitTotal;
		const packingChargePerUnit = item.packingCharge || 0;
		const unitTotal = (item.effectivePrice || 0) + customizationContribution + packingChargePerUnit;
		item.itemTotal = unitTotal * item.quantity + addOnOrderTotal;

		addOnTotal += addOnOrderTotal;
		customizationTotal += customizationContribution * item.quantity;
		packingChargeTotal += packingChargePerUnit * item.quantity;
		subTotal += item.itemTotal;
		const discountPerUnit = usesCustomizationPrice
			? 0
			: Math.max(0, (item.basePrice || 0) - (item.effectivePrice || 0));
		discountTotal += discountPerUnit * item.quantity;
		itemCount += item.quantity;
	});

	const gstPercentage = Number(this.gstPercentage) || 0;
	const taxAmount = gstPercentage > 0 ? (subTotal * gstPercentage) / 100 : 0;
	
	// Apply coupon discount (after tax calculation)
	const couponDiscount = Number(this.couponDiscount) || 0;
	const totalBeforeCoupon = subTotal + taxAmount;
	const finalTotal = Math.max(0, totalBeforeCoupon - couponDiscount);

	this.totals = {
		subTotal: Math.round(subTotal * 100) / 100,
		addOnTotal: Math.round(addOnTotal * 100) / 100,
		customizationTotal: Math.round(customizationTotal * 100) / 100,
		packingChargeTotal: Math.round(packingChargeTotal * 100) / 100,
		grandTotal: Math.round(finalTotal * 100) / 100,
		discountTotal: Math.round(discountTotal * 100) / 100,
		couponDiscount: Math.round(couponDiscount * 100) / 100,
		taxAmount: Math.round(taxAmount * 100) / 100,
		taxPercentage: gstPercentage,
		itemCount
	};

	this.lastUpdatedAt = new Date();

	return this.totals;
};

// Generate unique cart code
// Format: CART + 4 digits (8 characters total, e.g., CART0001, CART0002, ... CART0999, CART1000, etc.)
cartSchema.statics.generateCartCode = async function () {
	let cartCode;
	let attempts = 0;
	const maxAttempts = 100; // Prevent infinite loop

	do {
		// Generate a random number between 1 and 9999, pad with zeros to 4 digits
		const randomNum = Math.floor(Math.random() * 9999) + 1;
		const paddedNum = String(randomNum).padStart(4, '0');
		cartCode = `CART${paddedNum}`;
		attempts++;

		// Check if code already exists
		const existingCart = await this.findOne({ cartCode: cartCode });
		if (!existingCart) {
			break;
		}

		if (attempts >= maxAttempts) {
			throw new Error('Unable to generate unique cart code. Please try again.');
		}
	} while (true);

	return cartCode;
};

cartSchema.pre('validate', function (next) {
	if (this.serviceType) {
		const normalized = normalizeServiceType(this.serviceType);
		if (normalized) {
			this.serviceType = normalized;
		}
	}
	next();
});

cartSchema.pre('save', async function (next) {
	// Normalize serviceType to standard format
	if (this.serviceType) {
		const normalized = normalizeServiceType(this.serviceType);
		if (normalized) {
			this.serviceType = normalized;
		}
	}

	// Generate cart code for new carts that are NOT connection pointers
	// Only generate cartCode if cart doesn't have connectedCart set (i.e., it's the main cart)
	// Connection pointer carts don't need their own cartCode - they use the connected cart's code
	if (this.isNew && !this.cartCode && !this.connectedCart) {
		try {
			this.cartCode = await this.constructor.generateCartCode();
		} catch (error) {
			return next(error);
		}
	}

	this.calculateTotals();
	next();
});

const Cart = mongoose.model('Cart', cartSchema);

Cart.SERVICE_TYPES = SERVICE_TYPES;

module.exports = Cart;

