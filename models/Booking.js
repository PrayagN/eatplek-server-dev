const mongoose = require('mongoose');
const { SERVICE_TYPES, normalizeServiceType } = require('../utils/serviceType');
const ORDER_STATUSES = ['pending', 'accepted', 'rejected', 'timeout'];

const bookingItemAddOnSchema = new mongoose.Schema(
	{
		addOnId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true
		},
		name: { type: String, required: true, trim: true },
		price: { type: Number, required: true, min: 0 },
		quantity: { type: Number, required: true, min: 1, default: 1 }
	},
	{ _id: false }
);

const bookingItemCustomizationSchema = new mongoose.Schema(
	{
		customizationId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true
		},
		name: { type: String, required: true, trim: true },
		price: { type: Number, required: true, min: 0 },
		quantity: { type: Number, required: true, min: 1, default: 1 }
	},
	{ _id: false }
);

const bookingItemSchema = new mongoose.Schema(
	{
		food: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Food',
			required: true
		},
		foodName: { type: String, required: true },
		foodImage: { type: String, default: null },
		foodType: { type: String, enum: ['veg', 'non-veg'], required: true },
		quantity: { type: Number, required: true, min: 1 },
		basePrice: { type: Number, required: true, min: 0 },
		discountPrice: { type: Number, min: 0, default: null },
		effectivePrice: { type: Number, required: true, min: 0 },
		customizations: {
			type: [bookingItemCustomizationSchema],
			default: []
		},
		addOns: {
			type: [bookingItemAddOnSchema],
			default: []
		},
		isPrebook: {
			type: Boolean,
			default: false
		},
		packingCharge: { type: Number, default: 0, min: 0 },
		itemTotal: { type: Number, required: true, min: 0 },
		notes: { type: String, default: null }
	},
	{ _id: false }
);

const amountSummarySchema = new mongoose.Schema(
	{
		subTotal: { type: Number, default: 0, min: 0 },
		addOnTotal: { type: Number, default: 0, min: 0 },
		customizationTotal: { type: Number, default: 0, min: 0 },
		packingChargeTotal: { type: Number, default: 0, min: 0 },
		discountTotal: { type: Number, default: 0, min: 0 },
		couponDiscount: { type: Number, default: 0, min: 0 },
		taxAmount: { type: Number, default: 0, min: 0 },
		taxPercentage: { type: Number, default: 0, min: 0, max: 100 },
		grandTotal: { type: Number, default: 0, min: 0 },
		itemCount: { type: Number, default: 0, min: 0 }
	},
	{ _id: false }
);

const bookingSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true
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
		isPrebook: {
			type: Boolean,
			default: false,
			index: true
		},
		serviceDetails: {
			address: { type: String, trim: true, default: null },
			latitude: { type: Number, default: null },
			longitude: { type: Number, default: null },
			name: { type: String, trim: true, default: null },
			phoneNumber: { type: String, trim: true, default: null },
			personCount: { type: Number, min: 1, default: null },
			reachTime: { type: Date, default: null },
			vehicleDetails: { type: String, trim: true, default: null }
		},
		cartSnapshot: {
			cartId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Cart'
			},
			items: {
				type: [bookingItemSchema],
				required: true
			},
			totals: {
				type: amountSummarySchema,
				required: true
			}
		},
		amountSummary: {
			type: amountSummarySchema,
			required: true
		},
		orderStatus: {
			type: String,
			enum: ORDER_STATUSES,
			default: 'pending',
			index: true
		},
		vendorResponseAt: {
			type: Date,
			default: null
		},
		notes: {
			type: String,
			trim: true,
			default: null
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
		couponId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Coupon',
			default: null
		},
		// Rejection details
		rejectionReason: {
			type: String,
			trim: true,
			default: null,
			maxlength: [500, 'Rejection reason cannot exceed 500 characters']
		},
		suggestedTime: {
			type: Date,
			default: null
		},
		// Modified items for partial rejection
		modifiedItems: {
			type: [
				{
					food: {
						type: mongoose.Schema.Types.ObjectId,
						ref: 'Food',
						required: true
					},
					originalQuantity: {
						type: Number,
						required: true,
						min: 1
					},
					updatedQuantity: {
						type: Number,
						required: true,
						min: 1
					},
					reason: {
						type: String,
						trim: true,
						maxlength: [200, 'Reason cannot exceed 200 characters'],
						default: null
					}
				}
			],
			default: []
		}
	},
	{
		timestamps: true
	}
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ vendor: 1, orderStatus: 1 });

// Normalize serviceType to standard format before saving
bookingSchema.pre('save', function (next) {
	if (this.serviceType) {
		const normalized = normalizeServiceType(this.serviceType);
		if (normalized) {
			this.serviceType = normalized;
		}
	}
	next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

