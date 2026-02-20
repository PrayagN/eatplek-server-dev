const express = require('express');
const router = express.Router();
const {
	createBanner,
	getAllBanners,
	getBannerById,
	updateBanner,
	deleteBanner
} = require('../controllers/bannerController');
const {
	createBannerValidation,
	updateBannerValidation,
	getBannersValidation,
	bannerIdValidation
} = require('../validations/banner.validations');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { uploadBannerImage, processBannerImage } = require('../documents/banner.middleware');

// Banner routes accessible to admins and vendors
router.post('/', 
	authenticateToken, 
	requireRole('admin', 'super_admin', 'vendor'), 
	uploadBannerImage,
	processBannerImage,
	createBannerValidation, 
	createBanner
);
router.get('/', authenticateToken, requireRole('admin', 'super_admin', 'vendor'), getBannersValidation, getAllBanners);
router.get('/:id', authenticateToken, requireRole('admin', 'super_admin', 'vendor'), bannerIdValidation, getBannerById);
router.put('/:id', 
	authenticateToken, 
	requireRole('admin', 'super_admin', 'vendor'),
	uploadBannerImage,
	processBannerImage,
	updateBannerValidation, 
	updateBanner
);
router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin' , 'vendor'), bannerIdValidation, deleteBanner);

module.exports = router;
