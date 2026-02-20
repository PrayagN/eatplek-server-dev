/**
 * @swagger
 * /api/foods:
 *   post:
 *     summary: Create a new food item (Admin, Super Admin, and Vendor)
 *     description: |
 *       Admins and Super Admins can create food for any vendor.
 *       Vendors can only create food for their own vendor account. The vendor field will be automatically set to their vendor ID.
 *     tags: [Food Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - foodName
 *               - category
 *               - type
 *               - basePrice
 *               - orderTypes
 *             properties:
 *               foodName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 200
 *                 example: Margherita Pizza
 *                 description: Name of the food item
 *               category:
 *                 type: string
 *                 example: 60d5ec49f1b2c72b8c1a2b3c
 *                 description: Food category ID
 *               type:
 *                 type: string
 *                 enum: [veg, non-veg]
 *                 example: veg
 *                 description: Food type (vegetarian or non-vegetarian)
 *               foodImage:
 *                 type: string
 *                 format: binary
 *                 description: Food image file (or provide image URL in JSON)
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Classic Italian pizza with fresh mozzarella, tomato sauce, and basil
 *                 description: Optional description of the food item
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 299.99
 *                 description: Base price of the food item
 *               discountPrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 249.99
 *                 description: Optional discounted price (must be less than base price)
 *               preparationTime:
 *                 type: integer
 *                 minimum: 0
 *                 example: 25
 *                 description: Preparation time in minutes
 *               packingCharges:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *                 example: 10.5
 *                 description: Packing charges for the food item, defaults to 0
 *               orderTypes:
 *                 type: string
 *                 example: '["dine in", "delivery", "take away"]'
 *                 description: Array of order types (JSON string or array)
 *               vendor:
 *                 type: string
 *                 example: 60d5ec49f1b2c72b8c1a2b3c
 *                 description: Vendor ID (required for admins and super admins; ignored for vendors because it is auto-assigned)
 *               addOns:
 *                 type: string
 *                 example: '[{"name": "Extra Cheese", "price": 50}, {"name": "Extra Sauce", "price": 20, "image": "https://.../sauce.png"}]'
 *                 description: >
 *                   Optional add-ons array as JSON string. Each entry may include `name`, `price`, and an optional `image` (URL) field. Uploading an add-on image is not required.
 *               customizations:
 *                 type: string
 *                 example: '[{"name": "Quarter", "price": 100}, {"name": "Half", "price": 150}, {"name": "Full", "price": 250}]'
 *                 description: >
 *                   Optional food customizations array as JSON string. Each entry includes `name` and `price`. Useful for size variations like quarter, half, full portions.
 *               dayOffers:
 *                 type: string
 *                 example: '[{"discountType": "percentage", "discountValue": 10, "activeDays": ["Monday", "Tuesday"], "startTime": "10:00 AM", "endTime": "2:00 PM", "isActive": true}]'
 *                 description: Day-based offers array as JSON string (optional)
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: Whether the food item is active
 *               isPrebook:
 *                 type: boolean
 *                 example: false
 *                 description: Whether this is a prebook food item
 *               prebookStartDate:
 *                 type: string
 *                 format: date
 *                 example: '2024-01-01T00:00:00.000Z'
 *                 description: Start date for prebook availability (required if isPrebook is true)
 *               prebookEndDate:
 *                 type: string
 *                 format: date
 *                 example: '2024-01-31T23:59:59.999Z'
 *                 description: End date for prebook availability (required if isPrebook is true)
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Food'
 *     responses:
 *       201:
 *         description: Food item created successfully
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
 *                   example: Food item created successfully
 *                 data:
 *                   $ref: '#/components/schemas/FoodResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Vendors can only create food for their own account
 *       404:
 *         description: Category or Vendor not found
 */

