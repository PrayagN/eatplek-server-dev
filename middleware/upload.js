const multer = require('multer');

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer with memory storage (for ImageKit upload)
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory for ImageKit upload
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;

