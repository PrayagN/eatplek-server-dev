/**
 * Custom error class for API errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Default error
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // Security-related errors - don't leak information
  if (err.message && (
    err.message.includes('CORS') ||
    err.message.includes('Not allowed by CORS') ||
    err.message.includes('rate limit') ||
    err.message.includes('Too many requests')
  )) {
    error.statusCode = error.statusCode || 403;
  }

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response = {
    success: false,
    message: error.message || 'Server Error'
  };

  // Only include stack trace in development
  if (isDevelopment) {
    response.stack = err.stack;
    response.error = err;
  }

  // Log full error details server-side (for debugging)
  if (!isDevelopment && error.statusCode >= 500) {
    console.error('Server Error Details:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }

  res.status(error.statusCode || 500).json(response);
};

/**
 * Catch async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler
};

module.exports.default = errorHandler;

