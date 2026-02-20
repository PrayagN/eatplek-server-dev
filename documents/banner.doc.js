/**
 * @swagger
 * tags:
 *   name: Banners
 *   description: Banner management APIs (Admin only)
 */

/**
 * @swagger
 * /api/banners:
 *   post:
 *     summary: Create a new banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - bannerImage
 *               - endDate
 *               - isPrebookRelated
 *             properties:
 *               bannerImage:
 *                 type: string
 *                 format: binary
 *                 description: Banner image file (max 5MB, will be resized to 1200x600)
 *               hotelId:
 *                 type: string
 *                 description: Hotel/Vendor ID (required when isPrebookRelated is true)
 *                 example: "507f1f77bcf86cd799439011"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Banner expiry date (must be in future)
 *                 example: "2025-12-31T23:59:59Z"
 *               isPrebookRelated:
 *                 type: boolean
 *                 description: Whether banner is related to a prebook item (requires hotelId when true)
 *                 example: true
 *               prebookId:
 *                 type: string
 *                 description: Prebook food ID (required if isPrebookRelated is true)
 *                 example: "507f1f77bcf86cd799439012"
 *     responses:
 *       201:
 *         description: Banner created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Hotel or Prebook not found
 *
 * @swagger
 * /api/banners:
 *   get:
 *     summary: Get all banners
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *       - in: query
 *         name: isPrebookRelated
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by prebook related banners
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include expired banners (default excludes expired)
 *     responses:
 *       200:
 *         description: Banners retrieved successfully
 *       401:
 *         description: Unauthorized
 *
 * @swagger
 * /api/banners/{id}:
 *   get:
 *     summary: Get banner by ID
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Banner ID
 *     responses:
 *       200:
 *         description: Banner retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Banner not found
 *
 *   put:
 *     summary: Update banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Banner ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               bannerImage:
 *                 type: string
 *                 format: binary
 *                 description: New banner image file (optional, max 5MB)
 *               hotelId:
 *                 type: string
 *                 nullable: true
 *                 description: Hotel ID (required when isPrebookRelated is true)
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Banner expiry date
 *               isPrebookRelated:
 *                 type: boolean
 *                 description: Prebook related flag
 *               prebookId:
 *                 type: string
 *                 nullable: true
 *                 description: Prebook ID (null to remove)
 *               isActive:
 *                 type: boolean
 *                 description: Active status
 *     responses:
 *       200:
 *         description: Banner updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Banner not found
 *
 *   delete:
 *     summary: Delete banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Banner ID
 *     responses:
 *       200:
 *         description: Banner deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Banner not found
 */

module.exports = {};
