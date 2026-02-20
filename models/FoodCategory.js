const mongoose = require('mongoose');

/**
 * Food Category Schema
 * Represents food categories with image, name, and optional description
 */
const foodCategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    index: true
  },
  image: {
    type: String,
    required: [true, 'Image is required'],
    trim: true
  },
  imageKitFileId: {
    type: String,
    trim: true,
    default: null,
    description: 'ImageKit file ID for uploaded images'
  },
  description: {
    type: String,
    trim: true,
    default: null
  },
  // Admin Reference - for categories created by admin
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
    index: true
  },
  // Vendor Reference - for categories created by vendor
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null,
    index: true
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

// Indexes for better query performance
foodCategorySchema.index({ isActive: 1 });
foodCategorySchema.index({ createdAt: -1 });

// Pre-save middleware to update updatedAt
foodCategorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const FoodCategory = mongoose.model('FoodCategory', foodCategorySchema);

module.exports = FoodCategory;