/**
 * @swagger
 * /api/foods:
 *   get:
 *     summary: Get all food items with filtering, search, and pagination
 *     description: |
 *       Google-like search functionality across food name, description, and add-on names.
 *       Supports multiple filters: category, vendor, type, price range, order type, and active status.
 *     tags: [Food Management]
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
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: |
 *           Google-like search across food name, description, and add-on names.
 *           Case-insensitive partial matching supported.
 *           Example: "pizza" will find "Margherita Pizza", "Pizza Margherita", etc.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: vendor
 *         schema:
 *           type: string
 *         description: Filter by vendor ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [veg, non-veg]
 *         description: Filter by food type
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price filter
 *       - in: query
 *         name: orderType
 *         schema:
 *           type: string
 *           enum: [dine in, take away, delivery, car dine in]
 *         description: Filter by order type
 *       - in: query
 *         name: isPrebook
 *         schema:
 *           type: boolean
 *         description: Filter by prebook status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *           enum: [createdAt, updatedAt, foodName, basePrice]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Food items retrieved successfully
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
 *                   example: Food items retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FoodResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /share/food/{shareSlug}:
 *   get:
 *     summary: Shareable food landing page / JSON data
 *     description: |
 *       Returns the food share page (HTML with social preview meta tags) by default.
 *       Pass `?type=json` to receive the structured JSON payload shown in the share preview.
 *     tags: [Food Sharing]
 *     parameters:
 *       - in: path
 *         name: shareSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Food share slug (human-readable identifier). The legacy food ID is still supported for backwards compatibility.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [json]
 *         description: Return JSON payload instead of HTML preview when set to `json`
 *     responses:
 *       200:
 *         description: Share page or JSON payload returned successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<!DOCTYPE html>..."
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     foodName:
 *                       type: string
 *                       example: Thalassery Dum Biriyani
 *                     foodId:
 *                       type: string
 *                     shareSlug:
 *                       type: string
 *                     foodImage:
 *                       type: string
 *                     actualPrice:
 *                       type: number
 *                     discountPrice:
 *                       type: number
 *                       nullable: true
 *                     specialOfferPrice:
 *                       type: number
 *                       nullable: true
 *                     foodPrice:
 *                       type: number
 *                     cartCount:
 *                       type: number
 *                     customizations:
 *                       type: array
 *                       items:
 *                         type: object
 *                     addOns:
 *                       type: array
 *                       items:
 *                         type: object
 *                     vendorId:
 *                       type: string
 *       404:
 *         description: Food not found
 *       500:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /share/sync:
 *   post:
 *     summary: Ensure all foods have share links
 *     description: |
 *       Generates share links for any foods missing one. Protect this endpoint by setting the `SHARE_SYNC_KEY` environment variable and supplying it via the `X-Share-Sync-Key` header (or `?key=` query parameter).
 *     tags: [Food Sharing]
 *     parameters:
 *       - in: header
 *         name: X-Share-Sync-Key
 *         required: false
 *         schema:
 *           type: string
 *         description: Required when `SHARE_SYNC_KEY` is set on the server.
 *     responses:
 *       200:
 *         description: Share links generated successfully
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
 *                   example: Share links ensured for 42 foods
 *                 updatedCount:
 *                   type: integer
 *       403:
 *         description: Invalid or missing sync key
 *       500:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/foods/{id}:
 *   get:
 *     summary: Get a single food item by ID
 *     tags: [Food Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food item ID
 *     responses:
 *       200:
 *         description: Food item retrieved successfully
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
 *                   example: Food item retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/FoodResponse'
 *       404:
 *         description: Food item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/foods/{id}:
 *   put:
 *     summary: Update a food item (Admin, Super Admin, and Vendor)
 *     description: |
 *       Admins and Super Admins can update any food item.
 *       Vendors can only update their own food items. Vendors cannot change the vendor field.
 *     tags: [Food Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food item ID
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             description: Partial food item data (all fields optional)
 *             properties:
 *               foodName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 200
 *                 example: Margherita Pizza
 *                 description: Name of the food item
 *               category:
 *                 type: string
 *                 example: 60d5ec49f1b2c72b8c1a2b3c
 *                 description: Food category ID
 *               type:
 *                 type: string
 *                 enum: [veg, non-veg]
 *                 example: veg
 *                 description: Food type (vegetarian or non-vegetarian)
 *               foodImage:
 *                 type: string
 *                 format: binary
 *                 description: Food image file (or provide image URL in JSON)
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Classic Italian pizza with fresh mozzarella, tomato sauce, and basil
 *                 description: Optional description of the food item
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 299.99
 *                 description: Base price of the food item
 *               discountPrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 249.99
 *                 description: Optional discounted price (must be less than base price). Set to null or empty to remove discount.
 *               preparationTime:
 *                 type: integer
 *                 minimum: 0
 *                 example: 25
 *                 description: Preparation time in minutes
 *               packingCharges:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *                 example: 10.5
 *                 description: Packing charges for the food item, defaults to 0
 *               orderTypes:
 *                 type: string
 *                 example: '["dine in", "delivery", "take away"]'
 *                 description: Array of order types (JSON string or array)
 *               vendor:
 *                 type: string
 *                 example: 60d5ec49f1b2c72b8c1a2b3c
 *                 description: Vendor ID (required for admins and super admins; ignored for vendors because it is auto-assigned)
 *               addOns:
 *                 type: string
 *                 example: '[{"name": "Extra Cheese", "price": 50}, {"name": "Extra Sauce", "price": 20, "image": "https://.../sauce.png"}]'
 *                 description: >
 *                   Optional add-ons array as JSON string. Each entry may include `name`, `price`, and an optional `image` (URL) field. Uploading an add-on image is not required.
 *               customizations:
 *                 type: string
 *                 example: '[{"name": "Quarter", "price": 100}, {"name": "Half", "price": 150}, {"name": "Full", "price": 250}]'
 *                 description: >
 *                   Optional food customizations array as JSON string. Each entry includes `name` and `price`. Useful for size variations like quarter, half, full portions.
 *               dayOffers:
 *                 type: string
 *                 example: '[{"discountType": "percentage", "discountValue": 10, "activeDays": ["Monday", "Tuesday"], "startTime": "10:00 AM", "endTime": "2:00 PM", "isActive": true}]'
 *                 description: Day-based offers array as JSON string (optional)
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: Whether the food item is active
 *               isPrebook:
 *                 type: boolean
 *                 example: false
 *                 description: Whether this is a prebook food item
 *               prebookStartDate:
 *                 type: string
 *                 format: date
 *                 example: '2024-01-01T00:00:00.000Z'
 *                 description: Start date for prebook availability (required if isPrebook is true)
 *               prebookEndDate:
 *                 type: string
 *                 format: date
 *                 example: '2024-01-31T23:59:59.999Z'
 *                 description: End date for prebook availability (required if isPrebook is true)
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial food item data (all fields optional)
 *     responses:
 *       200:
 *         description: Food item updated successfully
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
 *                   example: Food item updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/FoodResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Vendors can only update their own food items
 *       404:
 *         description: Food item not found
 */

