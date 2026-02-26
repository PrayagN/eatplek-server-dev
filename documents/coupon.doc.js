/**
 * @swagger
 * tags:
 *   - name: Coupons
 *     description: "Manage coupons for discounts (Admin and Vendor can create, Users can apply)"
 */

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Create a new coupon (Admin or Vendor)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 20
 *                 description: 'Unique coupon code (letters and numbers only, will be converted to uppercase). Required field.'
 *                 example: "SAVE20"
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 description: 'Type of discount. Required field. Use percentage for percentage-based discounts (0-100%) or fixed for fixed amount discounts.'
 *                 example: "percentage"
 *               discountValue:
 *                 type: number
 *                 minimum: 0
 *                 description: 'Discount value. Required field. For percentage: value between 0-100. For fixed: any positive number.'
 *                 example: 20
 *               maxDiscountAmount:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0
 *                 description: 'Maximum discount amount for percentage discounts. Optional field. Use null or omit for no limit. Only applicable when discountType is percentage.'
 *                 example: 100
 *               minOrderAmount:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0
 *                 description: 'Minimum order amount required to use coupon. Optional field. Use null or omit for no minimum. Applies to grand total before coupon discount.'
 *                 example: 500
 *               isOneTimeUse:
 *                 type: boolean
 *                 default: true
 *                 description: 'Whether coupon can only be used once per user. Optional field. Default is true. Set to false to allow multiple uses per user (subject to usageLimit if set).'
 *                 example: true
 *               usageLimit:
 *                 type: integer
 *                 nullable: true
 *                 minimum: 1
 *                 description: 'Maximum number of times coupon can be used across all users (e.g., first 100 or 1000 users). Optional field. Use null or omit for unlimited uses. Only enforced when usageLimit is reached.'
 *                 example: 100
 *               expiresAt:
 *                 type: string
 *                 nullable: true
 *                 format: date-time
 *                 description: 'Expiry date and time in ISO 8601 format. Optional field. Use null or omit for no expiry. Must be a future date.'
 *                 example: "2024-12-31T23:59:59Z"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 500
 *                 description: 'Coupon description for display purposes. Optional field. Use null, empty string, or omit. Maximum 500 characters.'
 *                 example: "Save 20% up to ₹100 on orders above ₹500"
 *               vendorId:
 *                 type: string
 *                 nullable: true
 *                 description: 'Vendor ID (MongoDB ObjectId). Optional field. ADMIN ONLY - If admin provides vendorId, coupon is restricted to that vendor. If omitted, coupon is global (any vendor can use). VENDORS - This field is ignored; vendor ID is automatically taken from the authentication token and coupon is restricted to that vendor only.'
 *                 example: "60d5ec49f1b2c72b8c1a2b3c"
 *           examples:
 *             percentageCouponWithAllFields:
 *               summary: Percentage discount coupon with all fields
 *               value:
 *                 code: "SAVE20"
 *                 discountType: "percentage"
 *                 discountValue: 20
 *                 maxDiscountAmount: 100
 *                 minOrderAmount: 500
 *                 isOneTimeUse: true
 *                 expiresAt: "2024-12-31T23:59:59Z"
 *                 description: "Save 20% up to ₹100 on orders above ₹500"
 *             percentageCouponWithNullOptionalFields:
 *               summary: Percentage discount coupon with null optional fields
 *               value:
 *                 code: "SAVE20"
 *                 discountType: "percentage"
 *                 discountValue: 20
 *                 maxDiscountAmount: null
 *                 minOrderAmount: null
 *                 isOneTimeUse: true
 *                 usageLimit: null
 *                 expiresAt: null
 *                 description: null
 *                 vendorId: null
 *             percentageCouponMinimal:
 *               summary: Percentage discount coupon (minimal required fields only)
 *               value:
 *                 code: "SAVE20"
 *                 discountType: "percentage"
 *                 discountValue: 20
 *             fixedCoupon:
 *               summary: Fixed amount discount coupon
 *               value:
 *                 code: "FLAT50"
 *                 discountType: "fixed"
 *                 discountValue: 50
 *                 minOrderAmount: 200
 *                 isOneTimeUse: true
 *                 usageLimit: 1000
 *                 description: "Flat ₹50 off on orders above ₹200 (First 1000 users)"
 *             vendorSpecificCoupon:
 *               summary: Vendor-specific coupon (admin only)
 *               value:
 *                 code: "VENDOR50"
 *                 discountType: "percentage"
 *                 discountValue: 50
 *                 maxDiscountAmount: 200
 *                 vendorId: "60d5ec49f1b2c72b8c1a2b3c"
 *             vendorCreatingCoupon:
 *               summary: Vendor creating coupon (vendorId is ignored - uses vendor ID from token)
 *               description: 'When a vendor creates a coupon, the vendorId field is automatically set from the authentication token. Any vendorId in the request body is ignored.'
 *               value:
 *                 code: "VENDORSPECIAL"
 *                 discountType: "percentage"
 *                 discountValue: 15
 *                 minOrderAmount: 300
 *                 isOneTimeUse: true
 *                 expiresAt: "2024-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Coupon created successfully
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
 *                   $ref: '#/components/schemas/CouponResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Unauthorized to create coupons
 *       409:
 *         description: Coupon code already exists
 */

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Get all coupons (Admin sees all, Vendor sees only their own)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: vendor
 *         schema:
 *           type: string
 *         description: Filter by vendor ID (admin only)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by coupon code
 *     responses:
 *       200:
 *         description: Coupons retrieved successfully
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
 *                     $ref: '#/components/schemas/CouponResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Unauthorized to view coupons
 */

