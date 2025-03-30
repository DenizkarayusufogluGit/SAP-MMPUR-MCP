/**
 * Authentication Middleware
 * Supports JWT and API Key authentication
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logger } = require('../util/logger');
const { AuthenticationError } = require('./errorHandler');

/**
 * Authenticates requests using JWT or API Key
 */
const authenticate = (req, res, next) => {
  try {
    // Check for API Key in header
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return authenticateWithApiKey(req, res, next, apiKey);
    }

    // Check for JWT in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return authenticateWithJwt(req, res, next, token);
    }

    // No authentication provided
    throw new AuthenticationError('Authentication required');
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate with API Key
 */
const authenticateWithApiKey = (req, res, next, apiKey) => {
  // Get the expected API key from environment
  const expectedApiKey = process.env.API_KEY;
  
  if (!expectedApiKey) {
    logger.error('API_KEY not configured in environment');
    throw new AuthenticationError('Authentication configuration error');
  }

  // Use constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(
    Buffer.from(apiKey), 
    Buffer.from(expectedApiKey)
  )) {
    throw new AuthenticationError('Invalid API key');
  }

  // Add basic user info to request
  req.user = {
    id: 'api-client',
    type: 'api-key',
    scope: 'api'
  };

  next();
};

/**
 * Authenticate with JWT
 */
const authenticateWithJwt = (req, res, next, token) => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    logger.error('JWT_SECRET not configured in environment');
    throw new AuthenticationError('Authentication configuration error');
  }

  try {
    // Verify the JWT
    const decoded = jwt.verify(token, jwtSecret);
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      throw new AuthenticationError('Token expired');
    }
    
    // Set user data from token
    req.user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      roles: decoded.roles || [],
      scope: decoded.scope || 'user',
      type: 'jwt'
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expired');
    } else {
      throw error;
    }
  }
};

/**
 * Generates a JWT token for a user
 */
const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  
  if (!jwtSecret) {
    logger.error('JWT_SECRET not configured in environment');
    throw new Error('JWT_SECRET must be configured');
  }

  const payload = {
    sub: user.id,
    email: user.email,
    roles: user.roles || [],
    scope: user.scope || 'user'
  };

  return jwt.sign(payload, jwtSecret, { expiresIn });
};

/**
 * Middleware to check if user has required roles
 */
const checkRoles = (requiredRoles) => {
  return (req, res, next) => {
    // Make sure authentication middleware has run
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // API keys have full access
    if (req.user.type === 'api-key') {
      return next();
    }

    // Check if user has any of the required roles
    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      const error = new AuthenticationError('Insufficient permissions');
      error.statusCode = 403; // Forbidden
      throw error;
    }
    
    next();
  };
};

module.exports = {
  authenticate,
  generateToken,
  checkRoles
}; 