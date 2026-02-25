const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Food = require('../models/Food');
const Vendor = require('../models/Vendor');
const Coupon = require('../models/Coupon');
const { calculateFoodPricing } = require('../utils/offerPricing');
const { normalizeServiceType } = require('../utils/serviceType');

// Service types that require packing charges
const PACKING_CHARGE_SERVICE_TYPES = ['Takeaway', 'Delivery'];

class CartController {

	buildSelectionSignature(foodId, customizations = [], addOns = [], options = {}) {
		const { ignoreCustomizationQuantity = false, ignoreAddOnQuantity = false } = options;

		const customizationIds = customizations
			.map((c) => {
				if (typeof c === 'string') return `${c}:1`;
				if (c?.customizationId) {
					const qty = ignoreCustomizationQuantity ? 1 : c.quantity || 1;
					return `${c.customizationId.toString()}:${qty}`;
				}
				return null;
			})
			.filter(Boolean)
			.sort();

		const addOnIds = addOns
			.map((addOn) => {
				if (typeof addOn === 'string') {
					return `${addOn}:1`;
				}
				if (addOn?.addOnId) {
					const qty = ignoreAddOnQuantity ? 1 : addOn.quantity || 1;
					return `${addOn.addOnId.toString()}:${qty}`;
				}
				return null;
			})
			.filter(Boolean)
			.sort();

		return `${foodId}|${customizationIds.join(',')}|${addOnIds.join(',')}`;
	}

	calculateCustomizationPrice(customizations = []) {
		return (customizations || []).reduce(
			(sum, customization) => sum + customization.price * (customization.quantity || 1),
			0
		);
	}

	updateCartItemTotals(item) {
		if (!item) return;
		const addOnOrderTotal = (item.addOns || []).reduce(
			(sum, addOn) => sum + addOn.price * (addOn.quantity || 1),
			0
		);
		const customizationUnitTotal = item.usesCustomizationPrice
			? 0
			: this.calculateCustomizationPrice(item.customizations);
		const packingCharge = item.packingCharge || 0;
		const baseUnitTotal = (item.effectivePrice || 0) + customizationUnitTotal + packingCharge;
		const quantity = item.quantity || 0;
		item.itemTotal = baseUnitTotal * quantity + addOnOrderTotal;
	}

	isCustomizationRemovalRequest(customizationInputs) {
		if (!Array.isArray(customizationInputs)) {
			return false;
		}
		if (customizationInputs.length === 0) {
			return true;
		}
		return customizationInputs.every((input) => {
			if (!input || typeof input !== 'object') {
				return false;
			}

			if (input.quantity === undefined || input.quantity === null) {
				return false;
			}
			const qty = Number(input.quantity);
			return Number.isFinite(qty) && qty === 0;
		});
	}

	getFoodId(foodRef) {
		if (!foodRef) return null;
		if (typeof foodRef === 'string') return foodRef;
		if (foodRef instanceof mongoose.Types.ObjectId) return foodRef.toString();
		if (foodRef._id) return foodRef._id.toString();
		return foodRef.toString();
	}

	getVendorId(vendorRef) {
		if (!vendorRef) return null;
		if (typeof vendorRef === 'string') return vendorRef;
		if (vendorRef instanceof mongoose.Types.ObjectId) return vendorRef.toString();
		if (vendorRef._id) return vendorRef._id.toString();
		return vendorRef.toString();
	}

	/**
	 * Get the actual cart for a user (returns connected cart if exists, otherwise user's own cart)
	 * @param {string} userId - User ID
	 * @returns {Promise<Cart|null>} - The cart object or null
	 */
	async getActualCart(userId) {
		try {
			let userCart = await Cart.findOne({ user: userId });

			if (!userCart) {
				return null;
			}

			// If user has a connected cart, return that cart instead
			if (userCart.connectedCart) {
				const connectedCart = await Cart.findById(userCart.connectedCart)
					.populate('vendor', 'restaurantName profileImage address serviceOffered gstPercentage')
					.populate('items.food', 'foodName foodImage type');
				// Note: Don't populate 'user' - we only need the user ID, not the full user object

				if (!connectedCart) {
					// Connected cart doesn't exist, disconnect
					userCart.connectedCart = null;
					await userCart.save();
					return null;
				}

				return connectedCart;
			}

			// Check if user's own cart has items, if not return null
			if (!userCart.items || userCart.items.length === 0) {
				return null;
			}

			// Return user's own cart (has items)
			return await Cart.findById(userCart._id)
				.populate('vendor', 'restaurantName profileImage address serviceOffered gstPercentage')
				.populate('items.food', 'foodName foodImage type');
		} catch (error) {
			console.error('Error getting actual cart:', error);
			return null;
		}
	}

	/**
	 * Get or create user's own cart (not connected cart)
	 * @param {string} userId - User ID
	 * @returns {Promise<Cart>} - The user's own cart
	 */
	async getOrCreateUserCart(userId) {
		let userCart = await Cart.findOne({ user: userId });

		if (!userCart) {
			// User doesn't have a cart yet, but we need one to connect
			// This shouldn't normally happen, but handle it gracefully
			throw new Error('User cart not found. Please create a cart first.');
		}

		return userCart;
	}

	/**
	 * Get the cart that operations should be performed on (connected cart if exists, otherwise user's own cart)
	 * @param {string} userId - User ID
	 * @returns {Promise<Cart|null>} - The cart to work with, or null if user has no cart
	 */
	async getWorkingCart(userId) {
		const userCart = await Cart.findOne({ user: userId });

		if (!userCart) {
			return null;
		}

		// If user has a connected cart, return that cart (the actual cart object, not the reference)
		if (userCart.connectedCart) {
			const connectedCart = await Cart.findById(userCart.connectedCart)
				.populate('vendor', 'restaurantName profileImage address serviceOffered gstPercentage')
				.populate('items.food', 'foodName foodImage type');

			if (!connectedCart) {
				// Connected cart doesn't exist, disconnect
				userCart.connectedCart = null;
				await userCart.save();
				// Return user's own cart (might be empty)
				return userCart;
			}
			return connectedCart;
		}

		// Return user's own cart (populate if needed for operations)
		return await Cart.findById(userCart._id)
			.populate('vendor', 'restaurantName profileImage address serviceOffered gstPercentage')
			.populate('items.food', 'foodName foodImage type');
	}

	formatCartResponse(cart) {
		if (!cart) {
			return {
				id: null,
				cartCode: null,
				user: null,
				items: [],
				vendor: null,
				serviceType: null,
				isPrebookCart: false,
				couponCode: null,
				totals: {
					subTotal: 0,
					addOnTotal: 0,
					customizationTotal: 0,
					packingChargeTotal: 0,
					discountTotal: 0,
					couponDiscount: 0,
					taxAmount: 0,
					taxPercentage: 0,
					grandTotal: 0,
					itemCount: 0
				},
				lastUpdatedAt: null
			};
		}

		const totals = cart.totals || {};
		const isPrebookCart = Boolean(cart.isPrebookCart || (cart.items || []).some((item) => item.isPrebook));
		const gstPercentage = cart.gstPercentage ?? cart.vendor?.gstPercentage ?? 0;

		// Handle user field - can be ObjectId or populated object
		const userId = cart.user?._id?.toString() || cart.user?.toString() || null;

		return {
			id: cart._id?.toString(),
			cartCode: cart.cartCode || null,
			user: userId,
			serviceType: normalizeServiceType(cart.serviceType) || cart.serviceType, // Normalize to standard format
			isPrebookCart,
			vendor: cart.vendor
				? {
					id: (cart.vendor._id || cart.vendor.id)?.toString(),
					name: cart.vendor.restaurantName,
					profileImage: cart.vendor.profileImage || null,
					place: cart.vendor.address?.city || null,
					gstPercentage: cart.vendor.gstPercentage ?? gstPercentage
				}
				: null,
			items: cart.items.map((item) => ({
				id: item._id?.toString(),
				foodId: item.food?._id?.toString() || item.food?.toString() || null,
				foodName: item.foodName,
				foodImage: item.foodImage,
				foodType: item.foodType,
				quantity: item.quantity,
				basePrice: item.basePrice,
				discountPrice: item.discountPrice,
				effectivePrice: item.effectivePrice,
				customizations: item.customizations,
				addOns: item.addOns,
				isPrebook: Boolean(item.isPrebook),
				packingCharge: item.packingCharge || 0,
				itemTotal: item.itemTotal,
				notes: item.notes
			})),
			couponCode: cart.couponCode || null,
			totals: {
				subTotal: totals.subTotal ?? 0,
				addOnTotal: totals.addOnTotal ?? 0,
				customizationTotal: totals.customizationTotal ?? 0,
				packingChargeTotal: totals.packingChargeTotal ?? 0,
				discountTotal: totals.discountTotal ?? 0,
				couponDiscount: totals.couponDiscount ?? 0,
				taxAmount: totals.taxAmount ?? 0,
				taxPercentage: totals.taxPercentage ?? gstPercentage,
				grandTotal: totals.grandTotal ?? ((totals.subTotal ?? 0) + (totals.taxAmount ?? 0)),
				itemCount: totals.itemCount ?? cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
			},
			lastUpdatedAt: cart.lastUpdatedAt || cart.updatedAt || cart.createdAt || null
		};
	}