/**
 * @swagger
 * /api/coupons/{id}:
 *   get:
 *     summary: Get coupon by ID
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon retrieved successfully
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
 *                   $ref: '#/components/schemas/CouponResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Coupon not found
 */

/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Update coupon (Admin or Vendor - Vendor can only update their own)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               discountValue:
 *                 type: number
 *                 minimum: 0
 *               maxDiscountAmount:
 *                 type: number
 *                 minimum: 0
 *               minOrderAmount:
 *                 type: number
 *                 minimum: 0
 *               isOneTimeUse:
 *                 type: boolean
 *               usageLimit:
 *                 type: integer
 *                 minimum: 1
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               isActive:
 *                 type: boolean
 *                 description: Only admin can change this
 *     responses:
 *       200:
 *         description: Coupon updated successfully
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
 *                   $ref: '#/components/schemas/CouponResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Coupon not found
 */

/**
 * @swagger
 * /api/coupons/{id}:
 *   delete:
 *     summary: Deactivate coupon (Admin or Vendor - Vendor can only deactivate their own)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon deactivated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Coupon not found
 */

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate coupon code (check if valid before applying)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Coupon code to validate
 *                 example: "SAVE20"
 *     responses:
 *       200:
 *         description: Coupon validation result
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
 *                     valid:
 *                       type: boolean
 *                     coupon:
 *                       $ref: '#/components/schemas/CouponResponse'
 *                     discount:
 *                       type: number
 *                     orderAmount:
 *                       type: number
 *                     finalAmount:
 *                       type: number
 *       400:
 *         description: Validation failed or coupon invalid
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/coupons/apply:
 *   post:
 *     summary: Apply coupon to cart
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Coupon code to apply
 *                 example: "SAVE20"
 *     responses:
 *       200:
 *         description: Coupon applied successfully
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
 *                     coupon:
 *                       $ref: '#/components/schemas/CouponResponse'
 *                     discount:
 *                       type: number
 *                     originalAmount:
 *                       type: number
 *                     finalAmount:
 *                       type: number
 *       400:
 *         description: Coupon validation failed or cart is empty
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/coupons/remove:
 *   delete:
 *     summary: Remove coupon from cart
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon removed successfully
 *       400:
 *         description: No coupon applied to cart
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Cart not found
 */

