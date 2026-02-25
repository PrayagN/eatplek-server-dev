/**
 * @swagger
 * tags:
 *   - name: Cart
 *     description: "Manage customer cart items (6 endpoints: get cart, add/update item, remove single item, clear cart, connect cart, disconnect cart)"
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get current cart for the authenticated user
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart fetched successfully
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
 *                   $ref: '#/components/schemas/CartResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add or update a cart item
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - foodId
 *               - serviceType
 *             properties:
 *               foodId:
 *                 type: string
 *                 description: Food ID to add
 *               quantity:
 *                 oneOf:
 *                   - type: boolean
 *                     description: true to increment by 1, false to decrement by 1
 *                   - type: integer
 *                     minimum: 0
 *                     maximum: 50
 *                     description: Set quantity directly. Use 0 to remove item, or any number 1-50 to set that quantity
 *                 default: true
 *                 example: 10
 *               serviceType:
 *                 type: string
 *                 enum: [dine in, take away, delivery, pickup, car dine in]
 *                 description: >
 *                   Lock cart to a single service type. Cannot mix different service types in one cart.
 *                   Prebook foods (food.isPrebook = true) must use a service type that the food allows, only one prebook
 *                   line can exist at a time, and prebook + regular foods cannot be mixed.
 *               customizations:
 *                 type: array
 *                 description: Selected customization variants with quantities.
 *                 items:
 *                   type: object
 *                   required:
 *                     - customizationId
 *                   properties:
 *                     customizationId:
 *                       type: string
 *                       description: Customization ID (required if food has customizations)
 *                     quantity:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 10
 *                       default: 1
 *                       description: Quantity of this customization. Set to 0 (or send an empty customizations array) to remove the customized line item.
 *                       example: 2
 *               addOns:
 *                 type: array
 *                 description: Selected add-ons with quantities.
 *                 items:
 *                   type: object
 *                   required:
 *                     - addOnId
 *                   properties:
 *                     addOnId:
 *                       type: string
 *                       description: Add-on ID (optional)
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 10
 *                       default: 1
 *                       description: Quantity of this add-on
 *                       example: 2
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional special instructions stored per cart line
 *           examples:
 *             setQuantity:
 *               summary: Set quantity to 10
 *               value:
 *                 foodId: "507f1f77bcf86cd799439011"
 *                 quantity: 10
 *                 serviceType: "dine in"
 *                 customizations:
 *                   - customizationId: "507f1f77bcf86cd799439012"
 *                     quantity: 2
 *                 addOns:
 *                   - addOnId: "507f1f77bcf86cd799439013"
 *                     quantity: 1
 *                 notes: "Extra spicy please"
 *             increment:
 *               summary: Increment by 1 (boolean)
 *               value:
 *                 foodId: "507f1f77bcf86cd799439011"
 *                 quantity: true
 *                 serviceType: "delivery"
 *             remove:
 *               summary: Remove item (quantity = 0)
 *               value:
 *                 foodId: "507f1f77bcf86cd799439011"
 *                 quantity: 0
 *                 serviceType: "dine in"
 *             removeCustomization:
 *               summary: Remove customized line item (customization quantity = 0)
 *               value:
 *                 foodId: "507f1f77bcf86cd799439011"
 *                 quantity: 1
 *                 serviceType: "dine in"
 *                 customizations:
 *                   - customizationId: "507f1f77bcf86cd799439012"
 *                     quantity: 0
 *             prebook:
 *               summary: Add a prebook-only food (cart must contain only prebook items)
 *               value:
 *                 foodId: "507f1f77bcf86cd799439099"
 *                 quantity: 1
 *                 serviceType: "take away"
 *                 notes: "Prebooked for tomorrow"
 *     responses:
 *       201:
 *         description: Item added successfully
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
 *                   $ref: '#/components/schemas/CartResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Vendor or service type conflict
 */

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear the entire cart
 *     description: Removes all items from the user's cart. Safe to call even if the cart is already empty.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared (or already empty)
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
 *                   $ref: '#/components/schemas/CartResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/cart/items/{itemId}:
 *   delete:
 *     summary: Remove a cart item
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item ID to remove
 *     responses:
 *       200:
 *         description: Item removed successfully
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
 *                   $ref: '#/components/schemas/CartResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Cart or item not found
 */