/**
 * @swagger
 * /api/foods/{id}/active:
 *   patch:
 *     summary: Turn a food item on or off (active/inactive)
 *     description: |
 *       Sets the `isActive` flag on a food item without deleting it.
 *       - Admins and Super Admins can change status for any food.
 *       - Vendors can only change status for their own food items.
 *       Body format is kept very simple using a single `status` field.
 *     tags: [Food Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [on, off]
 *                 example: off
 *                 description: |
 *                   Simple toggle value:
 *                   - `"off"` → sets `isActive` to `false`
 *                   - `"on"` → sets `isActive` to `true`
 *           examples:
 *             turnOff:
 *               summary: Turn food off
 *               value:
 *                 status: off
 *             turnOn:
 *               summary: Turn food on
 *               value:
 *                 status: on
 *     responses:
 *       200:
 *         description: Food item status updated successfully
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
 *                   example: Food item turned off successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "60d5ec49f1b2c72b8c1a2b3c"
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Bad request - invalid ID or missing/invalid status payload
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Vendors can only change status of their own food items
 *       404:
 *         description: Food item not found
 */

/**
 * @swagger
 * /api/foods/{id}:
 *   delete:
 *     summary: Soft delete a food item (Admin, Super Admin, and Vendor)
 *     description: |
 *       Sets isActive to false. The food item remains in the database but is marked as inactive.
 *       Admins and Super Admins can delete any food item.
 *       Vendors can only delete their own food items.
 *     tags: [Food Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food item ID
 *     responses:
 *       200:
 *         description: Food item deleted successfully
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
 *                   example: Food item deleted successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Vendors can only delete their own food items
 *       404:
 *         description: Food item not found
 */

