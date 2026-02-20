const mongoose = require('mongoose');

/**
 * Operating Hours Schema
 * Represents the operating hours for each day of the week
 */
const operatingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    trim: true
  },
  openTime: {
    type: String,
    default: null,
    trim: true
    // Format: "HH:MM AM/PM" or "HH:MM"
  },
  closeTime: {
    type: String,
    default: null,
    trim: true
    // Format: "HH:MM AM/PM" or "HH:MM"
  },
  isClosed: {
    type: Boolean,
    default: false
  }
}, { _id: false });

/**
 * Address Schema
 * Represents the vendor's location details
 */
const addressSchema = new mongoose.Schema({
  fullAddress: {
    type: String,
    required: true,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length === 2 && 
                 typeof v[0] === 'number' && typeof v[1] === 'number' &&
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;    
        },
        message: 'Coordinates must be an array of [longitude, latitude] with valid ranges'
      }
    }
  }
}, { _id: false });

/**
 * Bank Account Schema
 * Represents bank account details for payments
 */
const bankAccountSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please provide a valid IFSC code']
  },
  accountType: {
    type: String,
    enum: ['Primary', 'Secondary'],
    default: 'Secondary'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

/**
 * Vendor Schema
 * Main schema for restaurant/vendor profiles
 */
const vendorSchema = new mongoose.Schema({
  // Personal Information
  ownerName: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  dialCode: {
    type: String,
    trim: true,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  // Restaurant Information
  restaurantName: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true
  },
  serviceOffered: {
    type: [String],
    required: true,
    enum: ['Dine in', 'Delivery', 'Takeaway', 'Pickup' , 'Car Dine in'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one service type must be provided'
    }
  },
  fssaiLicenseNumber: {
    type: String,
    required: [true, 'FSSAI license number is required'],
    trim: true,
    unique: true
  },
  gstNumber: {
    type: String,
    required: [true, 'GST number is required'],
    trim: true,
    unique: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please provide a valid GST number']
  },
  // Location Details
  address: {
    type: addressSchema,
    required: [true, 'Address is required']
  },
  // Operating Hours
  operatingHours: {
    type: [operatingHoursSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length === 7; 
      },
      message: 'Operating hours must be provided for all 7 days'
    }
  },
  // Bank & Payment Details
  bankAccounts: {
    type: [bankAccountSchema],
    default: [],
    validate: {
      validator: function(v) {
        // At least one primary account if bank accounts exist
        if (v && v.length > 0) {
          return v.some(account => account.accountType === 'Primary');
        }
        return true;
      },
      message: 'At least one primary bank account is required if bank accounts are provided'
    }
  },
  // Commission
  commissionRate: {
    type: Number,
    required: true,
    min: [0, 'Commission rate must be a positive number'],
    max: [100, 'Commission rate cannot exceed 100%'],
    default: 0
  },
  // GST
  gstPercentage: {
    type: Number,
    required: false,
    min: [0, 'GST percentage must be a positive number'],
    max: [100, 'GST percentage cannot exceed 100%'],
    default: 0
  },
  // Delivery Radius (in kilometers)
  deliveryRadius: {
    type: Number,
    required: false,
    min: [0, 'Delivery radius must be a positive number'],
    default: null,
    description: 'Maximum delivery distance in kilometers'
  },
  deviceOs: {
    type: String,
    trim: true,
    default: null
  },
  deviceName: {
    type: String,
    trim: true,
    default: null
  },
  firebaseTokens: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 2;
      },
      message: 'Maximum 2 firebase tokens allowed (2 active devices)'
    }
  },
  // Images
  profileImage: {
    type: String,
    trim: true,
    default: null
  },
  profileImageKitFileId: {
    type: String,
    trim: true,
    default: null,
    description: 'ImageKit file ID for profile image'
  },
  restaurantImage: {
    type: String,
    trim: true,
    default: null
  },
  restaurantImageKitFileId: {
    type: String,
    trim: true,
    default: null,
    description: 'ImageKit file ID for restaurant image'
  },
  // Rating & Reviews
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative']
  },
  // Branch Management
  branches: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    }],
    default: [],
    validate: {
      validator: function(v) {
        // Check for duplicate branch IDs
        return new Set(v.map(id => id.toString())).size === v.length;
      },
      message: 'Duplicate branch IDs are not allowed'
    }
  },
  // Status & Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedAt: {
    type: Date,
    default: null
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
// Note: email index is already created by 'unique: true' in schema
vendorSchema.index({ restaurantName: 1 });
vendorSchema.index({ 'address.city': 1 });
vendorSchema.index({ 'address.state': 1 });
vendorSchema.index({ isActive: 1 });
vendorSchema.index({ isVerified: 1 });
vendorSchema.index({ createdAt: -1 });
vendorSchema.index({ 'address.coordinates': '2dsphere' });

