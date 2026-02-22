const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables first
dotenv.config();

const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swagger');
const swaggerUiOptions = require('./config/swaggerUiOptions');
const registerRoutes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler.js');
const connectDB = require('./config/database.js');

// Security middleware
const {
  helmetConfig,
  mongoSanitizeConfig,
  hppConfig,
  xssProtection,
  generalLimiter,
  authLimiter,
  otpLimiter,
  passwordResetLimiter
} = require('./config/security.js');

// Connect to database
connectDB().catch((error) => {
  console.error('Error during startup tasks:', error);
});

const app = express();
const PORT = process.env.PORT || 3000;
const hostName = process.env.HOST || "0.0.0.0"

// ============================================
// SECURITY MIDDLEWARE (Applied in order)
// ============================================

// 1. Helmet - Set security HTTP headers (must be first)
app.use(helmetConfig);

// 2. Trust proxy (if behind reverse proxy like nginx)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// 3. Rate limiting - Apply general rate limiter to all routes
app.use('/api/', generalLimiter);

// 4. Body parser with size limits (prevent DoS attacks)
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Limit URL-encoded payload size

// 5. Data sanitization against NoSQL injection attacks
app.use(mongoSanitizeConfig);

// 6. XSS protection - Sanitize user input
app.use(xssProtection);

// 7. HTTP Parameter Pollution protection
app.use(hppConfig);

// 8. Request timeout (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({
      success: false,
      message: 'Request timeout. Please try again.'
    });
  });
  next();
});

// ============================================
// STANDARD MIDDLEWARE
// ============================================

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Compression middleware
app.use(compression());

// CORS configuration
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));

// Explicitly handle preflight requests
app.options('*', cors(corsOptions));

// Serve static assets
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerUiOptions));

// Register API routes and endpoints
registerRoutes(app, { authLimiter, otpLimiter, passwordResetLimiter });

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Handle server errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error(`   Please kill the process using port ${PORT} or use a different port.`);
    console.error(`   To find and kill the process, run: lsof -ti:${PORT} | xargs kill -9\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});


module.exports = app;