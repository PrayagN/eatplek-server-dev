const mongoose = require('mongoose');
const { normalizeServiceType } = require('../utils/serviceType');

const SHARE_BASE_URL = (process.env.SHARE_BASE_URL || 'https://eatplek.com').replace(/\/$/, '');

const slugify = (text) => {
	if (!text) return 'food';
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace(/[\s\W-]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'food';
};

const generateSlugSuffix = () => Math.random().toString(36).slice(2, 8);

const buildShareLinkFromSlug = (slug) => `${SHARE_BASE_URL}/share/food/${slug}`;

/**
 * Add-on Schema
 * Represents customizations/add-ons for food items
 */
const addOnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Add-on name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Add-on price is required'],
    min: [0, 'Price must be a positive number']
  },
  image: {
    type: String,
    trim: true,
    default: null
  },
  imageKitFileId: {
    type: String,
    trim: true,
    default: null,
    description: 'ImageKit file ID for add-on image'
  }
}, { _id: true });

/**
 * Food Customization Schema
 * Represents customization options for food items (e.g., quarter, half, full)
 */
const customizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customization name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Customization price is required'],
    min: [0, 'Price must be a positive number']
  }
}, { _id: true });

/**
 * Day-based Offer Schema
 * Represents day-based offers for food items
 */
const dayOfferSchema = new mongoose.Schema({
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: ['percentage', 'fixed'],
    lowercase: true
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value must be a positive number'],
    validate: {
      validator: function(v) {
        if (this.discountType === 'percentage') {
          return v >= 0 && v <= 100;
        }
        return v > 0;
      },
      message: 'Percentage discount must be between 0-100, fixed discount must be greater than 0'
    }
  },
  activeDays: {
    type: [String],
    required: [true, 'At least one active day is required'],
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    validate: {
      validator: function(v) {
        return v && v.length > 0 && v.length <= 7;
      },
      message: 'At least one active day must be provided (maximum 7 days)'
    }
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    trim: true,
    // Format: "HH:MM AM/PM" or "HH:MM"
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?[AaPp][Mm])?$/, 'Please provide a valid time format (HH:MM or HH:MM AM/PM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    trim: true,
    // Format: "HH:MM AM/PM" or "HH:MM"
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?[AaPp][Mm])?$/, 'Please provide a valid time format (HH:MM or HH:MM AM/PM)'],
    validate: {
      validator: function(v) {
        // Basic validation - end time should be after start time
        // This is a simple check, more complex time comparison would require parsing
        return true;
      },
      message: 'End time must be after start time'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

/**
 * Food Schema
 * Represents food items in the restaurant menu
 */
const foodSchema = new mongoose.Schema({
  // Basic Information
  foodName: {
    type: String,
    required: [true, 'Food name is required'],
    trim: true,
    index: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodCategory',
    required: [true, 'Category is required']
  },
  type: {
    type: String,
    required: [true, 'Food type is required'],
    enum: ['veg', 'non-veg'],
    lowercase: true,
    index: true
  },
  foodImage: {
    type: String,
    required: [true, 'Food image is required'],
    trim: true
  },
  imageKitFileId: {
    type: String,
    trim: true,
    default: null,
    description: 'ImageKit file ID for food image'
  },
  description: {
    type: String,
    trim: true,
    default: null
  },
  
  // Pricing & Availability
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Base price must be a positive number']
  },
  discountPrice: {
    type: Number,
    default: null,
    min: [0, 'Discount price must be a positive number'],
    validate: {
      validator: function(v) {
        if (v === null) return true;
        return v < this.basePrice;
      },
      message: 'Discount price must be less than base price'
    }
  },
  preparationTime: {
    type: Number,
    default: null,
    min: [0, 'Preparation time must be a positive number'],
    description: 'Preparation time in minutes'
  },
  packingCharges: {
    type: Number,
    default: 0,
    min: [0, 'Packing charges must be a positive number']
  },
  
  // Order Types & Availability
  orderTypes: {
    type: [String],
    required: [true, 'At least one order type is required'],
    enum: ['Dine in', 'Delivery', 'Takeaway', 'Pickup', 'Car Dine in'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one order type must be provided'
    }
  },
  
  // Customizations / Add-ons
  addOns: {
    type: [addOnSchema],
    default: []
  },
  
  // Food Customizations (e.g., quarter, half, full)
  customizations: {
    type: [customizationSchema],
    default: []
  },
  
  // Day-based Offers
  dayOffers: {
    type: [dayOfferSchema],
    default: []
  },
  shareLink: {
    type: String,
    trim: true,
    default: function () {
      if (!this._id) return null;
      return buildShareLink(this._id.toString());
    }
  },
  
  // Vendor Reference
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor is required'],
    index: true
  },
  
  // Prebook Information
  isPrebook: {
    type: Boolean,
    default: false,
    index: true
  },
  prebookStartDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(v) {
        // If isPrebook is true, prebookStartDate is required
        if (this.isPrebook && !v) {
          return false;
        }
        // If both dates are provided, start date should be before end date
        if (this.isPrebook && this.prebookEndDate && v && this.prebookEndDate) {
          return v < this.prebookEndDate;
        }
        return true;
      },
      message: 'Prebook start date is required when isPrebook is true, and must be before end date'
    }
  },
  prebookEndDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(v) {
        // If isPrebook is true, prebookEndDate is required
        if (this.isPrebook && !v) {
          return false;
        }
        return true;
      },
      message: 'Prebook end date is required when isPrebook is true'
    }
  },
  
  // Status & Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true
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

