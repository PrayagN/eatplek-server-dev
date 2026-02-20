const { validationResult } = require('express-validator');
const { uploadFile } = require('../utils/imagekit');

class UploadController {
  async uploadImage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
      }

      const {
        width,
        height,
        format,
        quality,
        folder = 'uploads'
      } = req.body;

      const options = {};
      if (width !== undefined) {
        const parsed = parseInt(width, 10);
        if (!Number.isNaN(parsed)) options.width = parsed;
      }
      if (height !== undefined) {
        const parsed = parseInt(height, 10);
        if (!Number.isNaN(parsed)) options.height = parsed;
      }
      if (format) {
        options.format = format.toLowerCase();
      }
      if (quality !== undefined) {
        const parsed = parseInt(quality, 10);
        if (!Number.isNaN(parsed)) options.quality = parsed;
      }

      const response = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        folder,
        Object.keys(options).length > 0 ? options : null
      );

      return res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: response.url,
          fileId: response.fileId,
          folder,
          size: response.size,
          fileType: response.fileType,
          transformations: options
        }
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      return res.status(500).json({
        success: false,
        message: 'Error uploading image',
        error: error.message
      });
    }
  }
}

module.exports = new UploadController();