	async getCart(req, res) {
		try {
			// Get the actual cart (connected cart if exists, otherwise user's own cart)
			// getActualCart already handles returning null if cart is empty and not connected
			let cart = await this.getActualCart(req.user.id);

			// If no cart, clean up any empty cart records
			if (!cart) {
				const userCart = await Cart.findOne({ user: req.user.id });
				if (userCart && !userCart.connectedCart && (!userCart.items || userCart.items.length === 0)) {
					// Delete empty cart record
					await Cart.deleteOne({ _id: userCart._id });
				}
				return res.json({
					success: true,
					message: 'Cart retrieved successfully',
					data: this.formatCartResponse(null)
				});
			}

			// Cart exists - update GST if needed
			if (cart) {
				const vendorGst = cart.vendor?.gstPercentage ?? 0;
				const storedGst = cart.gstPercentage ?? 0;
				if (vendorGst !== storedGst) {
					cart.gstPercentage = vendorGst;
					await cart.save();
					cart = await Cart.findById(cart._id)
						.populate('vendor', 'restaurantName profileImage address serviceOffered gstPercentage')
						.populate('items.food', 'foodName foodImage type');
				}
			}

			return res.json({
				success: true,
				message: 'Cart retrieved successfully',
				data: this.formatCartResponse(cart)
			});
		} catch (error) {
			console.error('Error fetching cart:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to fetch cart',
				error: error.message
			});
		}
	}

	// async addItem(req, res) {
	// 	try {
	// 		const errors = validationResult(req);
	// 		if (!errors.isEmpty()) {
	// 			return res.status(400).json({
	// 				success: false,
	// 				message: 'Validation failed',
	// 				errors: errors.array()
	// 			});
	// 		}

	// 		const userId = req.user.id;
	// 		const {
	// 			foodId,
	// 			quantity = true,
	// 			serviceType,
	// 			customizations = [],
	// 			addOns = [],
	// 			notes
	// 		} = req.body;

	// 		const hasCustomizationsInput = Object.prototype.hasOwnProperty.call(req.body, 'customizations');

	// 		let quantityDelta;
	// 		let isIncrementOperation = true;
	// 		let isRemoveOperation = false;
	// 		let isSetQuantityOperation = false;
	// 		let targetQuantity = null;

	// 		if (typeof quantity === 'boolean') {
	// 			// Boolean: true = increment by 1, false = decrement by 1
	// 			quantityDelta = quantity ? 1 : -1;
	// 			isIncrementOperation = quantity;
	// 		} else {
	// 			const parsedQuantity = Number(quantity);
	// 			if (!Number.isFinite(parsedQuantity)) {
	// 				return res.status(400).json({
	// 					success: false,
	// 					message: 'Quantity must be boolean, 0, or a positive number'
	// 				});
	// 			}
	// 			if (parsedQuantity === 0) {
	// 				// quantity = 0 means remove item
	// 				isRemoveOperation = true;
	// 				quantityDelta = 0;
	// 			} else if (parsedQuantity < 0) {
	// 				return res.status(400).json({
	// 					success: false,
	// 					message: 'Quantity cannot be negative. Use 0 to remove item.'
	// 				});
	// 			} else {
	// 				// Number > 0: SET quantity to this value (not add)
	// 				targetQuantity = Math.floor(parsedQuantity);
	// 				isSetQuantityOperation = true;
	// 				quantityDelta = targetQuantity; // Keep for backward compatibility in calculations
	// 			}
	// 		}

	// 		const normalizedServiceType = normalizeServiceType(serviceType);
	// 		if (!normalizedServiceType) {
	// 			return res.status(400).json({
	// 				success: false,
	// 				message: 'Invalid serviceType. Allowed values: Dine in, Delivery, Takeaway, Pickup, Car Dine in'
	// 			});
	// 		}

	// 		const food = await Food.findOne({ _id: foodId, isActive: true }).lean();
	// 		if (!food) {
	// 			return res.status(404).json({
	// 				success: false,
	// 				message: 'Food item not found'
	// 			});
	// 		}

	// 		// Normalize food's orderTypes to handle old format values in database
	// 		const normalizedOrderTypes = (food.orderTypes || []).map(type => normalizeServiceType(type) || type);
	// 		if (!normalizedOrderTypes.includes(normalizedServiceType)) {
	// 			return res.status(400).json({
	// 				success: false,
	// 				message: `Food item is not available for ${normalizedServiceType}`
	// 			});
	// 		}

	// 		const isPrebookFood = Boolean(food.isPrebook);
	// 		const vendorDoc = await Vendor.findById(food.vendor).select('gstPercentage');
	// 		if (!vendorDoc) {
	// 			return res.status(404).json({
	// 				success: false,
	// 				message: 'Vendor associated with this food item was not found'
	// 			});
	// 		}
	// 		const vendorGstPercentage = Number(vendorDoc.gstPercentage) || 0;

	// 		// Get the working cart (connected cart if exists, otherwise user's own cart)
	// 		let cart = await this.getWorkingCart(userId);

	// 		// Check if user has a cart record (to determine if they're connected)
	// 		const userCart = await Cart.findOne({ user: userId });

	// 		// If user has a cart record but getWorkingCart returned null
	// 		if (userCart && !cart) {
	// 			if (userCart.connectedCart) {
	// 				// User is connected but connected cart doesn't exist or is invalid
	// 				return res.status(400).json({
	// 					success: false,
	// 					message: 'Connected cart is invalid. Please disconnect and reconnect to a cart.'
	// 				});
	// 			}
	// 			// User has an empty cart - allow creating new one below
	// 		}

	// 		// Get vendor IDs for comparison (handle both populated and non-populated vendor)
	// 		const cartVendorId = cart ? this.getVendorId(cart.vendor) : null;
	// 		const foodVendorId = this.getVendorId(food.vendor);

	// 		if (cart && cartVendorId && cartVendorId !== foodVendorId) {
	// 			return res.status(409).json({
	// 				success: false,
	// 				message: 'Cart contains items from another vendor. Please clear cart to switch vendors.'
	// 			});
	// 		}

	// 		// Normalize cart's serviceType for comparison (handles old format in database)
	// 		const cartServiceTypeNormalized = cart ? normalizeServiceType(cart.serviceType) || cart.serviceType : null;
	// 		if (cart && cartServiceTypeNormalized !== normalizedServiceType) {
	// 			return res.status(409).json({
	// 				success: false,
	// 				message: 'You cannot mix different service types in one cart'
	// 			});
	// 		}

	// 		const cartHasPrebook = cart?.items?.some((item) => item.isPrebook) || false;
	// 		const cartHasRegular = cart?.items?.some((item) => !item.isPrebook) || false;

	// 		if (cart) {
	// 			if (isPrebookFood && cartHasRegular) {
	// 				return res.status(400).json({
	// 					success: false,
	// 					message: 'Cart already contains regular items. Remove them before adding a prebook item.'
	// 				});
	// 			}
	// 			if (!isPrebookFood && cartHasPrebook) {
	// 				return res.status(400).json({
	// 					success: false,
	// 					message: 'Cart already contains a prebook item. Remove it before adding regular items.'
	// 				});
	// 			}
	// 		}

	// 		const foodHasCustomizations = Array.isArray(food.customizations) && food.customizations.length > 0;
	// 		const customizationInputs = Array.isArray(customizations) ? customizations : [];
	// 		const customizationRemovalRequested =
	// 			hasCustomizationsInput && this.isCustomizationRemovalRequest(customizationInputs);

	// 		if (foodHasCustomizations && !customizationRemovalRequested) {
	// 			if (customizationInputs.length === 0) {
	// 				return res.status(400).json({
	// 					success: false,
	// 					message: 'This food requires selecting at least one customization option.'
	// 				});
	// 			}

	// 			const customizationInputMissingDetails = customizationInputs.some((input) => {
	// 				if (!input || typeof input !== 'object') {
	// 					return true;
	// 				}

	// 				const hasId = Boolean(input.customizationId || input.id);
	// 				const hasQuantity = input.quantity !== undefined && input.quantity !== null;
	// 				return !hasId || !hasQuantity;
	// 			});

	// 			if (customizationInputMissingDetails) {
	// 				return res.status(400).json({
	// 					success: false,
	// 					message: 'Customization id and quantity are required for this food.'
	// 				});
	// 			}
	// 		}

	// 		const resolvedCustomizations = customizationInputs.map((customizationInput) => {
	// 			const customizationId =
	// 				typeof customizationInput === 'string'
	// 					? customizationInput
	// 					: customizationInput?.customizationId || customizationInput?.id || null;
	// 			if (!mongoose.Types.ObjectId.isValid(customizationId)) {
	// 				return null;
	// 			}
	// 			const customization = food.customizations?.find((c) => c._id.toString() === customizationId);
	// 			if (!customization) {
	// 				return null;
	// 			}
	// 			const rawQuantity =
	// 				typeof customizationInput === 'object' &&
	// 					customizationInput !== null &&
	// 					customizationInput.quantity !== undefined
	// 					? Number(customizationInput.quantity)
	// 					: 1;
	// 			const customizationQuantity =
	// 				Number.isFinite(rawQuantity) && rawQuantity >= 0 ? Math.floor(rawQuantity) : 1;
	// 			return {
	// 				customizationId: customization._id,
	// 				name: customization.name,
	// 				price: customization.price,
	// 				quantity: customizationQuantity
	// 			};
	// 		});

	// 		if (resolvedCustomizations.some((entry) => entry === null)) {
	// 			return res.status(400).json({
	// 				success: false,
	// 				message: 'Invalid customization selected'
	// 			});
	// 		}
	// 		const filteredCustomizations = resolvedCustomizations.filter((entry) => entry && entry.quantity > 0);
	// 		const customizationSignaturePayload = customizationRemovalRequested
	// 			? resolvedCustomizations.filter(Boolean)
	// 			: filteredCustomizations;

	// 		if (foodHasCustomizations && filteredCustomizations.length === 0 && !customizationRemovalRequested) {
	// 			return res.status(400).json({
	// 				success: false,
	// 				message: 'Valid customization selection is required for this food.'
	// 			});
	// 		}

	// 		const resolvedAddOns = (addOns || []).map((addOnInput) => {
	// 			const addOnId =
	// 				typeof addOnInput === 'string'
	// 					? addOnInput
	// 					: addOnInput?.addOnId || addOnInput?.id || null;

	// 			if (!mongoose.Types.ObjectId.isValid(addOnId)) {
	// 				return null;
	// 			}

	// 			const addOn = food.addOns?.find((a) => a._id.toString() === addOnId);
	// 			if (!addOn) {
	// 				return null;
	// 			}

	// 			const rawQuantity =
	// 				typeof addOnInput === 'object' && addOnInput !== null && addOnInput.quantity !== undefined
	// 					? Number(addOnInput.quantity)
	// 					: 1;
	// 			const sanitizedQuantity =
	// 				Number.isFinite(rawQuantity) && rawQuantity >= 0 ? Math.floor(rawQuantity) : 1;

	// 			return {
	// 				addOnId: addOn._id,
	// 				name: addOn.name,
	// 				price: addOn.price,
	// 				quantity: sanitizedQuantity
	// 			};
	// 		});

	// 		if (resolvedAddOns.some((entry) => entry === null)) {
	// 			return res.status(400).json({
	// 				success: false,
	// 				message: 'Invalid add-on selected'
	// 			});
	// 		}
	// 		const addOnsMarkedForRemoval = resolvedAddOns.filter((entry) => entry && entry.quantity === 0);
	// 		const filteredAddOns = resolvedAddOns.filter((entry) => entry && entry.quantity > 0);
	// 		const hasAddOnRemovals = addOnsMarkedForRemoval.length > 0;
	// 		const hasAddOnAdditions = filteredAddOns.length > 0;
	// 		let addOnsModified = false;

	// 		// Calculate pricing with current date/time for day offers
	// 		const pricing = calculateFoodPricing(food, { currentDate: new Date() });

	// 		const customizationUnitBase = this.calculateCustomizationPrice(filteredCustomizations);
	// 		const usesCustomizationPrice = foodHasCustomizations;
	// 		const effectivePrice = usesCustomizationPrice ? customizationUnitBase : pricing.finalPrice;
	// 		const normalizedDiscountPrice = usesCustomizationPrice ? null : pricing.discountPrice;

	// 		const addOnOrderTotal = filteredAddOns.reduce(
	// 			(sum, addOn) => sum + addOn.price * (addOn.quantity || 1),
	// 			0
	// 		);
	// 		const customizationUnitTotal = usesCustomizationPrice ? 0 : customizationUnitBase;

	// 		// Calculate packing charge based on service type
	// 		// Packing charges apply only for 'take away' and 'delivery'
	// 		const packingChargePerUnit = PACKING_CHARGE_SERVICE_TYPES.includes(normalizedServiceType)
	// 			? (food.packingCharges || 0)
	// 			: 0;

	// 		const absoluteQuantity = Math.abs(quantityDelta);
	// 		// For new items: use targetQuantity if set, otherwise use absoluteQuantity
	// 		const quantityForNewItem = isSetQuantityOperation ? targetQuantity : (usesCustomizationPrice ? 1 : absoluteQuantity);

	// 		if (!cart) {
	// 			// Check if user is connected before creating a new cart
	// 			if (userCart && userCart.connectedCart) {
	// 				return res.status(400).json({
	// 					success: false,
	// 					message: 'Cannot add items. You are connected to a cart, but the connected cart was not found. Please disconnect and reconnect.'
	// 				});
	// 			}

	// 			// Create a new cart only if user is not connected
	// 			cart = new Cart({
	// 				user: userId,
	// 				vendor: food.vendor,
	// 				serviceType: normalizedServiceType,
	// 				isPrebookCart: isPrebookFood,
	// 				gstPercentage: vendorGstPercentage,
	// 				items: [],
	// 				totals: {}
	// 			});
	// 		} else {
	// 			cart.gstPercentage = vendorGstPercentage;
	// 		}

	// 		const selectionSignatureOptions = {
	// 			ignoreCustomizationQuantity: foodHasCustomizations,
	// 			ignoreAddOnQuantity: true
	// 		};

	// 		const selectionSignature = this.buildSelectionSignature(
	// 			foodId,
	// 			customizationSignaturePayload,
	// 			filteredAddOns,
	// 			selectionSignatureOptions
	// 		);

	// 		// First, try to find exact match (same food, customizations, and addOns)
	// 		// This is for incrementing quantity of the exact same item
	// 		let existingItem = cart.items.find((item) => {
	// 			const signature = this.buildSelectionSignature(
	// 				this.getFoodId(item.food),
	// 				item.customizations,
	// 				item.addOns,
	// 				{
	// 					ignoreCustomizationQuantity: Boolean(item.usesCustomizationPrice),
	// 					ignoreAddOnQuantity: true
	// 				}
	// 			);
	// 			return signature === selectionSignature;
	// 		});

	// 		// If no exact match found, find item with same foodId only
	// 		// This allows merging customizations/addOns into existing items when same food is added multiple times
	// 		if (!existingItem && cart.items.length > 0) {
	// 			existingItem = cart.items.find((item) => {
	// 				const currentItemFoodId = this.getFoodId(item.food);
	// 				// Simply match by foodId - we'll merge customizations and addOns below
	// 				return currentItemFoodId.toString() === foodId.toString();
	// 			});
	// 		}

	// 		if (!existingItem && hasAddOnRemovals) {
	// 			existingItem = cart.items.find((item) => {
	// 				const currentItemFoodId = this.getFoodId(item.food);
	// 				if (currentItemFoodId.toString() !== foodId.toString()) {
	// 					return false;
	// 				}
	// 				const itemAddOnIds = (item.addOns || []).map((addOn) => addOn.addOnId?.toString() || addOn.addOnId);
	// 				return addOnsMarkedForRemoval.some((entry) => itemAddOnIds.includes(entry.addOnId.toString()));
	// 			});
	// 		}

	// 		if (hasAddOnRemovals) {
	// 			if (!existingItem) {
	// 				return res.status(404).json({
	// 					success: false,
	// 					message: 'Cannot remove add-ons. Cart item not found.'
	// 				});
	// 			}
	// 			const removalIds = new Set(addOnsMarkedForRemoval.map((entry) => entry.addOnId.toString()));
	// 			const existingAddOnsList = existingItem.addOns || [];
	// 			const filteredExistingAddOns = existingAddOnsList.filter(
	// 				(addOn) => !removalIds.has(addOn.addOnId?.toString() || addOn.addOnId)
	// 			);
	// 			if (filteredExistingAddOns.length === existingAddOnsList.length) {
	// 				return res.status(404).json({
	// 					success: false,
	// 					message: 'Cannot remove add-ons. Selected add-ons were not found in cart item.'
	// 				});
	// 			}
	// 			existingItem.addOns = filteredExistingAddOns;
	// 			addOnsModified = true;
	// 		}

	// 		if (isPrebookFood && cart) {
	// 			const otherPrebookItem = cart.items.find(
	// 				(item) =>
	// 					item.isPrebook &&
	// 					(!existingItem || item._id.toString() !== existingItem._id?.toString())
	// 			);
	// 			if (otherPrebookItem) {
	// 				return res.status(400).json({
	// 					success: false,
	// 					message: 'Only one prebook item can exist in the cart at a time. Remove the existing prebook item to add another.'
	// 				});
	// 			}
	// 		}

	// 		if (customizationRemovalRequested) {
	// 			if (!existingItem) {
	// 				return res.status(404).json({
	// 					success: false,
	// 					message: 'Cannot remove customization. Cart item not found.'
	// 				});
	// 			}

	// 			// Remove only the requested customizations (quantity = 0)
	// 			const customizationsMarkedForRemoval = resolvedCustomizations.filter(
	// 				(entry) => entry && entry.quantity === 0
	// 			);

	// 			if (customizationsMarkedForRemoval.length > 0) {
	// 				const removalIds = new Set(
	// 					customizationsMarkedForRemoval.map((entry) => entry.customizationId.toString())
	// 				);
	// 				const existingList = existingItem.customizations || [];
	// 				const filteredExisting = existingList.filter(
	// 					(custom) =>
	// 						!removalIds.has(
	// 							(custom.customizationId?.toString && custom.customizationId.toString()) ||
	// 							custom.customizationId
	// 						)
	// 				);

	// 				// If nothing changed, customization wasn't found on the item
	// 				if (filteredExisting.length === existingList.length) {
	// 					return res.status(404).json({
	// 						success: false,
	// 						message: 'Cannot remove customization. Selected customization was not found in cart item.'
	// 					});
	// 				}

	// 				existingItem.customizations = filteredExisting;

	// 				// If no customizations remain and item pricing depends on customizations,
	// 				// remove the entire item from cart
	// 				if ((existingItem.customizations || []).length === 0 && existingItem.usesCustomizationPrice) {
	// 					cart.items = cart.items.filter(
	// 						(item) => item._id.toString() !== existingItem._id.toString()
	// 					);
	// 				} else {
	// 					// Recalculate totals for the updated item
	// 					if (existingItem.usesCustomizationPrice) {
	// 						const mergedCustomizationPrice = this.calculateCustomizationPrice(
	// 							existingItem.customizations || []
	// 						);
	// 						existingItem.effectivePrice = mergedCustomizationPrice;
	// 					}
	// 					this.updateCartItemTotals(existingItem);
	// 				}
	// 			}
	// 		}

	// 		// Handle remove operation (quantity = 0)
	// 		if (isRemoveOperation) {
	// 			if (!existingItem) {
	// 				return res.status(404).json({
	// 					success: false,
	// 					message: 'Cannot remove. Cart item not found.'
	// 				});
	// 			}
	// 			cart.items = cart.items.filter((item) => item._id.toString() !== existingItem._id.toString());
	// 		} else {
	// 			let customizationHandled = false;

	// 			if (existingItem && usesCustomizationPrice) {
	// 				customizationHandled = true;

	// 				// Merge customizations instead of replacing
	// 				let customizationsForItem = existingItem.customizations || [];
	// 				if (hasCustomizationsInput) {
	// 					const customizationMap = new Map();

	// 					// Add existing customizations to map
	// 					customizationsForItem.forEach(custom => {
	// 						const customId = custom.customizationId?.toString() || custom.customizationId;
	// 						if (customId) {
	// 							customizationMap.set(customId, {
	// 								customizationId: custom.customizationId,
	// 								name: custom.name,
	// 								price: custom.price,
	// 								quantity: custom.quantity || 1
	// 							});
	// 						}
	// 					});

	// 					// Merge new customizations into map
	// 					filteredCustomizations.forEach(custom => {
	// 						const customId = custom.customizationId?.toString() || custom.customizationId;
	// 						if (customId) {
	// 							const existing = customizationMap.get(customId);
	// 							if (existing) {
	// 								// Same customization ID: update quantity (replace, not add)
	// 								existing.quantity = custom.quantity || 1;
	// 							} else {
	// 								// New customization: add it
	// 								customizationMap.set(customId, {
	// 									customizationId: custom.customizationId,
	// 									name: custom.name,
	// 									price: custom.price,
	// 									quantity: custom.quantity || 1
	// 								});
	// 							}
	// 						}
	// 					});

	// 					customizationsForItem = Array.from(customizationMap.values());
	// 				}

	// 				// Merge addOns instead of replacing
	// 				let addOnsForItem = existingItem.addOns || [];
	// 				if (hasAddOnAdditions) {
	// 					const addOnMap = new Map();

	// 					// Add existing addOns to map
	// 					addOnsForItem.forEach(addOn => {
	// 						const addOnId = addOn.addOnId?.toString() || addOn.addOnId;
	// 						if (addOnId) {
	// 							addOnMap.set(addOnId, {
	// 								addOnId: addOn.addOnId,
	// 								name: addOn.name,
	// 								price: addOn.price,
	// 								quantity: addOn.quantity || 1
	// 							});
	// 						}
	// 					});

	// 					// Merge new addOns into map
	// 					filteredAddOns.forEach(addOn => {
	// 						const addOnId = addOn.addOnId?.toString() || addOn.addOnId;
	// 						if (addOnId) {
	// 							const existing = addOnMap.get(addOnId);
	// 							if (existing) {
	// 								// Same addOn ID: add quantities
	// 								existing.quantity = (existing.quantity || 1) + (addOn.quantity || 1);
	// 							} else {
	// 								// New addOn: add it
	// 								addOnMap.set(addOnId, {
	// 									addOnId: addOn.addOnId,
	// 									name: addOn.name,
	// 									price: addOn.price,
	// 									quantity: addOn.quantity || 1
	// 								});
	// 							}
	// 						}
	// 					});

	// 					addOnsForItem = Array.from(addOnMap.values());
	// 					addOnsModified = true;
	// 				}

	// 				existingItem.customizations = customizationsForItem;
	// 				existingItem.addOns = addOnsForItem;
	// 				existingItem.quantity = 1;
	// 				existingItem.usesCustomizationPrice = true;
	// 				existingItem.discountPrice = null;
	// 				existingItem.packingCharge = packingChargePerUnit;
	// 				existingItem.isPrebook = isPrebookFood;

	// 				const customizationPrice = this.calculateCustomizationPrice(customizationsForItem);
	// 				existingItem.effectivePrice = customizationPrice;
	// 				this.updateCartItemTotals(existingItem);
	// 			}

	// 			if (!customizationHandled) {
	// 				if (!existingItem && !isIncrementOperation && !isSetQuantityOperation) {
	// 					return res.status(404).json({
	// 						success: false,
	// 						message: 'Cannot decrement. Cart item not found.'
	// 					});
	// 				}

	// 				if (existingItem) {
	// 					if (hasCustomizationsInput) {
	// 						// Always merge customizations: add new customizations to existing ones
	// 						// If same customization ID exists, update quantity; otherwise add new customization
	// 						const existingCustomizations = existingItem.customizations || [];
	// 						const customizationMap = new Map();

	// 						// Add existing customizations to map
	// 						existingCustomizations.forEach(custom => {
	// 							const customId = custom.customizationId?.toString() || custom.customizationId;
	// 							if (customId) {
	// 								customizationMap.set(customId, {
	// 									customizationId: custom.customizationId,
	// 									name: custom.name,
	// 									price: custom.price,
	// 									quantity: custom.quantity || 1
	// 								});
	// 							}
	// 						});

	// 						// Merge new customizations into map
	// 						filteredCustomizations.forEach(custom => {
	// 							const customId = custom.customizationId?.toString() || custom.customizationId;
	// 							if (customId) {
	// 								const existing = customizationMap.get(customId);
	// 								if (existing) {
	// 									// Same customization ID: update quantity (replace, not add)
	// 									existing.quantity = custom.quantity || 1;
	// 								} else {
	// 									// New customization: add it
	// 									customizationMap.set(customId, {
	// 										customizationId: custom.customizationId,
	// 										name: custom.name,
	// 										price: custom.price,
	// 										quantity: custom.quantity || 1
	// 									});
	// 								}
	// 							}
	// 						});

	// 						const mergedCustomizations = Array.from(customizationMap.values());
	// 						existingItem.customizations = mergedCustomizations;

	// 						// Recalculate effectivePrice if item uses customization price
	// 						if (existingItem.usesCustomizationPrice) {
	// 							const mergedCustomizationPrice = this.calculateCustomizationPrice(mergedCustomizations);
	// 							existingItem.effectivePrice = mergedCustomizationPrice;
	// 						}
	// 					}
	// 					if (hasAddOnAdditions) {
	// 						// Merge addOns: if existing item has no addOns, use the new ones
	// 						// If both have addOns, merge by addOnId (add quantities if same addOn, otherwise add new)
	// 						const existingAddOns = existingItem.addOns || [];
	// 						if (existingAddOns.length === 0) {
	// 							// Existing item has no addOns, use the new ones
	// 							existingItem.addOns = filteredAddOns;
	// 							addOnsModified = true;
	// 						} else {
	// 							// Merge addOns: combine existing and new, summing quantities for same addOnId
	// 							const addOnMap = new Map();

	// 							// Add existing addOns to map
	// 							existingAddOns.forEach(addOn => {
	// 								const addOnId = addOn.addOnId?.toString() || addOn.addOnId;
	// 								if (addOnId) {
	// 									addOnMap.set(addOnId, {
	// 										addOnId: addOn.addOnId,
	// 										name: addOn.name,
	// 										price: addOn.price,
	// 										quantity: addOn.quantity || 1
	// 									});
	// 								}
	// 							});

	// 							// Merge new addOns into map
	// 							filteredAddOns.forEach(addOn => {
	// 								const addOnId = addOn.addOnId?.toString() || addOn.addOnId;
	// 								if (addOnId) {
	// 									const existing = addOnMap.get(addOnId);
	// 									if (existing) {
	// 										// Add quantities if same addOn
	// 										existing.quantity = (existing.quantity || 1) + (addOn.quantity || 1);
	// 									} else {
	// 										// Add new addOn
	// 										addOnMap.set(addOnId, {
	// 											addOnId: addOn.addOnId,
	// 											name: addOn.name,
	// 											price: addOn.price,
	// 											quantity: addOn.quantity || 1
	// 										});
	// 									}
	// 								}
	// 							});

	// 							existingItem.addOns = Array.from(addOnMap.values());
	// 							addOnsModified = true;
	// 						}
	// 					}
	// 					existingItem.packingCharge = packingChargePerUnit;
	// 					if (!addOnsModified) {
	// 						this.updateCartItemTotals(existingItem);
	// 					}
	// 				}

	// 				if (existingItem && isSetQuantityOperation) {
	// 					// SET quantity to target value
	// 					existingItem.quantity = targetQuantity;
	// 					existingItem.isPrebook = isPrebookFood;
	// 					this.updateCartItemTotals(existingItem);
	// 				} else if (existingItem && isIncrementOperation) {
	// 					// Increment operation (boolean true or increment by 1)
	// 					existingItem.quantity += 1;
	// 					existingItem.isPrebook = isPrebookFood;
	// 					this.updateCartItemTotals(existingItem);
	// 				} else if (existingItem && !isIncrementOperation) {
	// 					// Decrement operation (boolean false)
	// 					existingItem.quantity = Math.max(0, existingItem.quantity - 1);
	// 					existingItem.isPrebook = isPrebookFood;
	// 					if (existingItem.quantity === 0) {
	// 						cart.items = cart.items.filter((item) => item._id.toString() !== existingItem._id.toString());
	// 					} else {
	// 						this.updateCartItemTotals(existingItem);
	// 					}
	// 				} else if (existingItem) {
	// 					// Increment operation (boolean true)
	// 					existingItem.quantity += 1;
	// 					existingItem.isPrebook = isPrebookFood;
	// 					this.updateCartItemTotals(existingItem);
	// 				} else {
	// 					// New item - use targetQuantity if set, otherwise use absoluteQuantity (for boolean operations)
	// 					const initialQuantity = isSetQuantityOperation ? targetQuantity : (usesCustomizationPrice ? 1 : absoluteQuantity);
	// 					const newItem = {
	// 						food: food._id,
	// 						foodName: food.foodName,
	// 						foodImage: food.foodImage,
	// 						foodType: food.type,
	// 						quantity: initialQuantity,
	// 						basePrice: food.basePrice,
	// 						discountPrice: normalizedDiscountPrice,
	// 						effectivePrice,
	// 						usesCustomizationPrice,
	// 						customizations: filteredCustomizations,
	// 						addOns: filteredAddOns,
	// 						isPrebook: isPrebookFood,
	// 						packingCharge: packingChargePerUnit,
	// 						notes: notes?.trim() || null
	// 					};
	// 					this.updateCartItemTotals(newItem);
	// 					cart.items.push(newItem);
	// 				}
	// 			}

	// 			if (existingItem && cart.items.includes(existingItem)) {
	// 				this.updateCartItemTotals(existingItem);
	// 			}
	// 		}

	// 		if (cart.items.length === 0) {
	// 			// If this is a connected cart, disconnect all users before deleting
	// 			if (cart.connectedUsers && cart.connectedUsers.length > 0) {
	// 				await Cart.updateMany(
	// 					{ connectedCart: cart._id },
	// 					{ $unset: { connectedCart: 1 } }
	// 				);
	// 			}
	// 			await Cart.deleteOne({ _id: cart._id });
	// 			return res.json({
	// 				success: true,
	// 				message: 'Cart cleared after decrement',
	// 				data: this.formatCartResponse(null)
	// 			});
	// 		}

	// 		cart.isPrebookCart = cart.items.some((item) => item.isPrebook);

	// 		// Revalidate coupon if present when cart totals change
	// 		if (cart.couponCode) {
	// 			const orderAmount = cart.totals?.grandTotal || cart.totals?.subTotal || 0;
	// 			const vendorId = this.getVendorId(cart.vendor);
	// 			const validation = await Coupon.validateCoupon(
	// 				cart.couponCode,
	// 				req.user.id,
	// 				orderAmount,
	// 				vendorId
	// 			);

	// 			if (!validation.valid) {
	// 				// Remove invalid coupon
	// 				cart.couponCode = null;
	// 				cart.couponDiscount = 0;
	// 				cart.totals.couponDiscount = 0;
	// 			} else {
	// 				// Recalculate coupon discount with new totals
	// 				cart.couponDiscount = validation.discount;
	// 			}
	// 		}

	// 		await cart.save();

	// 		await cart.populate([
	// 			{ path: 'vendor', select: 'restaurantName profileImage address serviceOffered' },
	// 			{ path: 'items.food', select: 'foodName foodImage type' }
	// 		]);

	// 		return res.status(201).json({
	// 			success: true,
	// 			message: 'Item added to cart successfully',
	// 			data: this.formatCartResponse(cart)
	// 		});
	// 	} catch (error) {
	// 		console.error('Error adding item to cart:', error);
	// 		return res.status(500).json({
	// 			success: false,
	// 			message: 'Failed to add item to cart',
	// 			error: error.message
	// 		});
	// 	}
	// }
	async addItem(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

			const userId = req.user.id;
			const {
				foodId,
				quantity = true,
				serviceType,
				customizations = [],
				addOns = [],
				notes
			} = req.body;

			const hasCustomizationsInput = Object.prototype.hasOwnProperty.call(req.body, 'customizations');
			const hasAddOnsInput = Object.prototype.hasOwnProperty.call(req.body, 'addOns');
			// updateAddOns flag: only needed when user is explicitly editing add-ons on an existing cart item
			const updateAddOns = req.body.updateAddOns === true;

			let quantityDelta;
			let isIncrementOperation = true;
			let isRemoveOperation = false;
			let isSetQuantityOperation = false;
			let targetQuantity = null;

			if (typeof quantity === 'boolean') {
				// Boolean: true = increment by 1, false = decrement by 1
				quantityDelta = quantity ? 1 : -1;
				isIncrementOperation = quantity;
			} else {
				const parsedQuantity = Number(quantity);
				if (!Number.isFinite(parsedQuantity)) {
					return res.status(400).json({
						success: false,
						message: 'Quantity must be boolean, 0, or a positive number'
					});
				}
				if (parsedQuantity === 0) {
					// quantity = 0 means remove item
					isRemoveOperation = true;
					quantityDelta = 0;
				} else if (parsedQuantity < 0) {
					return res.status(400).json({
						success: false,
						message: 'Quantity cannot be negative. Use 0 to remove item.'
					});
				} else {
					// Number > 0: SET quantity to this value (not add)
					targetQuantity = Math.floor(parsedQuantity);
					isSetQuantityOperation = true;
					quantityDelta = targetQuantity;
				}
			}

			const normalizedServiceType = normalizeServiceType(serviceType);
			if (!normalizedServiceType) {
				return res.status(400).json({
					success: false,
					message: 'Invalid serviceType. Allowed values: Dine in, Delivery, Takeaway, Pickup, Car Dine in'
				});
			}

			const food = await Food.findOne({ _id: foodId, isActive: true }).lean();
			if (!food) {
				return res.status(404).json({
					success: false,
					message: 'Food item not found'
				});
			}

			// Normalize food's orderTypes to handle old format values in database
			const normalizedOrderTypes = (food.orderTypes || []).map(type => normalizeServiceType(type) || type);
			if (!normalizedOrderTypes.includes(normalizedServiceType)) {
				return res.status(400).json({
					success: false,
					message: `Food item is not available for ${normalizedServiceType}`
				});
			}

			const isPrebookFood = Boolean(food.isPrebook);
			const vendorDoc = await Vendor.findById(food.vendor).select('gstPercentage');
			if (!vendorDoc) {
				return res.status(404).json({
					success: false,
					message: 'Vendor associated with this food item was not found'
				});
			}
			const vendorGstPercentage = Number(vendorDoc.gstPercentage) || 0;

			// Get the working cart (connected cart if exists, otherwise user's own cart)
			let cart = await this.getWorkingCart(userId);

			// Check if user has a cart record (to determine if they're connected)
			const userCart = await Cart.findOne({ user: userId });

			// If user has a cart record but getWorkingCart returned null
			if (userCart && !cart) {
				if (userCart.connectedCart) {
					return res.status(400).json({
						success: false,
						message: 'Connected cart is invalid. Please disconnect and reconnect to a cart.'
					});
				}
				// User has an empty cart - allow creating new one below
			}

			// Get vendor IDs for comparison (handle both populated and non-populated vendor)
			const cartVendorId = cart ? this.getVendorId(cart.vendor) : null;
			const foodVendorId = this.getVendorId(food.vendor);

			if (cart && cartVendorId && cartVendorId !== foodVendorId) {
				return res.status(409).json({
					success: false,
					message: 'Cart contains items from another vendor. Please clear cart to switch vendors.'
				});
			}

			// Normalize cart's serviceType for comparison (handles old format in database)
			const cartServiceTypeNormalized = cart ? normalizeServiceType(cart.serviceType) || cart.serviceType : null;
			if (cart && cartServiceTypeNormalized !== normalizedServiceType) {
				return res.status(409).json({
					success: false,
					message: 'You cannot mix different service types in one cart'
				});
			}

			const cartHasPrebook = cart?.items?.some((item) => item.isPrebook) || false;
			const cartHasRegular = cart?.items?.some((item) => !item.isPrebook) || false;

			if (cart) {
				if (isPrebookFood && cartHasRegular) {
					return res.status(400).json({
						success: false,
						message: 'Cart already contains regular items. Remove them before adding a prebook item.'
					});
				}
				if (!isPrebookFood && cartHasPrebook) {
					return res.status(400).json({
						success: false,
						message: 'Cart already contains a prebook item. Remove it before adding regular items.'
					});
				}
			}

			const foodHasCustomizations = Array.isArray(food.customizations) && food.customizations.length > 0;
			const customizationInputs = Array.isArray(customizations) ? customizations : [];
			const customizationRemovalRequested =
				hasCustomizationsInput && this.isCustomizationRemovalRequest(customizationInputs);

			if (foodHasCustomizations && !customizationRemovalRequested) {
				if (customizationInputs.length === 0) {
					return res.status(400).json({
						success: false,
						message: 'This food requires selecting at least one customization option.'
					});
				}

				const customizationInputMissingDetails = customizationInputs.some((input) => {
					if (!input || typeof input !== 'object') {
						return true;
					}
					const hasId = Boolean(input.customizationId || input.id);
					const hasQuantity = input.quantity !== undefined && input.quantity !== null;
					return !hasId || !hasQuantity;
				});

				if (customizationInputMissingDetails) {
					return res.status(400).json({
						success: false,
						message: 'Customization id and quantity are required for this food.'
					});
				}
			}

			const resolvedCustomizations = customizationInputs.map((customizationInput) => {
				const customizationId =
					typeof customizationInput === 'string'
						? customizationInput
						: customizationInput?.customizationId || customizationInput?.id || null;
				if (!mongoose.Types.ObjectId.isValid(customizationId)) {
					return null;
				}
				const customization = food.customizations?.find((c) => c._id.toString() === customizationId);
				if (!customization) {
					return null;
				}
				const rawQuantity =
					typeof customizationInput === 'object' &&
						customizationInput !== null &&
						customizationInput.quantity !== undefined
						? Number(customizationInput.quantity)
						: 1;
				const customizationQuantity =
					Number.isFinite(rawQuantity) && rawQuantity >= 0 ? Math.floor(rawQuantity) : 1;
				return {
					customizationId: customization._id,
					name: customization.name,
					price: customization.price,
					quantity: customizationQuantity
				};
			});

			if (resolvedCustomizations.some((entry) => entry === null)) {
				return res.status(400).json({
					success: false,
					message: 'Invalid customization selected'
				});
			}

			const filteredCustomizations = resolvedCustomizations.filter((entry) => entry && entry.quantity > 0);
			const customizationSignaturePayload = customizationRemovalRequested
				? resolvedCustomizations.filter(Boolean)
				: filteredCustomizations;

			if (foodHasCustomizations && filteredCustomizations.length === 0 && !customizationRemovalRequested) {
				return res.status(400).json({
					success: false,
					message: 'Valid customization selection is required for this food.'
				});
			}

			// Resolve addOns from the request (always resolve since frontend always sends addOns array)
			const resolvedAddOns = (addOns || []).map((addOnInput) => {
				const addOnId =
					typeof addOnInput === 'string'
						? addOnInput
						: addOnInput?.addOnId || addOnInput?.id || null;

				if (!mongoose.Types.ObjectId.isValid(addOnId)) {
					return null;
				}

				const addOn = food.addOns?.find((a) => a._id.toString() === addOnId);
				if (!addOn) {
					return null;
				}

				const rawQuantity =
					typeof addOnInput === 'object' && addOnInput !== null && addOnInput.quantity !== undefined
						? Number(addOnInput.quantity)
						: 1;
				const sanitizedQuantity =
					Number.isFinite(rawQuantity) && rawQuantity >= 0 ? Math.floor(rawQuantity) : 1;

				return {
					addOnId: addOn._id,
					name: addOn.name,
					price: addOn.price,
					quantity: sanitizedQuantity
				};
			});

			if (resolvedAddOns.some((entry) => entry === null)) {
				return res.status(400).json({
					success: false,
					message: 'Invalid add-on selected'
				});
			}

			const addOnsMarkedForRemoval = resolvedAddOns.filter((entry) => entry && entry.quantity === 0);
			const filteredAddOns = resolvedAddOns.filter((entry) => entry && entry.quantity > 0);

			// Calculate pricing with current date/time for day offers
			const pricing = calculateFoodPricing(food, { currentDate: new Date() });

			const customizationUnitBase = this.calculateCustomizationPrice(filteredCustomizations);
			const usesCustomizationPrice = foodHasCustomizations;
			const effectivePrice = usesCustomizationPrice ? customizationUnitBase : pricing.finalPrice;
			const normalizedDiscountPrice = usesCustomizationPrice ? null : pricing.discountPrice;

			// Calculate packing charge based on service type
			// Packing charges apply only for 'take away' and 'delivery'
			const packingChargePerUnit = PACKING_CHARGE_SERVICE_TYPES.includes(normalizedServiceType)
				? (food.packingCharges || 0)
				: 0;

			const absoluteQuantity = Math.abs(quantityDelta);

			if (!cart) {
				// Check if user is connected before creating a new cart
				if (userCart && userCart.connectedCart) {
					return res.status(400).json({
						success: false,
						message: 'Cannot add items. You are connected to a cart, but the connected cart was not found. Please disconnect and reconnect.'
					});
				}

				// Create a new cart only if user is not connected
				cart = new Cart({
					user: userId,
					vendor: food.vendor,
					serviceType: normalizedServiceType,
					isPrebookCart: isPrebookFood,
					gstPercentage: vendorGstPercentage,
					items: [],
					totals: {}
				});
			} else {
				cart.gstPercentage = vendorGstPercentage;
			}

			const selectionSignatureOptions = {
				ignoreCustomizationQuantity: foodHasCustomizations,
				ignoreAddOnQuantity: true
			};

			const selectionSignature = this.buildSelectionSignature(
				foodId,
				customizationSignaturePayload,
				filteredAddOns,
				selectionSignatureOptions
			);

			// First, try to find exact match (same food, customizations, and addOns)
			let existingItem = cart.items.find((item) => {
				const signature = this.buildSelectionSignature(
					this.getFoodId(item.food),
					item.customizations,
					item.addOns,
					{
						ignoreCustomizationQuantity: Boolean(item.usesCustomizationPrice),
						ignoreAddOnQuantity: true
					}
				);
				return signature === selectionSignature;
			});

			// If no exact match found, find item with same foodId only
			if (!existingItem && cart.items.length > 0) {
				existingItem = cart.items.find((item) => {
					const currentItemFoodId = this.getFoodId(item.food);
					return currentItemFoodId.toString() === foodId.toString();
				});
			}

			// ✅ KEY FIX: Determine whether to process addOns based on context
			// - New item (no existingItem): always use the addOns sent (even empty array means no add-ons)
			// - Existing item: only update addOns if frontend explicitly set updateAddOns: true
			const shouldProcessAddOns = hasAddOnsInput && (
				!existingItem ||        // new item: always respect addOns from request
				updateAddOns === true   // existing item: only update if explicitly requested
			);

			const hasAddOnRemovals = shouldProcessAddOns && addOnsMarkedForRemoval.length > 0;
			const hasAddOnAdditions = shouldProcessAddOns && filteredAddOns.length > 0;
			let addOnsModified = false;

			if (!existingItem && hasAddOnRemovals) {
				existingItem = cart.items.find((item) => {
					const currentItemFoodId = this.getFoodId(item.food);
					if (currentItemFoodId.toString() !== foodId.toString()) {
						return false;
					}
					const itemAddOnIds = (item.addOns || []).map((addOn) => addOn.addOnId?.toString() || addOn.addOnId);
					return addOnsMarkedForRemoval.some((entry) => itemAddOnIds.includes(entry.addOnId.toString()));
				});
			}

			if (hasAddOnRemovals) {
				if (!existingItem) {
					return res.status(404).json({
						success: false,
						message: 'Cannot remove add-ons. Cart item not found.'
					});
				}
				const removalIds = new Set(addOnsMarkedForRemoval.map((entry) => entry.addOnId.toString()));
				const existingAddOnsList = existingItem.addOns || [];
				const filteredExistingAddOns = existingAddOnsList.filter(
					(addOn) => !removalIds.has(addOn.addOnId?.toString() || addOn.addOnId)
				);
				if (filteredExistingAddOns.length === existingAddOnsList.length) {
					return res.status(404).json({
						success: false,
						message: 'Cannot remove add-ons. Selected add-ons were not found in cart item.'
					});
				}
				existingItem.addOns = filteredExistingAddOns;
				addOnsModified = true;
			}

			if (isPrebookFood && cart) {
				const otherPrebookItem = cart.items.find(
					(item) =>
						item.isPrebook &&
						(!existingItem || item._id.toString() !== existingItem._id?.toString())
				);
				if (otherPrebookItem) {
					return res.status(400).json({
						success: false,
						message: 'Only one prebook item can exist in the cart at a time. Remove the existing prebook item to add another.'
					});
				}
			}

			if (customizationRemovalRequested) {
				if (!existingItem) {
					return res.status(404).json({
						success: false,
						message: 'Cannot remove customization. Cart item not found.'
					});
				}

				const customizationsMarkedForRemoval = resolvedCustomizations.filter(
					(entry) => entry && entry.quantity === 0
				);

				if (customizationsMarkedForRemoval.length > 0) {
					const removalIds = new Set(
						customizationsMarkedForRemoval.map((entry) => entry.customizationId.toString())
					);
					const existingList = existingItem.customizations || [];
					const filteredExisting = existingList.filter(
						(custom) =>
							!removalIds.has(
								(custom.customizationId?.toString && custom.customizationId.toString()) ||
								custom.customizationId
							)
					);

					if (filteredExisting.length === existingList.length) {
						return res.status(404).json({
							success: false,
							message: 'Cannot remove customization. Selected customization was not found in cart item.'
						});
					}

					existingItem.customizations = filteredExisting;

					if ((existingItem.customizations || []).length === 0 && existingItem.usesCustomizationPrice) {
						cart.items = cart.items.filter(
							(item) => item._id.toString() !== existingItem._id.toString()
						);
					} else {
						if (existingItem.usesCustomizationPrice) {
							const mergedCustomizationPrice = this.calculateCustomizationPrice(
								existingItem.customizations || []
							);
							existingItem.effectivePrice = mergedCustomizationPrice;
						}
						this.updateCartItemTotals(existingItem);
					}
				}
			}

			// Handle remove operation (quantity = 0)
			if (isRemoveOperation) {
				if (!existingItem) {
					return res.status(404).json({
						success: false,
						message: 'Cannot remove. Cart item not found.'
					});
				}
				cart.items = cart.items.filter((item) => item._id.toString() !== existingItem._id.toString());
			} else {
				let customizationHandled = false;

				if (existingItem && usesCustomizationPrice) {
					customizationHandled = true;

					// Merge customizations instead of replacing
					let customizationsForItem = existingItem.customizations || [];
					if (hasCustomizationsInput) {
						const customizationMap = new Map();

						customizationsForItem.forEach(custom => {
							const customId = custom.customizationId?.toString() || custom.customizationId;
							if (customId) {
								customizationMap.set(customId, {
									customizationId: custom.customizationId,
									name: custom.name,
									price: custom.price,
									quantity: custom.quantity || 1
								});
							}
						});

						filteredCustomizations.forEach(custom => {
							const customId = custom.customizationId?.toString() || custom.customizationId;
							if (customId) {
								const existing = customizationMap.get(customId);
								if (existing) {
									// Same customization: replace quantity (not accumulate)
									existing.quantity = custom.quantity || 1;
								} else {
									customizationMap.set(customId, {
										customizationId: custom.customizationId,
										name: custom.name,
										price: custom.price,
										quantity: custom.quantity || 1
									});
								}
							}
						});

						customizationsForItem = Array.from(customizationMap.values());
					}

					// ✅ Only merge addOns when shouldProcessAddOns is true
					let addOnsForItem = existingItem.addOns || [];
					if (shouldProcessAddOns && hasAddOnAdditions) {
						const addOnMap = new Map();

						addOnsForItem.forEach(addOn => {
							const addOnId = addOn.addOnId?.toString() || addOn.addOnId;
							if (addOnId) {
								addOnMap.set(addOnId, {
									addOnId: addOn.addOnId,
									name: addOn.name,
									price: addOn.price,
									quantity: addOn.quantity || 1
								});
							}
						});

						filteredAddOns.forEach(addOn => {
							const addOnId = addOn.addOnId?.toString() || addOn.addOnId;
							if (addOnId) {
								const existing = addOnMap.get(addOnId);
								if (existing) {
									// ✅ Replace quantity, never accumulate
									existing.quantity = addOn.quantity || 1;
								} else {
									addOnMap.set(addOnId, {
										addOnId: addOn.addOnId,
										name: addOn.name,
										price: addOn.price,
										quantity: addOn.quantity || 1
									});
								}
							}
						});

						addOnsForItem = Array.from(addOnMap.values());
						addOnsModified = true;
					}

					existingItem.customizations = customizationsForItem;
					existingItem.addOns = addOnsForItem;
					existingItem.quantity = 1;
					existingItem.usesCustomizationPrice = true;
					existingItem.discountPrice = null;
					existingItem.packingCharge = packingChargePerUnit;
					existingItem.isPrebook = isPrebookFood;

					const customizationPrice = this.calculateCustomizationPrice(customizationsForItem);
					existingItem.effectivePrice = customizationPrice;
					this.updateCartItemTotals(existingItem);
				}

				if (!customizationHandled) {
					if (!existingItem && !isIncrementOperation && !isSetQuantityOperation) {
						return res.status(404).json({
							success: false,
							message: 'Cannot decrement. Cart item not found.'
						});
					}

					if (existingItem) {
						if (hasCustomizationsInput) {
							const existingCustomizations = existingItem.customizations || [];
							const customizationMap = new Map();

							existingCustomizations.forEach(custom => {
								const customId = custom.customizationId?.toString() || custom.customizationId;
								if (customId) {
									customizationMap.set(customId, {
										customizationId: custom.customizationId,
										name: custom.name,
										price: custom.price,
										quantity: custom.quantity || 1
									});
								}
							});

							filteredCustomizations.forEach(custom => {
								const customId = custom.customizationId?.toString() || custom.customizationId;
								if (customId) {
									const existing = customizationMap.get(customId);
									if (existing) {
										existing.quantity = custom.quantity || 1;
									} else {
										customizationMap.set(customId, {
											customizationId: custom.customizationId,
											name: custom.name,
											price: custom.price,
											quantity: custom.quantity || 1
										});
									}
								}
							});

							const mergedCustomizations = Array.from(customizationMap.values());
							existingItem.customizations = mergedCustomizations;

							if (existingItem.usesCustomizationPrice) {
								const mergedCustomizationPrice = this.calculateCustomizationPrice(mergedCustomizations);
								existingItem.effectivePrice = mergedCustomizationPrice;
							}
						}

						// ✅ Only merge addOns when shouldProcessAddOns is true
						if (shouldProcessAddOns && hasAddOnAdditions) {
							const existingAddOns = existingItem.addOns || [];
							if (existingAddOns.length === 0) {
								// No existing addOns, use the new ones directly
								existingItem.addOns = filteredAddOns;
								addOnsModified = true;
							} else {
								const addOnMap = new Map();

								existingAddOns.forEach(addOn => {
									const addOnId = addOn.addOnId?.toString() || addOn.addOnId;
									if (addOnId) {
										addOnMap.set(addOnId, {
											addOnId: addOn.addOnId,
											name: addOn.name,
											price: addOn.price,
											quantity: addOn.quantity || 1
										});
									}
								});

								filteredAddOns.forEach(addOn => {
									const addOnId = addOn.addOnId?.toString() || addOn.addOnId;
									if (addOnId) {
										const existing = addOnMap.get(addOnId);
										if (existing) {
											// ✅ Replace quantity, never accumulate
											existing.quantity = addOn.quantity || 1;
										} else {
											addOnMap.set(addOnId, {
												addOnId: addOn.addOnId,
												name: addOn.name,
												price: addOn.price,
												quantity: addOn.quantity || 1
											});
										}
									}
								});

								existingItem.addOns = Array.from(addOnMap.values());
								addOnsModified = true;
							}
						}

						existingItem.packingCharge = packingChargePerUnit;
						if (!addOnsModified) {
							this.updateCartItemTotals(existingItem);
						}
					}

					if (existingItem && isSetQuantityOperation) {
						existingItem.quantity = targetQuantity;
						existingItem.isPrebook = isPrebookFood;
						this.updateCartItemTotals(existingItem);
					} else if (existingItem && isIncrementOperation) {
						existingItem.quantity += 1;
						existingItem.isPrebook = isPrebookFood;
						this.updateCartItemTotals(existingItem);
					} else if (existingItem && !isIncrementOperation) {
						existingItem.quantity = Math.max(0, existingItem.quantity - 1);
						existingItem.isPrebook = isPrebookFood;
						if (existingItem.quantity === 0) {
							cart.items = cart.items.filter((item) => item._id.toString() !== existingItem._id.toString());
						} else {
							this.updateCartItemTotals(existingItem);
						}
					} else if (existingItem) {
						existingItem.quantity += 1;
						existingItem.isPrebook = isPrebookFood;
						this.updateCartItemTotals(existingItem);
					} else {
						// New item
						const initialQuantity = isSetQuantityOperation ? targetQuantity : (usesCustomizationPrice ? 1 : absoluteQuantity);
						const newItem = {
							food: food._id,
							foodName: food.foodName,
							foodImage: food.foodImage,
							foodType: food.type,
							quantity: initialQuantity,
							basePrice: food.basePrice,
							discountPrice: normalizedDiscountPrice,
							effectivePrice,
							usesCustomizationPrice,
							customizations: filteredCustomizations,
							addOns: filteredAddOns,    // for new items, always use what was sent (even empty)
							isPrebook: isPrebookFood,
							packingCharge: packingChargePerUnit,
							notes: notes?.trim() || null
						};
						this.updateCartItemTotals(newItem);
						cart.items.push(newItem);
					}
				}

				if (existingItem && cart.items.includes(existingItem)) {
					this.updateCartItemTotals(existingItem);
				}
			}

			if (cart.items.length === 0) {
				// If this is a connected cart, disconnect all users before deleting
				if (cart.connectedUsers && cart.connectedUsers.length > 0) {
					await Cart.updateMany(
						{ connectedCart: cart._id },
						{ $unset: { connectedCart: 1 } }
					);
				}
				await Cart.deleteOne({ _id: cart._id });
				return res.json({
					success: true,
					message: 'Cart cleared after decrement',
					data: this.formatCartResponse(null)
				});
			}

			cart.isPrebookCart = cart.items.some((item) => item.isPrebook);

			// Revalidate coupon if present when cart totals change
			if (cart.couponCode) {
				const orderAmount = cart.totals?.grandTotal || cart.totals?.subTotal || 0;
				const vendorId = this.getVendorId(cart.vendor);
				const validation = await Coupon.validateCoupon(
					cart.couponCode,
					req.user.id,
					orderAmount,
					vendorId
				);

				if (!validation.valid) {
					cart.couponCode = null;
					cart.couponDiscount = 0;
					cart.totals.couponDiscount = 0;
				} else {
					cart.couponDiscount = validation.discount;
				}
			}

			await cart.save();

			await cart.populate([
				{ path: 'vendor', select: 'restaurantName profileImage address serviceOffered' },
				{ path: 'items.food', select: 'foodName foodImage type' }
			]);

			return res.status(201).json({
				success: true,
				message: 'Item added to cart successfully',
				data: this.formatCartResponse(cart)
			});
		} catch (error) {
			console.error('Error adding item to cart:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to add item to cart',
				error: error.message
			});
		}
	}

	async removeItem(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

			const userId = req.user.id;
			const { itemId } = req.params;

			// Get the working cart (connected cart if exists, otherwise user's own cart)
			const cart = await this.getWorkingCart(userId);
			if (!cart) {
				return res.status(404).json({
					success: false,
					message: 'Cart not found'
				});
			}

			const initialLength = cart.items.length;
			cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

			if (cart.items.length === initialLength) {
				return res.status(404).json({
					success: false,
					message: 'Cart item not found'
				});
			}

			if (cart.items.length === 0) {
				// If this is a connected cart, disconnect all users before deleting
				if (cart.connectedUsers && cart.connectedUsers.length > 0) {
					await Cart.updateMany(
						{ connectedCart: cart._id },
						{ $unset: { connectedCart: 1 } }
					);
				}
				await Cart.deleteOne({ _id: cart._id });
				return res.json({
					success: true,
					message: 'Cart cleared successfully',
					data: this.formatCartResponse(null)
				});
			}

			await cart.save();

			await cart.populate([
				{ path: 'vendor', select: 'restaurantName profileImage address serviceOffered' },
				{ path: 'items.food', select: 'foodName foodImage type' }
			]);

			return res.json({
				success: true,
				message: 'Item removed from cart successfully',
				data: this.formatCartResponse(cart)
			});
		} catch (error) {
			console.error('Error removing cart item:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to remove cart item',
				error: error.message
			});
		}
	}

	async clearCart(req, res) {
		try {
			const userId = req.user.id;
			// Get the working cart (connected cart if exists, otherwise user's own cart)
			const cart = await this.getWorkingCart(userId);

			if (!cart) {
				return res.json({
					success: true,
					message: 'Cart is already empty',
					data: this.formatCartResponse(null)
				});
			}

			// If this is a connected cart, disconnect all users before deleting
			if (cart.connectedUsers && cart.connectedUsers.length > 0) {
				await Cart.updateMany(
					{ connectedCart: cart._id },
					{ $unset: { connectedCart: 1 } }
				);
			}

			await Cart.deleteOne({ _id: cart._id });

			// Also clear user's own cart if it exists and is different
			const userCart = await Cart.findOne({ user: userId });
			if (userCart && userCart._id.toString() !== cart._id.toString()) {
				await Cart.deleteOne({ _id: userCart._id });
			}

			return res.json({
				success: true,
				message: 'Cart cleared successfully',
				data: this.formatCartResponse(null)
			});
		} catch (error) {
			console.error('Error clearing cart:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to clear cart',
				error: error.message
			});
		}
	}

	async connectCart(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

			const userId = req.user.id;
			const { cartCode } = req.body;

			// Normalize cart code (uppercase)
			const normalizedCartCode = cartCode.trim().toUpperCase();

			// Find the target cart by cartCode
			const targetCart = await Cart.findOne({ cartCode: normalizedCartCode })
				.populate('vendor', 'restaurantName profileImage address serviceOffered gstPercentage');

			if (!targetCart) {
				return res.status(404).json({
					success: false,
					message: 'Cart not found with the provided cart code'
				});
			}

			// Cannot connect to own cart
			if (targetCart.user.toString() === userId) {
				return res.status(400).json({
					success: false,
					message: 'Cannot connect to your own cart'
				});
			}

			// Get user's own cart
			let userCart = await Cart.findOne({ user: userId });

			// Check if already connected to this cart (do this first)
			if (userCart && userCart.connectedCart && userCart.connectedCart.toString() === targetCart._id.toString()) {
				// Already connected, just return the cart
				const connectedCart = await Cart.findById(targetCart._id)
					.populate('vendor', 'restaurantName profileImage address serviceOffered gstPercentage')
					.populate('items.food', 'foodName foodImage type');

				return res.json({
					success: true,
					message: 'Already connected to this cart',
					data: this.formatCartResponse(connectedCart)
				});
			}

			// Check if user has items in their own cart (must be empty before connecting)
			if (userCart && userCart.items && userCart.items.length > 0) {
				return res.status(400).json({
					success: false,
					message: 'Your cart is not empty. Please clear your cart before connecting to another cart.'
				});
			}

			// If user is connected to a different cart, disconnect first
			if (userCart && userCart.connectedCart && userCart.connectedCart.toString() !== targetCart._id.toString()) {
				const previousCart = await Cart.findById(userCart.connectedCart);
				if (previousCart) {
					previousCart.connectedUsers = previousCart.connectedUsers.filter(
						(id) => id.toString() !== userId
					);
					await previousCart.save();
				}
			}

			// If user doesn't have a cart, create a minimal cart record just for the connection
			// This is required by schema (user field is unique), but it's just a pointer to the connected cart
			// IMPORTANT: Set connectedCart BEFORE saving to prevent cartCode generation
			if (!userCart) {
				userCart = new Cart({
					user: userId,
					vendor: targetCart.vendor, // Required by schema, but will use connected cart's vendor
					serviceType: targetCart.serviceType, // Required by schema, but will use connected cart's serviceType
					items: [],
					gstPercentage: targetCart.gstPercentage,
					connectedCart: targetCart._id // Set connection BEFORE saving to prevent cartCode generation
				});
				await userCart.save();
			} else {
				// If user already has a cart (but empty), update it to point to the connected cart
				userCart.items = [];
				userCart.vendor = targetCart.vendor;
				userCart.serviceType = targetCart.serviceType;
				userCart.connectedCart = targetCart._id; // Set connection
				await userCart.save();
			}

			// Add user to connectedUsers array of target cart (if not already there)
			if (!targetCart.connectedUsers.some((id) => id.toString() === userId)) {
				targetCart.connectedUsers.push(userId);
				await targetCart.save();
			}

			// Get the connected cart with all populated data
			const connectedCart = await Cart.findById(targetCart._id)
				.populate('vendor', 'restaurantName profileImage address serviceOffered gstPercentage')
				.populate('items.food', 'foodName foodImage type');

			return res.json({
				success: true,
				message: 'Cart connected successfully',
				data: this.formatCartResponse(connectedCart)
			});
		} catch (error) {
			console.error('Error connecting cart:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to connect cart',
				error: error.message
			});
		}
	}

	async disconnectCart(req, res) {
		try {
			const userId = req.user.id;

			// Get user's own cart
			const userCart = await Cart.findOne({ user: userId });

			if (!userCart || !userCart.connectedCart) {
				return res.json({
					success: true,
					message: 'Not connected to any cart',
					data: this.formatCartResponse(null)
				});
			}

			const connectedCartId = userCart.connectedCart;

			// Remove connection from user's cart
			userCart.connectedCart = null;
			await userCart.save();

			// Remove user from connectedUsers array of the connected cart
			const connectedCart = await Cart.findById(connectedCartId);
			if (connectedCart) {
				connectedCart.connectedUsers = connectedCart.connectedUsers.filter(
					(id) => id.toString() !== userId
				);
				await connectedCart.save();
			}

			return res.json({
				success: true,
				message: 'Cart disconnected successfully',
				data: this.formatCartResponse(null)
			});
		} catch (error) {
			console.error('Error disconnecting cart:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to disconnect cart',
				error: error.message
			});
		}
	}

	async getAvailableAddOns(req, res) {
		try {
			const userId = req.user.id;
			const { itemId } = req.params;

			if (!mongoose.Types.ObjectId.isValid(itemId)) {
				return res.status(400).json({
					success: false,
					message: 'Invalid item ID format'
				});
			}

			// Get the working cart
			const cart = await this.getWorkingCart(userId);
			if (!cart) {
				return res.status(404).json({
					success: false,
					message: 'Cart not found'
				});
			}

			// Find the specific line item in the cart by its item ID
			const cartItem = cart.items.find((item) => item._id.toString() === itemId);
			if (!cartItem) {
				return res.status(404).json({
					success: false,
					message: 'Cart item not found'
				});
			}

			// Fetch the full food document to get all add-ons defined on the food
			const food = await Food.findById(cartItem.food).lean();
			if (!food) {
				return res.status(404).json({
					success: false,
					message: 'Associated food item not found'
				});
			}

			// Build a set of add-on IDs already selected for this specific cart item
			const selectedAddOnIds = new Set(
				(cartItem.addOns || []).map((a) => a.addOnId.toString())
			);

			// Build a set of customization IDs already selected for this specific cart item
			const selectedCustomizationIds = new Set(
				(cartItem.customizations || []).map((c) => c.customizationId.toString())
			);

			// Return only the add-ons that are NOT yet selected for this cart item
			const unselectedAddOns = (food.addOns || [])
				.filter((addOn) => !selectedAddOnIds.has(addOn._id.toString()))
				.map((addOn) => ({
					id: addOn._id.toString(),
					name: addOn.name,
					price: addOn.price,
					image: addOn.image || null
				}));

			// Return only the customizations that are NOT yet selected for this cart item
			const unselectedCustomizations = (food.customizations || [])
				.filter((c) => !selectedCustomizationIds.has(c._id.toString()))
				.map((c) => ({
					id: c._id.toString(),
					name: c.name,
					price: c.price
				}));

			return res.json({
				success: true,
				message: 'Add-ons and customizations retrieved successfully',
				data: {
					foodId: food._id.toString(),
					foodName: food.foodName,
					addOns: unselectedAddOns,
					customizations: unselectedCustomizations
				}
			});
		} catch (error) {
			console.error('Error fetching add-ons:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to fetch add-ons',
				error: error.message
			});
		}
	}
}

const controller = new CartController();

module.exports = {
	getCart: controller.getCart.bind(controller),
	addItem: controller.addItem.bind(controller),
	removeItem: controller.removeItem.bind(controller),
	clearCart: controller.clearCart.bind(controller),
	connectCart: controller.connectCart.bind(controller),
	disconnectCart: controller.disconnectCart.bind(controller),
	getAvailableAddOns: controller.getAvailableAddOns.bind(controller)
};

