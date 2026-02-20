const multer = require('multer');
const upload = require('../middleware/upload');

/**
 * Safely parse JSON-like payloads that may arrive as strings
 */
const tryParseJSON = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return undefined;
  }
};

/**
 * Middleware to coerce multipart/form-data payloads into expected shapes
 */
const parseVendorPayload = (req, res, next) => {
  try {
    // serviceOffered can arrive as JSON string, comma separated string, or single value
    if (req.body.serviceOffered && !Array.isArray(req.body.serviceOffered)) {
      let parsed = tryParseJSON(req.body.serviceOffered);
      if (parsed === undefined) {
        parsed = req.body.serviceOffered.split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }
      if (parsed === null) {
        parsed = [];
      }
      req.body.serviceOffered = Array.isArray(parsed) ? parsed : [parsed];
    }

    // operatingHours should be an array of objects
    if (req.body.operatingHours && !Array.isArray(req.body.operatingHours)) {
      const parsed = tryParseJSON(req.body.operatingHours);
      if (parsed === undefined) {
        throw new Error('Unable to parse operatingHours. Please provide a valid JSON array.');
      }
      if (Array.isArray(parsed)) {
        req.body.operatingHours = parsed.map(item => {
          if (typeof item === 'string') {
            const parsedItem = tryParseJSON(item);
            if (parsedItem === undefined) {
              throw new Error('Unable to parse one of the operatingHours entries.');
            }
            return parsedItem;
          }
          return item;
        });
      } else if (parsed == null) {
        req.body.operatingHours = [];
      } else {
        throw new Error('Operating hours must be provided as an array.');
      }
    }

    // bankAccounts should be an array of objects
    if (req.body.bankAccounts && !Array.isArray(req.body.bankAccounts)) {
      const parsed = tryParseJSON(req.body.bankAccounts);
      if (parsed === undefined) {
        throw new Error('Unable to parse bankAccounts. Please provide a valid JSON array.');
      }
      if (Array.isArray(parsed)) {
        req.body.bankAccounts = parsed.map(item => {
          if (typeof item === 'string') {
            const parsedItem = tryParseJSON(item);
            if (parsedItem === undefined) {
              throw new Error('Unable to parse one of the bankAccounts entries.');
            }
            return parsedItem;
          }
          return item;
        });
      } else if (parsed == null) {
        req.body.bankAccounts = [];
      } else {
        // Single object provided, wrap in array for validator
        req.body.bankAccounts = [parsed];
      }
    }

    // address can arrive as JSON string
    if (req.body.address && typeof req.body.address === 'string') {
      const parsed = tryParseJSON(req.body.address);
      if (parsed === undefined) {
        throw new Error('Unable to parse address. Please provide a valid JSON object.');
      }
      req.body.address = parsed || {};
    }

    // address.coordinates can arrive as string
    if (req.body.address && req.body.address.coordinates && !Array.isArray(req.body.address.coordinates)) {
      const parsed = tryParseJSON(req.body.address.coordinates);
      if (parsed === undefined) {
        throw new Error('Unable to parse address.coordinates. Please provide a valid [longitude, latitude] array.');
      }
      req.body.address.coordinates = parsed;
    }

    // Normalize commissionRate into a number
    if (req.body.commissionRate !== undefined) {
      req.body.commissionRate = parseFloat(req.body.commissionRate);
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [
        {
          type: 'field',
          msg: error.message,
          path: 'payload',
          location: 'body'
        }
      ]
    });
  }
};

/**
 * Middleware to transform coordinates array to GeoJSON format
 */
const transformCoordinates = (req, res, next) => {
  if (req.body.address && req.body.address.coordinates) {
    const coords = req.body.address.coordinates;
    // If coordinates is an array (not already GeoJSON), transform it
    if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      req.body.address.coordinates = {
        type: 'Point',
        coordinates: coords
      };
    }
  }
  next();
};

/**
 * Multer upload middleware for vendor images (profileImage and restaurantImage)
 */
const uploadVendorImages = (req, res, next) => {
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'restaurantImage', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 5MB per image'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
};

module.exports = {
  parseVendorPayload,
  transformCoordinates,
  uploadVendorImages
};
