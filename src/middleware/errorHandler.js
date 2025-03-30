/**
 * Centralized error handling middleware
 * Provides consistent error responses and proper logging based on environment
 */
const { logger } = require('../util/logger');

// Custom Error class for API errors
class APIError extends Error {
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Known error types mapping
const errorTypes = {
  ValidationError: { statusCode: 400, log: 'warn' },
  AuthenticationError: { statusCode: 401, log: 'warn' },
  AuthorizationError: { statusCode: 403, log: 'warn' },
  NotFoundError: { statusCode: 404, log: 'info' },
  ConflictError: { statusCode: 409, log: 'warn' },
  RateLimitError: { statusCode: 429, log: 'warn' },
  SAPConnectionError: { statusCode: 503, log: 'error' },
  SAPDataError: { statusCode: 502, log: 'error' },
  DatabaseError: { statusCode: 500, log: 'error' },
  ConfigurationError: { statusCode: 500, log: 'error' },
  APIError: { statusCode: 500, log: 'error' },
  Error: { statusCode: 500, log: 'error' },
};

/**
 * Central error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Get error information
  const errorName = err.name || 'Error';
  const errorInfo = errorTypes[errorName] || errorTypes.Error;
  const statusCode = err.statusCode || errorInfo.statusCode;
  const errorCode = err.errorCode || `ERR_${errorName.toUpperCase()}`;
  
  // Prepare log message and metadata
  const requestId = req.id || 'unknown';
  const logLevel = errorInfo.log;
  const logMessage = `${errorName}: ${err.message}`;
  const logMeta = {
    statusCode,
    errorCode,
    path: req.path,
    method: req.method,
    requestId,
    userId: req.user?.id || 'unauthenticated',
    ip: req.ip,
    stack: isProduction ? undefined : err.stack
  };
  
  // Log the error appropriately
  logger[logLevel](logMessage, logMeta);
  
  // Prepare response - sanitize/mask information in production
  const response = {
    status: 'error',
    code: errorCode,
    message: isProduction && statusCode === 500 
      ? 'Internal server error' 
      : err.message
  };
  
  // Include stack trace in non-production environments and not for client errors
  if (!isProduction && statusCode >= 500) {
    response.stack = err.stack;
  }
  
  // If error has additional data, include it (except in production 500 errors)
  if (err.data && !(isProduction && statusCode === 500)) {
    response.data = err.data;
  }
  
  // Send error response
  res.status(statusCode).json(response);
};

// Export the error handling components
module.exports = {
  errorHandler,
  APIError,
  // Export specialized error classes for use throughout the app
  ValidationError: class ValidationError extends APIError {
    constructor(message, data = null) {
      super(message, 400, 'ERR_VALIDATION');
      this.data = data;
    }
  },
  AuthenticationError: class AuthenticationError extends APIError {
    constructor(message) {
      super(message, 401, 'ERR_AUTHENTICATION');
    }
  },
  AuthorizationError: class AuthorizationError extends APIError {
    constructor(message) {
      super(message, 403, 'ERR_AUTHORIZATION');
    }
  },
  NotFoundError: class NotFoundError extends APIError {
    constructor(message) {
      super(message, 404, 'ERR_NOT_FOUND');
    }
  },
  ConflictError: class ConflictError extends APIError {
    constructor(message) {
      super(message, 409, 'ERR_CONFLICT');
    }
  },
  RateLimitError: class RateLimitError extends APIError {
    constructor(message) {
      super(message, 429, 'ERR_RATE_LIMIT');
    }
  },
  SAPConnectionError: class SAPConnectionError extends APIError {
    constructor(message) {
      super(message, 503, 'ERR_SAP_CONNECTION');
    }
  },
  SAPDataError: class SAPDataError extends APIError {
    constructor(message, data = null) {
      super(message, 502, 'ERR_SAP_DATA');
      this.data = data;
    }
  }
}; 