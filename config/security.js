const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/**
 * Security configuration and middleware
 */

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
	return rateLimit({
		windowMs: windowMs, // Time window in milliseconds
		max: max, // Maximum number of requests
		message: {
			success: false,
			message: message || 'Too many requests from this IP, please try again later.'
		},
		standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
		legacyHeaders: false, // Disable the `X-RateLimit-*` headers
		handler: (req, res) => {
			res.status(429).json({
				success: false,
				message: message || 'Too many requests from this IP, please try again later.',
				retryAfter: Math.ceil(windowMs / 1000)
			});
		}
	});
};

// General API rate limiter (100 requests per 15 minutes)
const generalLimiter = createRateLimiter(
	15 * 60 * 1000, // 15 minutes
	100,
	'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for authentication endpoints (5 requests per 15 minutes)
const authLimiter = createRateLimiter(
	15 * 60 * 1000, // 15 minutes
	5,
	'Too many login attempts, please try again after 15 minutes.'
);

// Strict rate limiter for OTP endpoints (3 requests per 15 minutes)
const otpLimiter = createRateLimiter(
	15 * 60 * 1000, // 15 minutes
	3,
	'Too many OTP requests, please try again after 15 minutes.'
);

// Rate limiter for password reset (3 requests per hour)
const passwordResetLimiter = createRateLimiter(
	60 * 60 * 1000, // 1 hour
	3,
	'Too many password reset attempts, please try again after 1 hour.'
);

// Helmet configuration for security headers
const helmetConfig = helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
			scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Swagger UI
			imgSrc: ["'self'", "data:", "https:", "http:"], // Allow images from any source
			fontSrc: ["'self'", "https://fonts.gstatic.com"],
			connectSrc: ["'self'", "https://api-dev.eatplek.com"],
			frameSrc: ["'self'"]
		}
	},
	crossOriginEmbedderPolicy: false, // Disable for Swagger UI compatibility
	crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resources
});

// MongoDB sanitization - prevents NoSQL injection attacks
const mongoSanitizeConfig = mongoSanitize({
	replaceWith: '_',
	onSanitize: ({ req, key }) => {
		console.warn(`[Security] Sanitized MongoDB injection attempt in ${key} from IP: ${req.ip}`);
	}
});

// HTTP Parameter Pollution protection
const hppConfig = hpp({
	whitelist: [
		// Add any parameters you want to allow duplicates for
		'filter',
		'sort',
		'limit',
		'page'
	]
});

// XSS protection - Basic string sanitization
const sanitizeString = (str) => {
	if (typeof str !== 'string') return str;

	// Remove potentially dangerous characters and patterns
	return str
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
		.replace(/javascript:/gi, '') // Remove javascript: protocol
		.replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
		.replace(/<iframe/gi, '') // Remove iframe tags
		.trim();
};

// XSS protection middleware
const xssProtection = (req, res, next) => {
	// Sanitize request body strings
	if (req.body && typeof req.body === 'object') {
		req.body = sanitizeObject(req.body);
	}

	// Sanitize query parameters
	if (req.query && typeof req.query === 'object') {
		req.query = sanitizeObject(req.query);
	}

	next();
};

// Helper function to sanitize objects recursively
const sanitizeObject = (obj) => {
	if (typeof obj !== 'object' || obj === null) {
		return typeof obj === 'string' ? sanitizeString(obj) : obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(item => sanitizeObject(item));
	}

	const sanitized = {};
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			sanitized[key] = sanitizeObject(obj[key]);
		}
	}
	return sanitized;
};

module.exports = {
	generalLimiter,
	authLimiter,
	otpLimiter,
	passwordResetLimiter,
	helmetConfig,
	mongoSanitizeConfig,
	hppConfig,
	xssProtection,
	createRateLimiter,
	sanitizeString,
	sanitizeObject
};

