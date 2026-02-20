/**
 * @swagger
 * /api/food-categories:
 *   post:
 *     summary: Create a new food category (Admin only)
 *     tags: [Food Category Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - categoryName
 *             properties:
 *               categoryName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Italian Cuisine
 *                 description: Name of the food category
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file for the category (or provide image URL in JSON)
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Traditional Italian dishes including pasta, pizza, and risotto
 *                 description: Optional description of the category
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FoodCategory'
 *           examples:
 *             default:
 *               $ref: '#/components/examples/foodCategoryExample'
 *     responses:
 *       201:
 *         description: Food category created successfully
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
 *                   example: Food category created successfully
 *                 data:
 *                   $ref: '#/components/schemas/FoodCategoryResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         description: Unauthorized - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Food category with same name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/food-categories:
 *   get:
 *     summary: Get all food categories with filtering and pagination
 *     tags: [Food Category Management]
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
 *         description: Google-like search across category name and description. Case-insensitive partial matching supported.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
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
 *         description: Food categories retrieved successfully
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
 *                   example: Food categories retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FoodCategoryResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /api/food-categories/{id}:
 *   get:
 *     summary: Get a single food category by ID
 *     tags: [Food Category Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food category ID
 *     responses:
 *       200:
 *         description: Food category retrieved successfully
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
 *                   example: Food category retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/FoodCategoryResponse'
 *       404:
 *         description: Food category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/food-categories/{id}:
 *   put:
 *     summary: Update a food category (Admin only)
 *     tags: [Food Category Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food category ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial food category data (all fields optional)
 *             properties:
 *               categoryName:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: uri
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Food category updated successfully
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
 *                   example: Food category updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/FoodCategoryResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         description: Unauthorized - Admin access required
 *       404:
 *         description: Food category not found
 */

/**
 * @swagger
 * /api/food-categories/{id}:
 *   delete:
 *     summary: Soft delete a food category (Admin only)
 *     tags: [Food Category Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food category ID
 *     responses:
 *       200:
 *         description: Food category deleted successfully
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
 *                   example: Food category deleted successfully
 *       401:
 *         description: Unauthorized - Admin access required
 *       404:
 *         description: Food category not found
 */

/**
 * @swagger
 * /api/food-categories/{id}/hard:
 *   delete:
 *     summary: Permanently delete a food category (Super Admin only)
 *     description: 'WARNING: This permanently deletes the food category from the database'
 *     tags: [Food Category Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food category ID
 *     responses:
 *       200:
 *         description: Food category permanently deleted
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
 *                   example: Food category permanently deleted
 *       401:
 *         description: Unauthorized - Super Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Food category not found
 */