// Virtual for full address string
vendorSchema.virtual('fullAddressString').get(function() {
  if (!this.address || !this.address.fullAddress) {
    return '';
  }
  return `${this.address.fullAddress}, ${this.address.city}, ${this.address.state} - ${this.address.pincode}`;
});

// Method to get active operating hours
vendorSchema.methods.getActiveOperatingHours = function() {
  return this.operatingHours.filter(hour => !hour.isClosed);
};

// Method to check if vendor is open on a specific day
vendorSchema.methods.isOpenOnDay = function(dayName) {
  const day = this.operatingHours.find(hour => hour.day === dayName);
  return day && !day.isClosed && day.openTime && day.closeTime;
};

// Method to get primary bank account
vendorSchema.methods.getPrimaryBankAccount = function() {
  return this.bankAccounts.find(account => account.accountType === 'Primary' && account.isActive);
};

/**
 * Static method to find vendors near a specific location
 * @param {Number} longitude - User's longitude
 * @param {Number} latitude - User's latitude
 * @param {Number} maxDistance - Maximum distance in meters (default: 5000 = 5km)
 * @param {Object} additionalFilters - Additional query filters (e.g., { isActive: true })
 * @returns {Promise<Array>} Array of vendors sorted by distance
 */
vendorSchema.statics.findNearby = async function(longitude, latitude, maxDistance = 5000, additionalFilters = {}) {
  return await this.find({
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude] // GeoJSON format: [longitude, latitude]
        },
        $maxDistance: maxDistance // Distance in meters
      }
    },
    ...additionalFilters
  });
};

/**
 * Static method to find vendors within a radius using aggregation pipeline
 * Returns vendors with calculated distance
 * @param {Number} longitude - User's longitude
 * @param {Number} latitude - User's latitude
 * @param {Number} maxDistance - Maximum distance in meters (default: 5000 = 5km)
 * @param {Object} additionalFilters - Additional match filters
 * @returns {Promise<Array>} Array of vendors with distance field
 */
vendorSchema.statics.findNearbyWithDistance = async function(longitude, latitude, maxDistance = 5000, additionalFilters = {}) {
  return await this.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        distanceField: 'distance', // Distance will be in meters
        maxDistance: maxDistance,
        spherical: true,
        query: additionalFilters
      }
    },
    {
      $sort: { distance: 1 } // Sort by distance (nearest first)
    }
  ]);
};

// Pre-save middleware to update updatedAt
vendorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware to ensure operating hours has all 7 days
vendorSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('operatingHours')) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const existingDays = this.operatingHours.map(h => h.day);
    const missingDays = days.filter(day => !existingDays.includes(day));
    
    missingDays.forEach(day => {
      this.operatingHours.push({
        day,
        openTime: null,
        closeTime: null,
        isClosed: true
      });
    });
    
    // Sort by day order
    this.operatingHours.sort((a, b) => {
      return days.indexOf(a.day) - days.indexOf(b.day);
    });
  }
  next();
});

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
