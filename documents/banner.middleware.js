const multer = require('multer');
const sharp = require('sharp');
const { uploadFile, deleteFile } = require('../utils/imagekit');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image/')) {
		cb(null, true);
	} else {
		cb(new Error('Only image files are allowed'), false);
	}
};

const upload = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 5 * 1024 * 1024 // 5MB limit
	}
});

/**
 * Upload banner image middleware
 */
const uploadBannerImage = upload.single('bannerImage');

/**
 * Process and upload banner image to ImageKit
 */
const processBannerImage = async (req, res, next) => {
	try {
		if (!req.file) {
			return next();
		}

		// Process image with sharp (optimize)
		const processedImage = await sharp(req.file.buffer)
			.resize(1200, 600, {
				fit: 'cover',
				position: 'center'
			})
			.jpeg({ quality: 90 })
			.toBuffer();

		// Upload to ImageKit
		const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
		const uploadResult = await uploadFile(processedImage, fileName, 'banners');

		// Store ImageKit URL and file ID in request body
		req.body.bannerImage = uploadResult.url;
		req.body.bannerImageKitFileId = uploadResult.fileId;

		next();
	} catch (error) {
		console.error('Error processing banner image:', error);
		return res.status(500).json({
			success: false,
			message: 'Error uploading banner image',
			error: error.message
		});
	}
};

module.exports = {
	uploadBannerImage,
	processBannerImage
};
