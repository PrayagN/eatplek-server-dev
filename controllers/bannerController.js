const { validationResult } = require('express-validator');
const Banner = require('../models/Banner');
const Vendor = require('../models/Vendor');
const Food = require('../models/Food');

class BannerController {
	/**
	 * Create a new banner
	 * POST /api/banners
	 */
	async createBanner(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

		const {
			bannerImage,
			bannerImageKitFileId,
			hotelId,
			endDate,
			isPrebookRelated,
			prebookId
		} = req.body;
			
		// Convert isPrebookRelated to boolean (handles both string and boolean from form-data)
		const isPrebookRelatedBool = isPrebookRelated === 'true' || isPrebookRelated === true;
		
		// Validate that either file was uploaded or bannerImage URL was provided
		if (!bannerImage) {
			return res.status(400).json({
				success: false,
				message: 'Banner image is required. Please upload an image file.'
			});
		}

		// Auto-assign vendor ID if user is a vendor
		let finalHotelId = hotelId;
		if (req.user.role === 'vendor') {
			// Get vendor ID from token
			let vendorId = null;
			if (req.user.vendorId) {
				vendorId = req.user.vendorId.toString();
			} else if (req.user.id) {
				// Fallback: try to find vendor by email if vendorId not in token
				if (req.user.email) {
					const vendorByEmail = await Vendor.findOne({ email: req.user.email });
					if (vendorByEmail) {
						vendorId = vendorByEmail._id.toString();
					}
				}
				// If still no vendorId, use req.user.id as fallback
				if (!vendorId) {
					vendorId = req.user.id.toString();
				}
			}
			
			if (vendorId) {
				finalHotelId = vendorId;
			} else {
				return res.status(403).json({
					success: false,
					message: 'Unable to identify vendor. Please contact support.'
				});
			}
		}

		// Validate hotel ID is required when isPrebookRelated is true
		if (isPrebookRelatedBool && !finalHotelId) {
			return res.status(400).json({
				success: false,
				message: 'Hotel ID is required when isPrebookRelated is true'
			});
		}

		let vendorCoordinates = null;
		// Validate hotel if provided and get vendor coordinates
		if (finalHotelId) {
			const hotel = await Vendor.findById(finalHotelId);
			if (!hotel) {
				return res.status(404).json({
					success: false,
					message: 'Hotel not found'
				});
			}
			
			// Get vendor's coordinates
			if (hotel.location && hotel.location.coordinates && hotel.location.coordinates.length === 2) {
				vendorCoordinates = hotel.location.coordinates; // [longitude, latitude]
			}
		}

			// Validate prebook if isPrebookRelated is true
			if (isPrebookRelatedBool) {
				if (!prebookId) {
					return res.status(400).json({
						success: false,
						message: 'Prebook ID is required when isPrebookRelated is true'
					});
				}

				const prebook = await Food.findById(prebookId);
				if (!prebook) {
					return res.status(404).json({
						success: false,
						message: 'Prebook food not found'
					});
				}

				if (!prebook.isPrebook) {
					return res.status(400).json({
						success: false,
						message: 'The selected food item is not a prebook'
					});
				}
			}

		// Prepare banner data
		const bannerData = {
			bannerImage,
			bannerImageKitFileId: bannerImageKitFileId || null,
			hotel: finalHotelId || null,
			endDate: new Date(endDate),
			isPrebookRelated: isPrebookRelatedBool,
			prebook: isPrebookRelatedBool ? prebookId : null,
			createdBy: req.user.id,
			isActive: true
		};

			// Add vendor coordinates to banner if available
			if (vendorCoordinates) {
				bannerData.locationPoints = {
					type: 'Point',
					coordinates: vendorCoordinates
				};
			}

			const banner = await Banner.create(bannerData);

			// Populate references for response
			await banner.populate([
				{ path: 'hotel', select: 'restaurantName profileImage restaurantImage address' },
				{ path: 'prebook', select: 'foodName foodImage basePrice discountPrice prebookStartDate prebookEndDate' },
				{ path: 'createdBy', select: 'name email' }
			]);

			return res.status(201).json({
				success: true,
				message: 'Banner created successfully',
				data: banner
			});
		} catch (error) {
			console.error('Error creating banner:', error);
			return res.status(500).json({
				success: false,
				message: 'Error creating banner',
				error: error.message
			});
		}
	}

	/**
	 * Get all banners
	 * GET /api/banners
	 */
	async getAllBanners(req, res) {
		try {
			const {
				page = 1,
				limit = 20,
				isActive,
				isPrebookRelated,
				includeExpired
			} = req.query;

			const pageNum = parseInt(page);
			const limitNum = parseInt(limit);
			const skip = (pageNum - 1) * limitNum;

			// Build filter
			const filter = {};
			
			if (isActive !== undefined) {
				filter.isActive = isActive === 'true';
			}

			if (isPrebookRelated !== undefined) {
				filter.isPrebookRelated = isPrebookRelated === 'true';
			}

			// Exclude expired banners by default
			if (includeExpired !== 'true') {
				filter.endDate = { $gte: new Date() };
			}

			const [banners, totalCount] = await Promise.all([
				Banner.find(filter)
					.populate('hotel', 'restaurantName profileImage restaurantImage address')
					.populate('prebook', 'foodName foodImage basePrice discountPrice prebookStartDate prebookEndDate')
					.populate('createdBy', 'name email')
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(limitNum)
					.lean(),
				Banner.countDocuments(filter)
			]);

			const totalPages = Math.ceil(totalCount / limitNum);

			return res.json({
				success: true,
				message: 'Banners retrieved successfully',
				data: {
					banners,
					pagination: {
						currentPage: pageNum,
						totalPages,
						totalCount,
						limit: limitNum,
						hasNextPage: pageNum < totalPages,
						hasPrevPage: pageNum > 1
					}
				}
			});
		} catch (error) {
			console.error('Error getting banners:', error);
			return res.status(500).json({
				success: false,
				message: 'Error retrieving banners',
				error: error.message
			});
		}
	}

	/**
	 * Get banner by ID
	 * GET /api/banners/:id
	 */
	async getBannerById(req, res) {
		try {
			const { id } = req.params;

			const banner = await Banner.findById(id)
				.populate('hotel', 'restaurantName profileImage restaurantImage address')
				.populate('prebook', 'foodName foodImage basePrice discountPrice prebookStartDate prebookEndDate')
				.populate('createdBy', 'name email')
				.lean();

			if (!banner) {
				return res.status(404).json({
					success: false,
					message: 'Banner not found'
				});
			}

			return res.json({
				success: true,
				message: 'Banner retrieved successfully',
				data: banner
			});
		} catch (error) {
			console.error('Error getting banner:', error);
			return res.status(500).json({
				success: false,
				message: 'Error retrieving banner',
				error: error.message
			});
		}
	}

	/**
	 * Update banner
	 * PUT /api/banners/:id
	 */
	async updateBanner(req, res) {
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
		const {
			bannerImage,
			bannerImageKitFileId,
			hotelId,
			endDate,
			isPrebookRelated,
			prebookId,
			isActive
		} = req.body;
			
		// Convert isPrebookRelated to boolean if provided (handles both string and boolean)
		const isPrebookRelatedBool = isPrebookRelated !== undefined 
			? (isPrebookRelated === 'true' || isPrebookRelated === true)
			: undefined;

		const banner = await Banner.findById(id);
		if (!banner) {
			return res.status(404).json({
				success: false,
				message: 'Banner not found'
			});
		}

		// Auto-assign vendor ID if user is a vendor (and prevent them from changing it)
		let finalHotelId = hotelId;
		if (req.user.role === 'vendor') {
			// Get vendor ID from token
			let vendorId = null;
			if (req.user.vendorId) {
				vendorId = req.user.vendorId.toString();
			} else if (req.user.id) {
				// Fallback: try to find vendor by email if vendorId not in token
				if (req.user.email) {
					const vendorByEmail = await Vendor.findOne({ email: req.user.email });
					if (vendorByEmail) {
						vendorId = vendorByEmail._id.toString();
					}
				}
				// If still no vendorId, use req.user.id as fallback
				if (!vendorId) {
					vendorId = req.user.id.toString();
				}
			}
			
			if (vendorId) {
				// Check if vendor owns this banner
				if (banner.hotel && banner.hotel.toString() !== vendorId) {
					return res.status(403).json({
						success: false,
						message: 'You can only update your own banners'
					});
				}
				// Auto-assign vendor ID (ignore hotelId from request if provided)
				finalHotelId = vendorId;
			} else {
				return res.status(403).json({
					success: false,
					message: 'Unable to identify vendor. Please contact support.'
				});
			}
		}

		// Validate hotel ID is required when isPrebookRelated is being updated to true
		const newIsPrebookRelated = isPrebookRelatedBool !== undefined ? isPrebookRelatedBool : banner.isPrebookRelated;
		const hotelIdToUse = finalHotelId !== undefined ? finalHotelId : (hotelId !== undefined ? hotelId : banner.hotel);
		if (newIsPrebookRelated && !hotelIdToUse) {
			return res.status(400).json({
				success: false,
				message: 'Hotel ID is required when isPrebookRelated is true'
			});
		}

		let vendorCoordinates = null;
		// Validate hotel if provided and get vendor coordinates
		if (finalHotelId !== undefined) {
			// Use finalHotelId (auto-assigned for vendors or provided by admin)
			if (finalHotelId) {
				const hotel = await Vendor.findById(finalHotelId);
				if (!hotel) {
					return res.status(404).json({
						success: false,
						message: 'Hotel not found'
					});
				}
				
				// Get vendor's coordinates
				if (hotel.location && hotel.location.coordinates && hotel.location.coordinates.length === 2) {
					vendorCoordinates = hotel.location.coordinates; // [longitude, latitude]
				}
			}
			banner.hotel = finalHotelId || null;
		} else if (hotelId !== undefined) {
			// Admin/super_admin can change hotelId
			if (hotelId) {
				const hotel = await Vendor.findById(hotelId);
				if (!hotel) {
					return res.status(404).json({
						success: false,
						message: 'Hotel not found'
					});
				}
				
				// Get vendor's coordinates
				if (hotel.location && hotel.location.coordinates && hotel.location.coordinates.length === 2) {
					vendorCoordinates = hotel.location.coordinates; // [longitude, latitude]
				}
			}
			banner.hotel = hotelId || null;
		} else if (banner.hotel) {
			// If hotelId is not provided but banner already has a hotel, get its coordinates
			const hotel = await Vendor.findById(banner.hotel);
			if (hotel && hotel.location && hotel.location.coordinates && hotel.location.coordinates.length === 2) {
				vendorCoordinates = hotel.location.coordinates; // [longitude, latitude]
			}
		}

			// Validate prebook if isPrebookRelated is being updated to true
			if (newIsPrebookRelated) {
				const newPrebookId = prebookId !== undefined ? prebookId : banner.prebook;
				if (!newPrebookId) {
					return res.status(400).json({
						success: false,
						message: 'Prebook ID is required when isPrebookRelated is true'
					});
				}

				const prebook = await Food.findById(newPrebookId);
				if (!prebook) {
					return res.status(404).json({
						success: false,
						message: 'Prebook food not found'
					});
				}

				if (!prebook.isPrebook) {
					return res.status(400).json({
						success: false,
						message: 'The selected food item is not a prebook'
					});
				}
			}

			// Update fields
			if (bannerImage !== undefined) banner.bannerImage = bannerImage;
			if (bannerImageKitFileId !== undefined) banner.bannerImageKitFileId = bannerImageKitFileId || null;
			if (endDate !== undefined) banner.endDate = new Date(endDate);
			if (isPrebookRelatedBool !== undefined) banner.isPrebookRelated = isPrebookRelatedBool;
			if (isPrebookRelatedBool !== undefined) {
				banner.prebook = isPrebookRelatedBool ? (prebookId || banner.prebook) : null;
			} else if (prebookId !== undefined) {
				banner.prebook = prebookId || null;
			}
			if (isActive !== undefined) banner.isActive = isActive;

			// Update location with vendor coordinates if available, otherwise remove location
			if (vendorCoordinates) {
				banner.locationPoints = {
					type: 'Point',
					coordinates: vendorCoordinates
				};
			} else {
				banner.locationPoints = undefined;
			}

			await banner.save();

			// Populate references for response
			await banner.populate([
				{ path: 'hotel', select: 'restaurantName profileImage restaurantImage address' },
				{ path: 'prebook', select: 'foodName foodImage basePrice discountPrice prebookStartDate prebookEndDate' },
				{ path: 'createdBy', select: 'name email' }
			]);

			return res.json({
				success: true,
				message: 'Banner updated successfully',
				data: banner
			});
		} catch (error) {
			console.error('Error updating banner:', error);
			return res.status(500).json({
				success: false,
				message: 'Error updating banner',
				error: error.message
			});
		}
	}

	/**
	 * Delete banner
	 * DELETE /api/banners/:id
	 */
	async deleteBanner(req, res) {
		try {
			const { id } = req.params;

			const banner = await Banner.findById(id);
			if (!banner) {
				return res.status(404).json({
					success: false,
					message: 'Banner not found'
				});
			}

			// Check if vendor is trying to delete their own banner
			if (req.user.role === 'vendor') {
				let vendorId = null;
				if (req.user.vendorId) {
					vendorId = req.user.vendorId.toString();
				} else if (req.user.id) {
					if (req.user.email) {
						const vendorByEmail = await Vendor.findOne({ email: req.user.email });
						if (vendorByEmail) {
							vendorId = vendorByEmail._id.toString();
						}
					}
					if (!vendorId) {
						vendorId = req.user.id.toString();
					}
				}

				if (vendorId && banner.hotel && banner.hotel.toString() !== vendorId) {
					return res.status(403).json({
						success: false,
						message: 'You can only delete your own banners'
					});
				}
			}

			await Banner.deleteOne({ _id: id });

			return res.json({
				success: true,
				message: 'Banner deleted successfully'
			});
		} catch (error) {
			console.error('Error deleting banner:', error);
			return res.status(500).json({
				success: false,
				message: 'Error deleting banner',
				error: error.message
			});
		}
	}
}

const controller = new BannerController();

module.exports = {
	createBanner: controller.createBanner.bind(controller),
	getAllBanners: controller.getAllBanners.bind(controller),
	getBannerById: controller.getBannerById.bind(controller),
	updateBanner: controller.updateBanner.bind(controller),
	deleteBanner: controller.deleteBanner.bind(controller)
};
