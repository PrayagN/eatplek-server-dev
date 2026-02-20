/**
 * @swagger
 * tags:
 *   name: Media Upload
 *   description: Utility endpoints for uploading media assets to ImageKit.
 */

/**
 * @swagger
 * /api/uploads/image:
 *   post:
 *     summary: Upload a single image to ImageKit with optional resizing and compression
 *     description: |
 *       Accepts a photo in multipart/form-data and uploads it to ImageKit. Optional parameters allow resizing (width/height),
 *       re-encoding to a different format, and adjusting compression quality.
 *     tags: [Media Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (max 5 MB; JPG, PNG, or WebP)
 *               width:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5000
 *                 example: 800
 *                 description: Optional target width in pixels
 *               height:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5000
 *                 example: 600
 *                 description: Optional target height in pixels
 *               format:
 *                 type: string
 *                 enum: [jpeg, jpg, png, webp]
 *                 example: webp
 *                 description: Optional output format (defaults to original)
 *               quality:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 example: 80
 *                 description: Optional compression quality (applies when supported by the selected format)
 *               folder:
 *                 type: string
 *                 example: marketing/banners
 *                 description: Optional ImageKit folder. Defaults to `uploads`.
 *     responses:
 *       200:
 *         description: Image uploaded successfully
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
 *                   example: Image uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       format: uri
 *                       example: https://ik.imagekit.io/eatplek/uploads/abc123.webp
 *                     fileId:
 *                       type: string
 *                       example: 665f2d3a2d0e9f6c4f2b1234
 *                     folder:
 *                       type: string
 *                       example: uploads
 *                     size:
 *                       type: integer
 *                       example: 154321
 *                       description: Final file size in bytes
 *                     fileType:
 *                       type: string
 *                       example: image/webp
 *                     transformations:
 *                       type: object
 *                       description: Transformation options applied during upload
 *       400:
 *         description: Validation error or missing image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error uploading image
 */