/**
 * @swagger
 * /api/cart/items/{itemId}/add-ons:
 *   get:
 *     summary: Get unselected add-ons for a cart item
 *     description: >
 *       Pass the cart item ID (from `GET /api/cart` items[].id).
 *       Returns only the add-ons that have NOT yet been selected for that specific cart item.
 *       Useful for the "Add More" button in the cart UI.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item ID (from items[].id in GET /api/cart response)
 *     responses:
 *       200:
 *         description: Unselected add-ons retrieved successfully
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
 *                     foodId:
 *                       type: string
 *                     foodName:
 *                       type: string
 *                     addOns:
 *                       type: array
 *                       description: Add-ons NOT yet selected for this cart item
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *                           image:
 *                             type: string
 *                             nullable: true
 *       400:
 *         description: Invalid item ID format
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Cart or item not found
 */

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Connect to another user's cart using cart code
 *     description: >
 *       Allows a user to connect to another user's cart by providing the cart code.
 *       Once connected, both users will see and interact with the same cart items.
 *       When connected, all cart operations (add, update, remove) will work on the shared cart.
 *       Users can only be connected to one cart at a time. Connecting to a new cart will automatically disconnect from the previous one.
 *       IMPORTANT: Your own cart must be empty before connecting. If you have items in your cart, you must clear them first.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cartCode
 *             properties:
 *               cartCode:
 *                 type: string
 *                 description: 'Cart code to connect to (format: CART0001, CART0002, etc.)'
 *                 example: "CART6044"
 *           examples:
 *             connect:
 *               summary: Connect to a cart
 *               value:
 *                 cartCode: "CART6044"
 *     responses:
 *       200:
 *         description: Cart connected successfully (or already connected)
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
 *                   $ref: '#/components/schemas/CartResponse'
 *       400:
 *         description: Validation error, cannot connect to own cart, or user's cart is not empty
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *             examples:
 *               cartNotEmpty:
 *                 summary: User's cart is not empty
 *                 value:
 *                   success: false
 *                   message: "Your cart is not empty. Please clear your cart before connecting to another cart."
 *               ownCart:
 *                 summary: Cannot connect to own cart
 *                 value:
 *                   success: false
 *                   message: "Cannot connect to your own cart"
 *       404:
 *         description: Cart not found with the provided cart code
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/cart/disconnect:
 *   post:
 *     summary: Disconnect from the currently connected cart
 *     description: >
 *       Disconnects the user from the shared cart they are currently connected to.
 *       After disconnecting, the user will return to their own cart (which may be empty).
 *       Safe to call even if not connected to any cart.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart disconnected successfully (or not connected)
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
 *                   $ref: '#/components/schemas/CartResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         foodId:
 *           type: string
 *           description: Food item ID (MongoDB ObjectId)
 *           example: "60d5ec49f1b2c72b8c1a2b3c"
 *         foodName:
 *           type: string
 *         foodImage:
 *           type: string
 *         foodType:
 *           type: string
 *           enum: [veg, non-veg]
 *         quantity:
 *           type: integer
 *         basePrice:
 *           type: number
 *         discountPrice:
 *           type: number
 *           nullable: true
 *         effectivePrice:
 *           type: number
 *         packingCharge:
 *           type: number
 *           description: Packing charge per unit (applies only for take away and delivery)
 *         isPrebook:
 *           type: boolean
 *           description: Indicates whether this cart line represents a prebook-only food item
 *         customizations:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               customizationId:
 *                 type: string
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               quantity:
 *                 type: integer
 *                 default: 1
 *         addOns:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               addOnId:
 *                 type: string
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               quantity:
 *                 type: integer
 *                 default: 1
 *         itemTotal:
 *           type: number
 *         notes:
 *           type: string
 *           nullable: true
 *     CartTotals:
 *       type: object
 *       properties:
 *         subTotal:
 *           type: number
 *         addOnTotal:
 *           type: number
 *         customizationTotal:
 *           type: number
 *         packingChargeTotal:
 *           type: number
 *           description: Total packing charges (applies only for take away and delivery)
 *         discountTotal:
 *           type: number
 *         couponDiscount:
 *           type: number
 *           description: Discount amount from applied coupon
 *         taxAmount:
 *           type: number
 *           description: GST amount calculated using the vendor's GST percentage
 *         taxPercentage:
 *           type: number
 *           description: Vendor GST percentage applied to this cart
 *         grandTotal:
 *           type: number
 *           description: Final total after all discounts and taxes
 *         itemCount:
 *           type: integer
 *     CartResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         cartCode:
 *           type: string
 *           nullable: true
 *           description: 'Unique 8-character cart code (format: CART0001, CART0002, CART0999, CART1000, etc.)'
 *           example: "CART0001"
 *         vendor:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             profileImage:
 *               type: string
 *             place:
 *               type: string
 *             serviceOffered:
 *               type: array
 *               items:
 *                 type: string
 *         serviceType:
 *           type: string
 *         isPrebookCart:
 *           type: boolean
 *           description: True when the cart currently holds prebook items only (regular foods cannot be mixed)
 *         couponCode:
 *           type: string
 *           nullable: true
 *           description: Applied coupon code if any
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         totals:
 *           $ref: '#/components/schemas/CartTotals'
 *         lastUpdatedAt:
 *           type: string
 *           format: date-time
 */