// Indexes for better query performance
foodSchema.index({ category: 1 });
foodSchema.index({ vendor: 1, isActive: 1 });
foodSchema.index({ type: 1, isActive: 1 });
foodSchema.index({ isPrebook: 1, isActive: 1 });
foodSchema.index({ prebookStartDate: 1, prebookEndDate: 1 });
foodSchema.index({ createdAt: -1 });

// Virtual for effective price (discount price if available, else base price)
foodSchema.virtual('effectivePrice').get(function() {
  return this.discountPrice !== null ? this.discountPrice : this.basePrice;
});

// Virtual for discount percentage
foodSchema.virtual('discountPercentage').get(function() {
  if (this.discountPrice === null || this.discountPrice >= this.basePrice) {
    return 0;
  }
  return Math.round(((this.basePrice - this.discountPrice) / this.basePrice) * 100);
});

// Pre-save middleware to normalize orderTypes and ensure share slug/link
foodSchema.pre('save', async function(next) {
  try {
    if (this.orderTypes && Array.isArray(this.orderTypes)) {
      this.orderTypes = this.orderTypes.map(type => {
        const normalized = normalizeServiceType(type);
        return normalized || type; // Keep original if normalization fails
      });
    }

    if (!this.shareSlug && this.foodName) {
      const base = slugify(this.foodName);
      let candidate = base;
      let counter = 0;

      while (await this.constructor.exists({ _id: { $ne: this._id }, shareSlug: candidate })) {
        counter += 1;
        candidate = `${base}-${generateSlugSuffix()}${counter}`;
      }

      this.shareSlug = candidate;
    }

    if (!this.shareLink && this.shareSlug) {
      this.shareLink = buildShareLinkFromSlug(this.shareSlug);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update updatedAt
foodSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware to ensure discount price is valid
foodSchema.pre('save', function(next) {
  if (this.discountPrice !== null && this.discountPrice >= this.basePrice) {
    this.discountPrice = null;
  }
  next();
});

/**
 * Method to get active day offer for a specific day and time
 * @param {String} day - Day of the week (Sunday, Monday, etc.)
 * @param {String} currentTime - Current time in HH:MM or HH:MM AM/PM format
 * @returns {Object|null} Active offer object or null
 */
foodSchema.methods.getActiveDayOffer = function(day, currentTime) {
  if (!this.dayOffers || this.dayOffers.length === 0) {
    return null;
  }

  // Find offers that are active, include the day, and time is within range
  const activeOffers = this.dayOffers.filter(offer => {
    if (!offer.isActive) return false;
    if (!offer.activeDays.includes(day)) return false;
    
    // Simple time comparison (can be enhanced with proper time parsing)
    // For now, we'll return the first matching offer
    // In production, you'd want to parse and compare times properly
    return true;
  });

  return activeOffers.length > 0 ? activeOffers[0] : null;
};

/**
 * Method to calculate price with day offer applied
 * @param {String} day - Day of the week (optional)
 * @param {String} currentTime - Current time (optional)
 * @returns {Number} Final price after applying applicable discounts
 */
foodSchema.methods.getPriceWithOffers = function(day = null, currentTime = null) {
  let price = this.basePrice;

  // First apply static discount price if available
  if (this.discountPrice !== null && this.discountPrice < price) {
    price = this.discountPrice;
  }

  // Then apply day offer if day and time are provided
  if (day && currentTime) {
    const dayOffer = this.getActiveDayOffer(day, currentTime);
    if (dayOffer) {
      if (dayOffer.discountType === 'percentage') {
        price = price * (1 - dayOffer.discountValue / 100);
      } else if (dayOffer.discountType === 'fixed') {
        price = Math.max(0, price - dayOffer.discountValue);
      }
    }
  }

  return Math.round(price * 100) / 100; // Round to 2 decimal places
};

const Food = mongoose.model('Food', foodSchema);

module.exports = Food;

