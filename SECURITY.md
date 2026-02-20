# Security Documentation

This document outlines the security measures implemented in the Eatplek API server.

## Security Features

### 1. Helmet.js - Security Headers
- **Purpose**: Sets various HTTP headers to protect against common vulnerabilities
- **Implementation**: Configured with Content Security Policy (CSP) for XSS protection
- **Location**: `config/security.js`

### 2. Rate Limiting
Protects against brute force attacks and DoS attacks:

- **General API Rate Limiter**: 100 requests per 15 minutes per IP
- **Authentication Rate Limiter**: 5 requests per 15 minutes per IP
- **OTP Rate Limiter**: 3 requests per 15 minutes per IP
- **Password Reset Rate Limiter**: 3 requests per hour per IP

**Applied Routes:**
- `/api/admin/auth/*` - Authentication endpoints
- `/api/vendor-auth/*` - Vendor authentication
- `/api/users/send-otp` - OTP sending
- `/api/users/verify-otp` - OTP verification
- `/api/users/reset-password` - Password reset
- All other `/api/*` routes - General rate limiting

### 3. MongoDB Injection Protection
- **Purpose**: Prevents NoSQL injection attacks
- **Implementation**: Uses `express-mongo-sanitize` to sanitize user input
- **Behavior**: Replaces dangerous MongoDB operators with safe characters

### 4. XSS (Cross-Site Scripting) Protection
- **Purpose**: Prevents XSS attacks by sanitizing user input
- **Implementation**: Custom middleware that sanitizes request body, query parameters, and URL parameters
- **Features**:
  - Removes script tags
  - Removes JavaScript protocol handlers
  - Removes event handlers (onclick, onerror, etc.)
  - Removes iframe tags

### 5. HTTP Parameter Pollution (HPP) Protection
- **Purpose**: Prevents HTTP parameter pollution attacks
- **Implementation**: Uses `hpp` middleware
- **Whitelist**: Allows duplicates for `filter`, `sort`, `limit`, `page` parameters

### 6. Request Size Limits
- **JSON Payload**: Maximum 10MB
- **URL-encoded Payload**: Maximum 10MB
- **Purpose**: Prevents DoS attacks through large payloads

### 7. Request Timeout
- **Timeout**: 30 seconds
- **Purpose**: Prevents long-running requests from consuming server resources

### 8. CORS (Cross-Origin Resource Sharing)
- **Configuration**: Environment-based allowed origins
- **Credentials**: Enabled for authenticated requests
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, Accept

### 9. Error Handling Security
- **Production Mode**: Hides stack traces and internal error details
- **Development Mode**: Shows detailed error information for debugging
- **Logging**: Server-side logging of all errors with request details

## Environment Variables

Add these to your `.env` file:

```env
# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Trust Proxy (if behind reverse proxy like nginx)
TRUST_PROXY=false

# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3000
HOST=localhost
```

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files to version control
- Use strong, unique values for JWT secrets
- Rotate secrets regularly in production

### 2. Database Security
- Use strong MongoDB connection strings
- Enable MongoDB authentication
- Use MongoDB Atlas IP whitelisting in production

### 3. API Authentication
- Always use HTTPS in production
- Implement token expiration
- Use secure cookie settings for sessions

### 4. Input Validation
- All user input is validated using `express-validator`
- Sanitization happens automatically via security middleware
- Always validate on both client and server side

### 5. Rate Limiting
- Adjust rate limits based on your application needs
- Monitor rate limit violations for potential attacks
- Consider implementing IP whitelisting for trusted sources

### 6. Logging and Monitoring
- Monitor security-related logs
- Set up alerts for suspicious activity
- Regularly review access logs

## Security Headers Set by Helmet

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Strict-Transport-Security` - Forces HTTPS (in production)
- `Content-Security-Policy` - Controls resource loading
- `Referrer-Policy` - Controls referrer information

## Testing Security

### Test Rate Limiting
```bash
# Test general rate limit (should fail after 100 requests)
for i in {1..101}; do curl http://localhost:3000/api/health; done
```

### Test CORS
```bash
# Test from different origin (should fail if not in allowed origins)
curl -H "Origin: http://malicious-site.com" http://localhost:3000/api/health
```

### Test Input Sanitization
```bash
# Test MongoDB injection attempt
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": {"$ne": null}}'
```

## Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** create a public GitHub issue
2. Email security concerns to your security team
3. Include detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Updates and Maintenance

- Regularly update dependencies: `npm audit` and `npm update`
- Review and update rate limits based on usage patterns
- Monitor security advisories for used packages
- Keep Node.js and MongoDB updated to latest stable versions

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)

