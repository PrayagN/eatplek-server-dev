/**
 * @swagger
 * tags:
 *   - name: Vendor Orders
 *     description: "Vendor order management - View pending orders and accept/reject orders"
 */

/**
 * @swagger
 * /api/vendor/orders:
 *   get:
 *     summary: Get pending orders for vendor
 *     description: Returns all pending orders for the authenticated vendor. Only shows orders with status "pending".
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending orders retrieved successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BookingResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Unauthorized - Vendor access required
 */

/**
 * @swagger
 * /api/vendor/orders/{bookingId}/respond:
 *   put:
 *     summary: Accept or reject an order
 *     description: |
 *       Vendor can accept or reject a pending order. 
 *       
 *       **Accept**: Changes order status to "accepted" and returns total amount for payment processing.
 *       
 *       **Reject** with three options:
 *       1. **Partial Rejection**: Select specific food items and update quantities (e.g., user ordered 10 parotta but vendor only has 8)
 *       2. **Time Change Suggestion**: If vendor cannot serve at requested time, suggest a new time
 *       3. **Full Rejection**: Reject the entire order with optional rejection reason
 *       
 *       Multiple rejection options can be combined (e.g., partial rejection with time suggestion).
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID to respond to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *                 description: Action to take - "accept" or "reject"
 *               rejectionReason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional rejection reason (for reject action)
 *                 example: "Item not available"
 *               suggestedTime:
 *                 type: string
 *                 format: date-time
 *                 description: Optional suggested time if vendor cannot serve at requested time (for reject action)
 *                 example: "2024-12-25T19:30:00.000Z"
 *               modifiedItems:
 *                 type: array
 *                 description: Optional array of items with updated quantities for partial rejection (for reject action)
 *                 items:
 *                   type: object
 *                   required:
 *                     - foodId
 *                     - updatedQuantity
 *                   properties:
 *                     foodId:
 *                       type: string
 *                       description: Food item ID from the order
 *                       example: "60d5ec49f1b2c72b8c1a2b3c"
 *                     updatedQuantity:
 *                       type: integer
 *                       minimum: 1
 *                       description: Updated quantity (must be less than or equal to original quantity)
 *                       example: 8
 *                     reason:
 *                       type: string
 *                       maxLength: 200
 *                       description: Optional reason for quantity change
 *                       example: "Only 8 pieces available in stock"
 *           examples:
 *             accept:
 *               summary: Accept order
 *               value:
 *                 action: "accept"
 *             rejectFull:
 *               summary: Full rejection with reason
 *               value:
 *                 action: "reject"
 *                 rejectionReason: "We are closed today due to maintenance"
 *             rejectPartial:
 *               summary: Partial rejection - Reduce quantity of specific items
 *               description: User ordered 10 parotta but vendor only has 8 available
 *               value:
 *                 action: "reject"
 *                 modifiedItems:
 *                   - foodId: "60d5ec49f1b2c72b8c1a2b3c"
 *                     updatedQuantity: 8
 *                     reason: "Only 8 pieces available in stock"
 *             rejectTimeChange:
 *               summary: Reject with time suggestion
 *               description: Vendor cannot serve at requested time, suggests alternative time
 *               value:
 *                 action: "reject"
 *                 suggestedTime: "2024-12-25T19:30:00.000Z"
 *                 rejectionReason: "Please change the time. We suggest this alternative time."
 *             rejectCombined:
 *               summary: Combined rejection - Partial + Time suggestion
 *               description: Reduce quantity of one item and suggest different time
 *               value:
 *                 action: "reject"
 *                 suggestedTime: "2024-12-25T19:30:00.000Z"
 *                 modifiedItems:
 *                   - foodId: "60d5ec49f1b2c72b8c1a2b3c"
 *                     updatedQuantity: 8
 *                     reason: "Only 8 pieces available"
 *                 rejectionReason: "Some items not available and time change needed"
 *     responses:
 *       200:
 *         description: Order response processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - description: Accept response
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                       example: "Order accepted successfully"
 *                     data:
 *                       type: object
 *                       properties:
 *                         booking:
 *                           $ref: '#/components/schemas/BookingResponse'
 *                         totalAmount:
 *                           type: number
 *                           description: Total amount for payment
 *                           example: 1250.50
 *                         paymentInfo:
 *                           type: object
 *                           properties:
 *                             amount:
 *                               type: number
 *                             currency:
 *                               type: string
 *                               example: "INR"
 *                             message:
 *                               type: string
 *                 - description: Reject response
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                       example: "Order rejected successfully"
 *                     data:
 *                       $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Validation failed or invalid request
 *         $ref: '#/components/responses/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Unauthorized - Vendor access required
 *       404:
 *         description: Order not found or already processed
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
 *         serviceDetails:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             name:
 *               type: string
 *             phoneNumber:
 *               type: string
 *             personCount:
 *               type: integer
 *             reachTime:
 *               type: string
 *               format: date-time
 *             vehicleDetails:
 *               type: string
 *         notes:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             phone:
 *               type: string
 *             dialCode:
 *               type: string
 *             userCode:
 *               type: string
 *         vendor:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             gstPercentage:
 *               type: number
 *         cartSnapshot:
 *           type: object
 *           properties:
 *             cartId:
 *               type: string
 *             items:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CartItem'
 *             totals:
 *               $ref: '#/components/schemas/CartTotals'
 *         amountSummary:
 *           $ref: '#/components/schemas/CartTotals'
 *         rejectionDetails:
 *           type: object
 *           description: Only present when orderStatus is "rejected"
 *           properties:
 *             rejectionReason:
 *               type: string
 *               nullable: true
 *               description: Reason for rejection if provided
 *             suggestedTime:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               description: Suggested alternative time if provided
 *             modifiedItems:
 *               type: array
 *               description: Items with updated quantities for partial rejection
 *               items:
 *                 type: object
 *                 properties:
 *                   food:
 *                     type: string
 *                   originalQuantity:
 *                     type: integer
 *                   updatedQuantity:
 *                     type: integer
 *                   reason:
 *                     type: string
 *                     nullable: true
 *             hasPartialRejection:
 *               type: boolean
 *               description: True if order has partial rejection with modified items
 *             hasTimeSuggestion:
 *               type: boolean
 *               description: True if vendor suggested alternative time
 *         vendorResponseAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

