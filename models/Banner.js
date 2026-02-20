const mongoose = require('mongoose');

/**
 * Banner Schema
 * Represents promotional banners that can be created by admins
 */
const bannerSchema = new mongoose.Schema({
	// Banner Image
	bannerImage: {
		type: String,
		required: [true, 'Banner image is required'],
		trim: true
	},
	bannerImageKitFileId: {
		type: String,
		trim: true,
		default: null,
		description: 'ImageKit file ID for banner image'
	},
	
	// Hotel Reference (Optional)
	hotel: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Vendor',
		default: null
	},
	
	// Location Points (Optional) - for location-based banners
	locationPoints: {
		type: {
			type: String,
			enum: ['Point']
		},
		coordinates: {
			type: [Number],
			validate: {
				validator: function(v) {
					if (!v || v.length === 0) return true; // Allow empty/null
					return Array.isArray(v) && v.length === 2 && 
						typeof v[0] === 'number' && typeof v[1] === 'number' &&
						v[0] >= -180 && v[0] <= 180 && 
						v[1] >= -90 && v[1] <= 90;    
				},
				message: 'Coordinates must be an array of [longitude, latitude] with valid ranges'
			}
		}
	},
	
	// End Date (Required)
	endDate: {
		type: Date,
		required: [true, 'End date is required'],
		validate: {
			validator: function(v) {
				return v > new Date();
			},
			message: 'End date must be in the future'
		}
	},
	
	// Prebook Related
	isPrebookRelated: {
		type: Boolean,
		default: false,
		required: true
	},
	
	// Prebook Reference (Required if isPrebookRelated is true)
	prebook: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Food',
		default: null,
		validate: {
			validator: function(v) {
				// If isPrebookRelated is true, prebook must be provided
				if (this.isPrebookRelated && !v) {
					return false;
				}
				return true;
			},
			message: 'Prebook ID is required when isPrebookRelated is true'
		}
	},
	
	// Status & Metadata
	isActive: {
		type: Boolean,
		default: true
	},
	
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Admin',
		required: true
	},
	
	createdAt: {
		type: Date,
		default: Date.now
	},
	
	updatedAt: {
		type: Date,
		default: Date.now
	}
}, {
	timestamps: true,
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
});

// Index for geospatial queries (if location is provided) - sparse index
bannerSchema.index({ 'locationPoints': '2dsphere' }, { sparse: true });
bannerSchema.index({ endDate: 1 });
bannerSchema.index({ isActive: 1 });
bannerSchema.index({ createdAt: -1 });

// Virtual to check if banner is expired
bannerSchema.virtual('isExpired').get(function() {
	return this.endDate < new Date();
});

// Pre-save middleware to update updatedAt
bannerSchema.pre('save', function(next) {
	this.updatedAt = Date.now();
	next();
});

// Static method to get active banners (not expired)
bannerSchema.statics.getActiveBanners = async function(filters = {}) {
	return await this.find({
		...filters,
		isActive: true,
		endDate: { $gte: new Date() }
	})
		.populate('hotel', 'restaurantName profileImage restaurantImage address')
		.populate('prebook', 'foodName foodImage basePrice discountPrice prebookStartDate prebookEndDate')
		.populate('createdBy', 'name email')
		.sort({ createdAt: -1 });
};

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