/**
 * @swagger
 * /api/coupons/user/list:
 *   get:
 *     summary: Get available coupons for the current user
 *     description: |
 *       Returns a list of coupons the authenticated user can actually use.
 *       Automatically filters out:
 *       - Inactive coupons
 *       - Expired coupons
 *       - Coupons that have hit their usage limit
 *       - One-time-use coupons already used by this user
 *
 *       Optionally filter by `vendorId` to get only coupons applicable to a specific vendor (vendor-specific + global coupons).
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *         description: Filter coupons applicable to a specific vendor (returns vendor-specific + global coupons). If omitted, all usable coupons are returned.
 *         example: "60d5ec49f1b2c72b8c1a2b3c"
 *     responses:
 *       200:
 *         description: Coupons retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Coupons retrieved successfully
 *                 count:
 *                   type: integer
 *                   description: Number of usable coupons returned
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60d5ec49f1b2c72b8c1a2b3c"
 *                       code:
 *                         type: string
 *                         example: "SAVE20"
 *                       discountType:
 *                         type: string
 *                         enum: [percentage, fixed]
 *                         example: "percentage"
 *                       discountValue:
 *                         type: number
 *                         example: 20
 *                       maxDiscountAmount:
 *                         type: number
 *                         nullable: true
 *                         example: 100
 *                       minOrderAmount:
 *                         type: number
 *                         nullable: true
 *                         example: 500
 *                       isOneTimeUse:
 *                         type: boolean
 *                         example: true
 *                       usageLimit:
 *                         type: integer
 *                         nullable: true
 *                         example: 100
 *                       usedCount:
 *                         type: integer
 *                         example: 45
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: "2025-12-31T23:59:59Z"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         example: "Save 20% up to ₹100 on orders above ₹500"
 *                       vendorDetails:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "60d5ec49f1b2c72b8c1a2b3c"
 *                           name:
 *                             type: string
 *                             example: "Delicious Restaurant"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         description: Validation error (invalid vendorId format)
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CouponResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Coupon unique identifier (MongoDB ObjectId)
 *           example: "60d5ec49f1b2c72b8c1a2b3c"
 *         code:
 *           type: string
 *           description: Coupon code (uppercase letters and numbers)
 *           example: "SAVE20"
 *         createdBy:
 *           type: string
 *           enum: [admin, vendor]
 *           description: 'Who created the coupon - admin or vendor'
 *           example: "admin"
 *         createdByAdmin:
 *           type: string
 *           nullable: true
 *           description: Admin ID who created the coupon (null if created by vendor)
 *           example: "60d5ec49f1b2c72b8c1a2b3c"
 *         createdByVendor:
 *           type: string
 *           nullable: true
 *           description: Vendor ID who created the coupon (null if created by admin)
 *           example: "60d5ec49f1b2c72b8c1a2b3c"
 *         vendor:
 *           type: string
 *           nullable: true
 *           description: Vendor ID if coupon is vendor-specific (null for global/admin coupons)
 *           example: "60d5ec49f1b2c72b8c1a2b3c"
 *         vendorDetails:
 *           type: object
 *           nullable: true
 *           description: Vendor details object (null if coupon is not vendor-specific)
 *           properties:
 *             id:
 *               type: string
 *               example: "60d5ec49f1b2c72b8c1a2b3c"
 *             name:
 *               type: string
 *               example: "Delicious Restaurant"
 *         discountType:
 *           type: string
 *           enum: [percentage, fixed]
 *           description: 'Type of discount - percentage or fixed'
 *           example: "percentage"
 *         discountValue:
 *           type: number
 *           description: Discount value - percentage (0-100) or fixed amount
 *           example: 20
 *         maxDiscountAmount:
 *           type: number
 *           nullable: true
 *           description: Maximum discount amount for percentage discounts (null if no limit)
 *           example: 100
 *         minOrderAmount:
 *           type: number
 *           nullable: true
 *           description: Minimum order amount required to use coupon (null if no minimum)
 *           example: 500
 *         isOneTimeUse:
 *           type: boolean
 *           description: Whether coupon can only be used once per user
 *           example: true
 *         usageLimit:
 *           type: integer
 *           nullable: true
 *           description: Maximum number of times coupon can be used across all users (null for unlimited)
 *           example: 100
 *         usedCount:
 *           type: integer
 *           description: Number of times coupon has been used
 *           example: 45
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Expiry date and time in ISO 8601 format (null if no expiry)
 *           example: "2024-12-31T23:59:59Z"
 *         isActive:
 *           type: boolean
 *           description: Whether coupon is currently active
 *           example: true
 *         description:
 *           type: string
 *           nullable: true
 *           description: Coupon description for display purposes (null if not provided)
 *           example: "Save 20% up to ₹100 on orders above ₹500"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Coupon creation timestamp
 *           example: "2024-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Coupon last update timestamp
 *           example: "2024-01-01T00:00:00.000Z"
 */

