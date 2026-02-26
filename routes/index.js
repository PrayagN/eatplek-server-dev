const adminAuthRouter = require('../routers/adminAuthRouter');
const vendorAuthRouter = require('../routers/vendorAuthRouter');
const userRouter = require('../routers/userRouter');
const vendorRouter = require('../routers/vendorRouter');
const foodCategoryRouter = require('../routers/foodCategoryRouter');
const foodRouter = require('../routers/foodRouter');
const uploadRouter = require('../routers/uploadRouter');
const bannerRouter = require('../routers/bannerRouter');
const cartRouter = require('../routers/cartRouter');
const bookingRouter = require('../routers/bookingRouter');
const couponRouter = require('../routers/couponRouter');
const vendorOrderRouter = require('../routers/vendorOrderRouter');
const shareRouter = require('../routers/shareRouter');

/**
 * Registers all application routes and related middleware
 * @param {Express.Application} app - Express application instance
 * @param {Object} options - Route configuration options
 * @param {Function} options.authLimiter - Rate limiter for auth routes
 * @param {Function} options.otpLimiter - Rate limiter for OTP routes
 * @param {Function} options.passwordResetLimiter - Rate limiter for password reset routes
 */
const registerRoutes = (app, { authLimiter, otpLimiter, passwordResetLimiter }) => {

	app.use((req, res, next) => {
		console.log(`[DEBUG] ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
		next();
	});
	// ============================================
	// AUTH ROUTES WITH STRICT RATE LIMITING
	// ============================================
	app.use('/api/admin/auth', authLimiter);
	app.use('/api/vendor-auth', authLimiter);
	app.use('/api/users/send-otp', otpLimiter);
	app.use('/api/users/verify-otp', otpLimiter);
	app.use('/api/users/reset-password', passwordResetLimiter);

	// ============================================
	// PRIMARY API ROUTES
	// ============================================
	app.use('/api/cart', cartRouter);
	app.use('/api/admin', adminAuthRouter);
	app.use('/api/vendors', vendorRouter);
	app.use('/api/vendor-auth', vendorAuthRouter);
	app.use('/api/food-categories', foodCategoryRouter);
	app.use('/api/foods', foodRouter);
	app.use('/api/users', userRouter);
	app.use('/api/uploads', uploadRouter);
	app.use('/api/banners', bannerRouter);
	app.use('/api/bookings', bookingRouter);
	app.use('/api/coupons', couponRouter);
	app.use('/api/vendor', vendorOrderRouter);
	app.use('/share', shareRouter);

	// ============================================
	// HEALTH & ROOT ROUTES
	// ============================================
	app.get('/health', (req, res) => {
		res.json({
			success: true,
			message: 'Server is running',
			timestamp: new Date().toISOString()
		});
	});

	app.get('/', (req, res) => {
		res.json({
			success: true,
			message: 'Welcome to Eatplek API',
			version: '1.0.0',
			documentation: '/api/docs'
		});
	});

	// ============================================
	// 404 HANDLER (must be last)
	// ============================================
	app.use((req, res) => {
		res.status(404).json({
			success: false,
			message: 'Route not found'
		});
	});
};

module.exports = registerRoutes;

