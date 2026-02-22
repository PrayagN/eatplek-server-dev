/**
 * @swagger
 * tags:
 *   - name: Booking
 *     description: Create restaurant bookings using the active cart with vendor approval workflow
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a booking using the active cart
 *     description: |
 *       Creates a booking snapshot from the user's active cart and waits up to 2 minutes for vendors to accept/reject.
 *       Cart must already satisfy vendor/service-type restrictions.
 *       If a coupon is applied to the cart, it will be validated again at booking time. Invalid coupons will be removed and booking will fail with an error.
 *       Valid coupons will be marked as used (for one-time use coupons) and the discount will be applied to the final booking amount.
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceType
 *             properties:
 *               serviceType:
 *                 type: string
 *                 enum: [Delivery, Dine in, Takeaway, Car Dine in]
 *                 description: Must match the service type already locked in cart.
 *               address:
 *                 type: string
 *                 description: Required for Delivery service type.
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               name:
 *                 type: string
 *                 description: Contact name for delivery.
 *               phoneNumber:
 *                 type: string
 *                 description: Contact number for delivery (min 6 digits).
 *               personCount:
 *                 type: integer
 *                 description: Required for Dine in.
 *               reachTime:
 *                 type: string
 *                 format: date-time
 *                 description: Required for Dine in, Takeaway, Car Dine in.
 *               vehicleDetails:
 *                 type: string
 *                 description: Optional vehicle info for car dine in.
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional instructions for vendor.
 *           examples:
 *             delivery:
 *               summary: Delivery booking
 *               value:
 *                 serviceType: "Delivery"
 *                 address: "123 MG Road, Kochi"
 *                 latitude: 10.0181
 *                 longitude: 76.3051
 *                 name: "Rahul"
 *                 phoneNumber: "+919876543210"
 *                 notes: "Leave at reception"
 *             dineIn:
 *               summary: Dine in booking
 *               value:
 *                 serviceType: "Dine in"
 *                 personCount: 4
 *                 reachTime: "2025-11-26T19:00:00.000Z"
 *             takeaway:
 *               summary: Takeaway booking
 *               value:
 *                 serviceType: "Takeaway"
 *                 reachTime: "2025-11-26T18:30:00.000Z"
 *                 notes: "Pack separately"
 *             carDineIn:
 *               summary: Car Dine in booking
 *               value:
 *                 serviceType: "Car Dine in"
 *                 reachTime: "2025-11-26T20:00:00.000Z"
 *                 vehicleDetails: "KL-07-AB-1234 White Swift"
 *           description: |
 *             Required fields by service type:
 *             - Delivery: address, latitude, longitude, name, phoneNumber
 *             - Dine in: personCount, reachTime
 *             - Takeaway: reachTime
 *             - Car Dine in: reachTime
 *     responses:
 *       200:
 *         description: Booking status (accepted, rejected, timeout)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/bookings/my-orders:
 *   get:
 *     summary: Get all orders for the authenticated user
 *     description: Returns a paginated list of past and active orders for the user. Used for the "My Orders" screen.
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: User orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BookingResponse'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   get:
 *     summary: Get tracking details for a specific order
 *     description: Returns comprehensive details for a single order, including full cart snapshot, delivery coordinates, and vendor details. Used for the "Track Your Order" screen.
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the booking to track
 *     responses:
 *       200:
 *         description: Order tracking details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/BookingResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/bookings/{bookingId}/payment-confirm:
 *   post:
 *     summary: Confirm PhonePe payment for a booking
 *     description: |
 *       Verifies and confirms the payment status of an accepted order after the user completes the PhonePe flow.
 *       The order must be in 'accepted' status before payment can be confirmed.
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the booking to confirm payment for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: PhonePe transaction ID
 *               providerReferenceId:
 *                 type: string
 *                 description: Bank reference number (optional)
 *               amount:
 *                 type: number
 *                 description: Amount paid (optional, defaults to booking total)
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method used (optional, defaults to ONLINE)
 *                 example: "ONLINE"
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Bad request (payment already completed, order not accepted)
 *         $ref: '#/components/responses/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/vendor/orders/{bookingId}/status:
 *   patch:
 *     summary: Advance order status to the next step
 *     description: |
 *       Vendor advances the order to the next status in the strict sequence.
 *       The sequence depends on the service type:
 *       - Delivery: accepted → preparing → out_for_delivery → completed
 *       - Takeaway/Pickup: accepted → preparing → ready_for_pickup → completed
 *       - Dine in/Car Dine in: accepted → preparing → served → completed
 *       Payment must be completed before advancing from 'accepted'.
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the booking to update
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Invalid status transition or payment not completed
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/bookings/{bookingId}/stream:
 *   get:
 *     summary: Real-time order status stream (SSE)
 *     description: |
 *       Opens a Server-Sent Events (SSE) connection for real-time order status updates.
 *       The client receives the initial order state immediately, then receives push updates
 *       whenever the vendor changes the order status. A heartbeat is sent every 30 seconds.
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the booking to stream
 *     responses:
 *       200:
 *         description: SSE stream opened successfully (text/event-stream)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BookingResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         orderStatus:
 *           type: string
 *           enum: [pending, accepted, rejected, timeout, preparing, out_for_delivery, ready_for_pickup, served, completed]
 *         serviceType:
 *           type: string
 *         isPrebook:
 *           type: boolean
 *           description: Indicates whether this booking contains prebook-only items
 *         serviceDetails:
 *           type: object
 *           properties:
 *             address: { type: string }
 *             latitude: { type: number }
 *             longitude: { type: number }
 *             name: { type: string }
 *             phoneNumber: { type: string }
 *             personCount: { type: integer }
 *             reachTime:
 *               type: string
 *               format: date-time
 *         cartSnapshot:
 *           type: object
 *           properties:
 *             cartId:
 *               type: string
 *             totals:
 *               $ref: '#/components/schemas/CartTotals'
 *             items:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CartItem'
 *         amountSummary:
 *           $ref: '#/components/schemas/CartTotals'
 *         vendorResponseAt:
 *           type: string
 *           format: date-time
 *         paymentStatus:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         paymentDetails:
 *           type: object
 *           properties:
 *             transactionId:
 *               type: string
 *               nullable: true
 *             providerReferenceId:
 *               type: string
 *               nullable: true
 *             amount:
 *               type: number
 *             paymentMethod:
 *               type: string
 *               nullable: true
 *             paidAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *         trackingSteps:
 *           type: array
 *           description: Service-type-specific tracking steps with completion state
 *           items:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               label:
 *                 type: string
 *               description:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               active:
 *                 type: boolean
 */
