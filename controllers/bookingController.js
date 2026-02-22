const { validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Cart = require('../models/Cart');
const Vendor = require('../models/Vendor');
const Coupon = require('../models/Coupon');
const { normalizeServiceType, SERVICE_TYPES } = require('../utils/serviceType');
const WAIT_FOR_VENDOR_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 2000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// SSE clients map: bookingId -> Set of response objects
const sseClients = new Map();

// Tracking step definitions per service type group
const TRACKING_STEPS = {
	delivery: [
		{ status: 'pending', label: 'Waiting for Confirmation', description: 'Restaurant is reviewing your order' },
		{ status: 'accepted', label: 'Order Confirmed', description: 'Restaurant accepted your order and is preparing it' },
		{ status: 'preparing', label: 'Preparing Your Food', description: 'Kitchen is working on your order' },
		{ status: 'out_for_delivery', label: 'Out for Delivery', description: 'Rider is on the way' },
		{ status: 'completed', label: 'Delivered', description: 'Order completed successfully' }
	],
	takeaway: [
		{ status: 'pending', label: 'Waiting for Confirmation', description: 'Restaurant is reviewing your order' },
		{ status: 'accepted', label: 'Order Confirmed', description: 'Restaurant accepted your order and is preparing it' },
		{ status: 'preparing', label: 'Preparing Your Food', description: 'Kitchen is working on your order' },
		{ status: 'ready_for_pickup', label: 'Ready for Pickup', description: 'Your order is ready at the counter' },
		{ status: 'completed', label: 'Completed', description: 'Order completed successfully' }
	],
	dinein: [
		{ status: 'pending', label: 'Waiting for Confirmation', description: 'Restaurant is reviewing your order' },
		{ status: 'accepted', label: 'Order Confirmed', description: 'Restaurant accepted your order and is preparing it' },
		{ status: 'preparing', label: 'Preparing Your Food', description: 'Kitchen is working on your order' },
		{ status: 'served', label: 'Served', description: 'Your food has been served' },
		{ status: 'completed', label: 'Completed', description: 'Order completed successfully' }
	]
};

// Valid next-status transitions (strict sequence)
const STATUS_TRANSITIONS = {
	delivery: { accepted: 'preparing', preparing: 'out_for_delivery', out_for_delivery: 'completed' },
	takeaway: { accepted: 'preparing', preparing: 'ready_for_pickup', ready_for_pickup: 'completed' },
	dinein: { accepted: 'preparing', preparing: 'served', served: 'completed' }
};

/**
 * Get the service type group key for tracking steps
 */
function getServiceGroup(serviceType) {
	const normalized = normalizeServiceType(serviceType);
	if (!normalized) return 'delivery';
	if (normalized === 'Delivery') return 'delivery';
	if (normalized === 'Takeaway' || normalized === 'Pickup') return 'takeaway';
	if (normalized === 'Dine in' || normalized === 'Car Dine in') return 'dinein';
	return 'delivery';
}

/**
 * Notify all SSE clients watching a specific booking
 */
function notifySSEClients(bookingId, data) {
	const clients = sseClients.get(bookingId);
	if (!clients) return;
	for (const client of clients) {
		try {
			client.write(`data: ${JSON.stringify(data)}\n\n`);
		} catch (err) {
			console.error('SSE write error:', err.message);
			clients.delete(client);
		}
	}
}

class BookingController {
	formatBookingResponse(booking) {
		if (!booking) {
			return null;
		}

		const totals = booking.amountSummary || booking.cartSnapshot?.totals || {};
		const cartHasPrebook = (booking.cartSnapshot?.items || []).some((item) => item.isPrebook);
		const isPrebook =
			booking.isPrebook !== undefined && booking.isPrebook !== null
				? Boolean(booking.isPrebook)
				: cartHasPrebook;
		const response = {
			id: booking._id?.toString(),
			orderStatus: booking.orderStatus,
			serviceType: normalizeServiceType(booking.serviceType) || booking.serviceType, // Normalize to standard format
			isPrebook,
			serviceDetails: booking.serviceDetails,
			notes: booking.notes,
			user: booking.user
				? {
					id: booking.user._id?.toString() || booking.user.toString(),
					name: booking.user.name || null,
					phone: booking.user.phone || null,
					dialCode: booking.user.dialCode || null,
					userCode: booking.user.userCode || null
				}
				: booking.user?.toString?.() || booking.user || null,
			vendor: booking.vendor
				? {
					id: booking.vendor._id?.toString() || booking.vendor.toString(),
					name: booking.vendor.restaurantName,
					gstPercentage: booking.vendor.gstPercentage ?? totals.taxPercentage ?? 0
				}
				: null,
			cartSnapshot: booking.cartSnapshot,
			amountSummary: {
				subTotal: totals.subTotal ?? 0,
				addOnTotal: totals.addOnTotal ?? 0,
				customizationTotal: totals.customizationTotal ?? 0,
				packingChargeTotal: totals.packingChargeTotal ?? 0,
				discountTotal: totals.discountTotal ?? 0,
				couponDiscount: totals.couponDiscount ?? 0,
				taxAmount: totals.taxAmount ?? 0,
				taxPercentage: totals.taxPercentage ?? 0,
				grandTotal: totals.grandTotal ?? totals.subTotal ?? 0,
				itemCount: totals.itemCount ?? 0
			},
			vendorResponseAt: booking.vendorResponseAt,
			createdAt: booking.createdAt,
			updatedAt: booking.updatedAt
		};

		// Add rejection details if order is rejected
		if (booking.orderStatus === 'rejected') {
			response.rejectionDetails = {
				rejectionReason: booking.rejectionReason || null,
				suggestedTime: booking.suggestedTime || null,
				modifiedItems: booking.modifiedItems || [],
				hasPartialRejection: booking.modifiedItems && booking.modifiedItems.length > 0,
				hasTimeSuggestion: booking.suggestedTime !== null
			};
		}

		// Add payment details
		response.paymentStatus = booking.paymentStatus || 'pending';
		if (booking.paymentDetails) {
			response.paymentDetails = booking.paymentDetails;
		}

		// Add service-type-specific tracking steps
		const group = getServiceGroup(booking.serviceType);
		const steps = TRACKING_STEPS[group] || TRACKING_STEPS.delivery;
		const currentStatus = booking.orderStatus;
		let reachedCurrent = false;

		response.trackingSteps = steps.map((step) => {
			if (step.status === currentStatus) {
				reachedCurrent = true;
				return { ...step, completed: true, active: true };
			}
			if (!reachedCurrent) {
				return { ...step, completed: true, active: false };
			}
			return { ...step, completed: false, active: false };
		});

		return response;
	}

	/**
	 * Get the actual cart for booking (connected cart if exists, otherwise user's own cart)
	 * @param {string} userId - User ID
	 * @returns {Promise<Cart|null>} - The cart object or null
	 */
	async getActualCartForBooking(userId) {
		try {
			const userCart = await Cart.findOne({ user: userId });

			if (!userCart) {
				return null;
			}

			// If user has a connected cart, return that cart instead
			if (userCart.connectedCart) {
				const connectedCart = await Cart.findById(userCart.connectedCart)
					.populate('vendor', 'restaurantName profileImage address gstPercentage contactNumber')
					.populate('items.food', 'foodName foodImage type');

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
				.populate('vendor', 'restaurantName profileImage address gstPercentage contactNumber')
				.populate('items.food', 'foodName foodImage type');
		} catch (error) {
			console.error('Error getting actual cart for booking:', error);
			return null;
		}
	}

	buildServiceDetails(serviceType, payload) {
		const reachTime = payload.reachTime ? new Date(payload.reachTime) : null;
		return {
			address: payload.address?.trim() || null,
			latitude: payload.latitude !== undefined ? Number(payload.latitude) : null,
			longitude: payload.longitude !== undefined ? Number(payload.longitude) : null,
			name: payload.name?.trim() || null,
			phoneNumber: payload.phoneNumber?.trim() || null,
			personCount: payload.personCount !== undefined ? Number(payload.personCount) : null,
			vehicleDetails: payload.vehicleDetails?.trim() || null,
			reachTime: reachTime && !isNaN(reachTime.valueOf()) ? reachTime : null,
			serviceType
		};
	}

	async waitForVendorDecision(bookingId) {
		const endTime = Date.now() + WAIT_FOR_VENDOR_MS;
		while (Date.now() < endTime) {
			const latest = await Booking.findById(bookingId).populate('vendor', 'restaurantName gstPercentage');
			if (!latest) {
				throw new Error('Booking not found while waiting for vendor response');
			}

			if (latest.orderStatus === 'accepted' || latest.orderStatus === 'rejected') {
				return latest;
			}

			await delay(POLL_INTERVAL_MS);
		}

		const timeoutBooking = await Booking.findOneAndUpdate(
			{ _id: bookingId, orderStatus: 'pending' },
			{ orderStatus: 'timeout', vendorResponseAt: new Date() },
			{ new: true }
		).populate('vendor', 'restaurantName gstPercentage');

		return timeoutBooking || (await Booking.findById(bookingId).populate('vendor', 'restaurantName gstPercentage'));
	}

	mapCartItems(cart) {
		return cart.items.map((item) => ({
			food: item.food?._id || item.food,
			foodName: item.foodName,
			foodImage: item.foodImage,
			foodType: item.foodType,
			quantity: item.quantity,
			basePrice: item.basePrice,
			discountPrice: item.discountPrice,
			effectivePrice: item.effectivePrice,
			customizations: (item.customizations || []).map((c) => ({
				customizationId: c.customizationId || c._id || c.id,
				name: c.name,
				price: c.price,
				quantity: c.quantity
			})),
			addOns: (item.addOns || []).map((a) => ({
				addOnId: a.addOnId || a._id || a.id,
				name: a.name,
				price: a.price,
				quantity: a.quantity
			})),
			isPrebook: Boolean(item.isPrebook),
			packingCharge: item.packingCharge || 0,
			itemTotal: item.itemTotal,
			notes: item.notes
		}));
	}

	async createBooking(req, res) {
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
			const serviceType = normalizeServiceType(req.body.serviceType);

			if (!SERVICE_TYPES.includes(serviceType)) {
				return res.status(400).json({
					success: false,
					message: `Invalid serviceType. Allowed values: ${SERVICE_TYPES.join(', ')}`
				});
			}

			// Get the actual cart (connected cart if exists, otherwise user's own cart)
			const cart = await this.getActualCartForBooking(userId);

			if (!cart || !cart.items || cart.items.length === 0) {
				return res.status(400).json({
					success: false,
					message: 'Cart is empty. Please add items before booking.'
				});
			}

			// Normalize cart's serviceType for comparison (handles old format in database)
			const cartServiceTypeNormalized = normalizeServiceType(cart.serviceType) || cart.serviceType;
			if (cartServiceTypeNormalized !== serviceType) {
				return res.status(400).json({
					success: false,
					message: `Cart is locked to ${cartServiceTypeNormalized}. Please keep booking service type consistent.`
				});
			}

			if (!cart.vendor) {
				return res.status(400).json({
					success: false,
					message: 'Vendor information is missing for this cart.'
				});
			}

			const vendor = await Vendor.findById(cart.vendor._id || cart.vendor);
			if (!vendor) {
				return res.status(404).json({
					success: false,
					message: 'Vendor associated with this cart no longer exists.'
				});
			}

			const serviceDetails = this.buildServiceDetails(serviceType, req.body);
			const isPrebookBooking = Boolean(cart.isPrebookCart || (cart.items || []).some((i) => i.isPrebook));

			// Validate and apply coupon if present
			let couponDiscount = 0;
			let couponId = null;
			if (cart.couponCode) {
				const orderAmount = cart.totals?.grandTotal || cart.totals?.subTotal || 0;
				// Re-validate coupon at booking time
				const validation = await Coupon.validateCoupon(
					cart.couponCode,
					userId,
					orderAmount,
					vendor._id
				);

				if (!validation.valid) {
					// Remove invalid coupon from cart
					cart.couponCode = null;
					cart.couponDiscount = 0;
					cart.totals.couponDiscount = 0;
					// Recalculate totals without coupon
					cart.calculateTotals();
					await cart.save();

					return res.status(400).json({
						success: false,
						message: `Coupon validation failed: ${validation.error}. Coupon has been removed from cart.`,
						data: { couponError: validation.error }
					});
				}

				couponDiscount = validation.discount;
				couponId = validation.coupon._id;

				// Mark coupon as used
				await validation.coupon.markAsUsed(userId);
			}

			// Update cart totals with coupon discount if not already applied
			if (cart.couponCode && cart.totals.couponDiscount !== couponDiscount) {
				cart.totals.couponDiscount = couponDiscount;
				const orderAmount = cart.totals?.subTotal || 0;
				const taxAmount = cart.totals?.taxAmount || 0;
				cart.totals.grandTotal = Math.max(0, orderAmount + taxAmount - couponDiscount);
				await cart.save();
			}

			const bookingPayload = {
				user: userId,
				vendor: vendor._id,
				serviceType,
				isPrebook: isPrebookBooking,
				serviceDetails,
				cartSnapshot: {
					cartId: cart._id,
					items: this.mapCartItems(cart),
					totals: cart.totals
				},
				amountSummary: cart.totals,
				orderStatus: 'pending',
				notes: req.body.notes?.trim() || null,
				couponCode: cart.couponCode || null,
				couponDiscount: couponDiscount,
				couponId: couponId
			};

			let booking = await Booking.create(bookingPayload);
			booking = await Booking.findById(booking._id).populate('vendor', 'restaurantName gstPercentage profileImage');

			const decision = await this.waitForVendorDecision(booking._id);

			const responseData = this.formatBookingResponse(decision);
			if (decision.orderStatus === 'timeout') {
				await Booking.deleteOne({ _id: decision._id });
			}

			if (decision.orderStatus === 'accepted') {
				return res.status(200).json({
					success: true,
					message: 'Booking accepted by vendor',
					data: responseData
				});
			}

			if (decision.orderStatus === 'rejected') {
				return res.status(200).json({
					success: true,
					message: 'Booking rejected by vendor',
					data: responseData
				});
			}

			// Timeout
			return res.status(200).json({
				success: true,
				message: 'Vendor did not respond in time. Booking marked as timeout.',
				data: responseData
			});
		} catch (error) {
			console.error('Error creating booking:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to create booking',
				error: error.message
			});
		}
	}

	async getVendorOrders(req, res) {
		try {
			const vendorId = req.user.id;

			// Get pending orders for this vendor
			const orders = await Booking.find({
				vendor: vendorId,
				orderStatus: 'pending'
			})
				.populate('user', 'name phone dialCode userCode')
				.populate('vendor', 'restaurantName gstPercentage')
				.sort({ createdAt: -1 });

			return res.json({
				success: true,
				message: 'Vendor orders retrieved successfully',
				data: orders.map((order) => this.formatBookingResponse(order))
			});
		} catch (error) {
			console.error('Error fetching vendor orders:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to fetch vendor orders',
				error: error.message
			});
		}
	}

	async respondToOrder(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

			const { bookingId } = req.params;
			const { action, rejectionReason, suggestedTime, modifiedItems } = req.body;
			const vendorId = req.user.id;

			// Find booking and verify it belongs to this vendor
			const booking = await Booking.findOne({
				_id: bookingId,
				vendor: vendorId,
				orderStatus: 'pending'
			}).populate('vendor', 'restaurantName gstPercentage');

			if (!booking) {
				return res.status(404).json({
					success: false,
					message: 'Order not found or already processed'
				});
			}

			if (action === 'accept') {
				// Accept order
				booking.orderStatus = 'accepted';
				booking.vendorResponseAt = new Date();
				await booking.save();

				// Populate user for response
				await booking.populate('user', 'name phone dialCode userCode');

				return res.json({
					success: true,
					message: 'Order accepted successfully',
					data: {
						booking: this.formatBookingResponse(booking),
						totalAmount: booking.amountSummary.grandTotal,
						paymentInfo: {
							amount: booking.amountSummary.grandTotal,
							currency: 'INR',
							// Payment handled in frontend
							message: 'Please proceed with payment in the frontend'
						}
					}
				});
			}

			if (action === 'reject') {
				// Reject order
				booking.orderStatus = 'rejected';
				booking.vendorResponseAt = new Date();

				// Add rejection reason if provided
				if (rejectionReason) {
					booking.rejectionReason = rejectionReason.trim();
				}

				// Add suggested time if provided (for time change requests)
				if (suggestedTime) {
					const suggested = new Date(suggestedTime);
					if (!isNaN(suggested.valueOf())) {
						booking.suggestedTime = suggested;
					}
				}

				// Handle partial rejection with modified items
				if (modifiedItems && Array.isArray(modifiedItems) && modifiedItems.length > 0) {
					// Validate modified items
					const validatedItems = [];
					for (const item of modifiedItems) {
						// Find the item in booking
						const bookingItem = booking.cartSnapshot.items.find(
							(i) => i.food.toString() === item.foodId
						);

						if (!bookingItem) {
							return res.status(400).json({
								success: false,
								message: `Food item with ID ${item.foodId} not found in this order`
							});
						}

						const updatedQty = Number(item.updatedQuantity);
						const originalQty = bookingItem.quantity;

						if (!Number.isInteger(updatedQty) || updatedQty < 1) {
							return res.status(400).json({
								success: false,
								message: `Invalid quantity for item ${item.foodId}. Must be a positive integer.`
							});
						}

						if (updatedQty > originalQty) {
							return res.status(400).json({
								success: false,
								message: `Updated quantity (${updatedQty}) cannot be greater than original quantity (${originalQty})`
							});
						}

						validatedItems.push({
							food: item.foodId,
							originalQuantity: originalQty,
							updatedQuantity: updatedQty,
							reason: item.reason ? item.reason.trim() : null
						});
					}

					booking.modifiedItems = validatedItems;
				}

				await booking.save();

				// Populate user for response
				await booking.populate('user', 'name phone dialCode userCode');

				const responseData = this.formatBookingResponse(booking);

				return res.json({
					success: true,
					message: 'Order rejected successfully',
					data: responseData
				});
			}

			return res.status(400).json({
				success: false,
				message: 'Invalid action. Use "accept" or "reject"'
			});
		} catch (error) {
			console.error('Error responding to order:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to process order response',
				error: error.message
			});
		}
	}

	async confirmPayment(req, res) {
		try {
			const { bookingId } = req.params;
			const { transactionId, providerReferenceId, amount, paymentMethod } = req.body;
			const userId = req.user.id;

			const booking = await Booking.findOne({
				_id: bookingId,
				user: userId
			});

			if (!booking) {
				return res.status(404).json({
					success: false,
					message: 'Booking not found'
				});
			}

			if (booking.paymentStatus === 'completed') {
				return res.status(400).json({
					success: false,
					message: 'Payment has already been completed for this order'
				});
			}

			if (booking.orderStatus !== 'accepted') {
				return res.status(400).json({
					success: false,
					message: `Cannot process payment for order with status: ${booking.orderStatus}. Order must be accepted by vendor first.`
				});
			}

			// In a real scenario with PhonePe S2S validation, we would use the phonepe utility here
			// const phonepeService = require('../utils/phonepe');
			// const statusCheck = await phonepeService.checkStatus(transactionId);
			// if (!statusCheck.success || statusCheck.code !== 'PAYMENT_SUCCESS') { ... }

			booking.paymentStatus = 'completed';
			booking.paymentDetails = {
				transactionId: transactionId || null,
				providerReferenceId: providerReferenceId || null,
				amount: amount || booking.amountSummary.grandTotal,
				paymentMethod: paymentMethod || 'ONLINE',
				paidAt: new Date()
			};

			await booking.save();
			await booking.populate('vendor', 'restaurantName gstPercentage profileImage');

			return res.json({
				success: true,
				message: 'Payment confirmed successfully',
				data: this.formatBookingResponse(booking)
			});
		} catch (error) {
			console.error('Error confirming payment:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to confirm payment',
				error: error.message
			});
		}
	}

	async getVendorActiveOrders(req, res) {
		try {
			const vendorId = req.user.id;

			// Get active (paid and accepted) orders for this vendor
			const orders = await Booking.find({
				vendor: vendorId,
				orderStatus: 'accepted',
				paymentStatus: 'completed'
			})
				.populate('user', 'name phone dialCode userCode')
				.populate('vendor', 'restaurantName gstPercentage')
				.sort({ createdAt: -1 });

			return res.json({
				success: true,
				message: 'Vendor active orders retrieved successfully',
				data: orders.map((order) => this.formatBookingResponse(order))
			});
		} catch (error) {
			console.error('Error fetching vendor active orders:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to fetch vendor active orders',
				error: error.message
			});
		}
	}

	async getUserOrders(req, res) {
		try {
			const userId = req.user.id;
			const page = parseInt(req.query.page) || 1;
			const limit = parseInt(req.query.limit) || 20;
			const skip = (page - 1) * limit;

			// Get all orders for this user
			const orders = await Booking.find({ user: userId })
				.populate('vendor', 'restaurantName profileImage gstPercentage')
				.populate('cartSnapshot.items.food', 'foodName foodImage type')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit);

			const total = await Booking.countDocuments({ user: userId });

			return res.json({
				success: true,
				message: 'User orders retrieved successfully',
				data: {
					orders: orders.map((order) => this.formatBookingResponse(order)),
					pagination: {
						total,
						page,
						limit,
						totalPages: Math.ceil(total / limit)
					}
				}
			});
		} catch (error) {
			console.error('Error fetching user orders:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to fetch user orders',
				error: error.message
			});
		}
	}

	async getOrderTrackerDetails(req, res) {
		try {
			const userId = req.user.id;
			const { bookingId } = req.params;

			const booking = await Booking.findOne({ _id: bookingId, user: userId })
				.populate('vendor', 'restaurantName profileImage address gstPercentage contactNumber')
				.populate('cartSnapshot.items.food', 'foodName foodImage type');

			if (!booking) {
				return res.status(404).json({
					success: false,
					message: 'Order not found'
				});
			}

			return res.json({
				success: true,
				message: 'Order tracking details retrieved successfully',
				data: this.formatBookingResponse(booking)
			});
		} catch (error) {
			console.error('Error fetching order tracker details:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to fetch order tracker details',
				error: error.message
			});
		}
	}

	/**
	 * Update order status (Vendor only) — strict sequence enforcement
	 * PATCH /api/vendor/orders/:bookingId/status
	 */
	async updateOrderStatus(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					success: false,
					message: 'Validation failed',
					errors: errors.array()
				});
			}

			const { bookingId } = req.params;
			const vendorId = req.user.id;

			const booking = await Booking.findOne({
				_id: bookingId,
				vendor: vendorId
			}).populate('vendor', 'restaurantName gstPercentage profileImage');

			if (!booking) {
				return res.status(404).json({
					success: false,
					message: 'Order not found or does not belong to this vendor'
				});
			}

			// Payment must be completed before status can advance beyond accepted
			if (booking.paymentStatus !== 'completed' && booking.orderStatus === 'accepted') {
				return res.status(400).json({
					success: false,
					message: 'Payment must be completed before advancing order status'
				});
			}

			if (booking.orderStatus === 'completed') {
				return res.status(400).json({
					success: false,
					message: 'Order is already completed'
				});
			}

			if (['rejected', 'timeout'].includes(booking.orderStatus)) {
				return res.status(400).json({
					success: false,
					message: `Cannot update status of a ${booking.orderStatus} order`
				});
			}

			// Get the valid next status based on service type group
			const group = getServiceGroup(booking.serviceType);
			const transitions = STATUS_TRANSITIONS[group];
			const nextStatus = transitions[booking.orderStatus];

			if (!nextStatus) {
				return res.status(400).json({
					success: false,
					message: `Cannot advance from current status: ${booking.orderStatus}`
				});
			}

			booking.orderStatus = nextStatus;
			await booking.save();

			const responseData = this.formatBookingResponse(booking);

			// Notify SSE clients watching this booking
			notifySSEClients(bookingId, {
				type: 'STATUS_UPDATE',
				orderStatus: nextStatus,
				trackingSteps: responseData.trackingSteps,
				updatedAt: new Date().toISOString()
			});

			return res.json({
				success: true,
				message: `Order status updated to: ${nextStatus}`,
				data: responseData
			});
		} catch (error) {
			console.error('Error updating order status:', error);
			return res.status(500).json({
				success: false,
				message: 'Failed to update order status',
				error: error.message
			});
		}
	}

	/**
	 * SSE endpoint for real-time order tracking
	 * GET /api/bookings/:bookingId/stream
	 */
	async streamOrderStatus(req, res) {
		try {
			const { bookingId } = req.params;
			const userId = req.user.id;

			// Verify the booking belongs to this user
			const booking = await Booking.findOne({ _id: bookingId, user: userId })
				.populate('vendor', 'restaurantName profileImage address gstPercentage contactNumber');

			if (!booking) {
				return res.status(404).json({
					success: false,
					message: 'Order not found'
				});
			}

			// Set SSE headers
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'X-Accel-Buffering': 'no'
			});

			// Send initial state
			const initialData = this.formatBookingResponse(booking);
			res.write(`data: ${JSON.stringify({ type: 'INITIAL', ...initialData })}\n\n`);

			// Register this client
			if (!sseClients.has(bookingId)) {
				sseClients.set(bookingId, new Set());
			}
			sseClients.get(bookingId).add(res);

			// Send heartbeat every 30 seconds to keep connection alive
			const heartbeat = setInterval(() => {
				try {
					res.write(': heartbeat\n\n');
				} catch (err) {
					clearInterval(heartbeat);
				}
			}, 30000);

			// Cleanup on disconnect
			req.on('close', () => {
				clearInterval(heartbeat);
				const clients = sseClients.get(bookingId);
				if (clients) {
					clients.delete(res);
					if (clients.size === 0) {
						sseClients.delete(bookingId);
					}
				}
			});
		} catch (error) {
			console.error('Error setting up SSE stream:', error);
			if (!res.headersSent) {
				return res.status(500).json({
					success: false,
					message: 'Failed to set up order tracking stream',
					error: error.message
				});
			}
		}
	}
}

const controller = new BookingController();

module.exports = {
	createBooking: controller.createBooking.bind(controller),
	getVendorOrders: controller.getVendorOrders.bind(controller),
	respondToOrder: controller.respondToOrder.bind(controller),
	confirmPayment: controller.confirmPayment.bind(controller),
	getVendorActiveOrders: controller.getVendorActiveOrders.bind(controller),
	getUserOrders: controller.getUserOrders.bind(controller),
	getOrderTrackerDetails: controller.getOrderTrackerDetails.bind(controller),
	updateOrderStatus: controller.updateOrderStatus.bind(controller),
	streamOrderStatus: controller.streamOrderStatus.bind(controller)
};