/**
 * @swagger
 * /api/foods/{id}/hard:
 *   delete:
 *     summary: Permanently delete a food item (Super Admin only)
 *     description: 'WARNING: This permanently deletes the food item from the database and removes associated images from ImageKit.'
 *     tags: [Food Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food item ID
 *     responses:
 *       200:
 *         description: Food item permanently deleted
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
 *                   example: Food item permanently deleted
 *       401:
 *         description: Unauthorized - Super Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Food item not found
 */

/**
 * @swagger
 * /api/foods/{id}/day-offers:
 *   post:
 *     summary: Add a day offer to a food item
 *     description: |
 *       Add a day-based offer to a food item. Admins and Super Admins can add offers to any food.
 *       Vendors can only add offers to their own food items.
 *     tags: [Offer Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - discountType
 *               - discountValue
 *               - activeDays
 *               - startTime
 *               - endTime
 *             properties:
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 example: percentage
 *                 description: Type of discount
 *               discountValue:
 *                 type: number
 *                 minimum: 0
 *                 example: 10
 *                 description: Discount value (0-100 for percentage, any positive number for fixed)
 *               activeDays:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday]
 *                 example: [Monday, Tuesday, Wednesday]
 *                 description: Days when the offer is active
 *               startTime:
 *                 type: string
 *                 example: "10:00 AM"
 *                 description: Start time in format HH:MM or HH:MM AM/PM
 *               endTime:
 *                 type: string
 *                 example: "2:00 PM"
 *                 description: End time in format HH:MM or HH:MM AM/PM
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 default: true
 *                 description: Whether the offer is active
 *     responses:
 *       201:
 *         description: Day offer added successfully
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
 *                   example: Day offer added successfully
 *                 data:
 *                   $ref: '#/components/schemas/FoodResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Vendors can only add offers to their own food items
 *       404:
 *         description: Food item not found
 */

/**
 * @swagger
 * /api/foods/{id}/day-offers/{offerId}:
 *   delete:
 *     summary: Remove a day offer from a food item
 *     description: |
 *       Remove a day-based offer from a food item. Admins and Super Admins can remove offers from any food.
 *       Vendors can only remove offers from their own food items.
 *     tags: [Offer Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food item ID
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Day offer ID (subdocument _id)
 *     responses:
 *       200:
 *         description: Day offer removed successfully
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
 *                   example: Day offer removed successfully
 *                 data:
 *                   $ref: '#/components/schemas/FoodResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Vendors can only remove offers from their own food items
 *       404:
 *         description: Food item or day offer not found
 */

/**
 * @swagger
 * /api/foods/search:
 *   get:
 *     summary: Search foods by vendor
 *     description: |
 *       Search foods for a specific vendor. Returns only food name, picture, and food ID.
 *       Requires vendor ID either from token (if vendor is authenticated) or as a query parameter.
 *       Only returns active foods for the specified vendor.
 *     tags: [Offer Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vendor
 *         schema:
 *           type: string
 *         description: Vendor ID (required if not authenticated as vendor)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter foods by name or description
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
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Foods retrieved successfully
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
 *                   example: Foods retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       foodId:
 *                         type: string
 *                         example: "60d5ec49f1b2c72b8c1a2b3c"
 *                         description: Food item ID
 *                       foodName:
 *                         type: string
 *                         example: "Margherita Pizza"
 *                         description: Food item name
 *                       picture:
 *                         type: string
 *                         example: "https://example.com/pizza.jpg"
 *                         description: Food item image URL
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         description: Bad request - Vendor ID is required
 *       404:
 *         description: Vendor not found
 */

