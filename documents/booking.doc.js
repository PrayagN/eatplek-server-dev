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
 * components:
 *   schemas:
 *     BookingResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         orderStatus:
 *           type: string
 *           enum: [pending, accepted, rejected, timeout]
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
 */

