const mongoose = require('mongoose');

/**
 * Review Schema
 * Represents user reviews and ratings for vendors
 */
const reviewSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor is required'],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer'
    }
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters'],
    default: null
  },
  orderId: {
    type: String,
    trim: true,
    default: null,
    description: 'Optional order ID reference'
  },
  isActive: {
    type: Boolean,
    default: true
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

// Compound index to prevent duplicate reviews from same user for same vendor
reviewSchema.index({ vendor: 1, user: 1 }, { unique: true });

// Indexes for better query performance
reviewSchema.index({ vendor: 1, isActive: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Pre-save middleware to update updatedAt
reviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Static method to calculate average rating for a vendor
 */
reviewSchema.statics.calculateAverageRating = async function(vendorId) {
  // Convert vendorId to ObjectId if it's a string
  const vendorObjectId = typeof vendorId === 'string' 
    ? new mongoose.Types.ObjectId(vendorId) 
    : vendorId;

  const result = await this.aggregate([
    {
      $match: {
        vendor: vendorObjectId,
        isActive: true
      }
    },
    {
      $group: {
        _id: '$vendor',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (result.length === 0) {
    return { averageRating: 0, reviewCount: 0 };
  }

  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
    reviewCount: result[0].reviewCount
  };
};

/**
 * Method to update vendor rating after review save/update/delete
 */
reviewSchema.post('save', async function() {
  if (this.vendor) {
    await this.constructor.updateVendorRating(this.vendor);
  }
});

reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.vendor) {
    await this.constructor.updateVendorRating(doc.vendor);
  }
});

reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.vendor) {
    await this.constructor.updateVendorRating(doc.vendor);
  }
});

/**
 * Static method to update vendor's average rating
 */
reviewSchema.statics.updateVendorRating = async function(vendorId) {
  const Vendor = mongoose.model('Vendor');
  const ratingData = await this.calculateAverageRating(vendorId);
  
  await Vendor.findByIdAndUpdate(vendorId, {
    averageRating: ratingData.averageRating,
    reviewCount: ratingData.reviewCount
  });
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

