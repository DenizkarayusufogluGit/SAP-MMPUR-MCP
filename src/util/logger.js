/**
 * Logger Utility
 * 
 * Provides logging functionality for the application.
 * Uses Winston for logging to console and file.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure log file path
const logFilePath = process.env.LOG_FILE_PATH || path.join(logsDir, 'server.log');

// Determine if we're in production environment
const isProduction = process.env.NODE_ENV === 'production';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Create format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Create format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  isProduction
    ? winston.format.json()
    : winston.format.printf(
        info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
      )
);

// Configure Winston logger
const logger = winston.createLogger({
  level: isProduction ? 'info' : process.env.LOG_LEVEL || 'debug',
  levels,
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.splat()
  ),
  defaultMeta: { 
    service: 'sap-mmpur-mcp',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write to console in development or if specifically enabled
    ...(isProduction && process.env.CONSOLE_LOGGING !== 'true' ? [] : [
      new winston.transports.Console({
        format: consoleFormat
      })
    ]),
    
    // Write to log file
    new winston.transports.File({
      filename: logFilePath,
      maxsize: 5242880, // 5MB
      maxFiles: isProduction ? 10 : 5,
      tailable: true,
      format: fileFormat
    }),
    
    // In production, also write errors to a separate file
    ...(isProduction ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 10,
        format: fileFormat
      })
    ] : [])
  ],
  // Prevent winston from exiting on error
  exitOnError: false
});

// Sanitize sensitive information from logs
const sanitizeSensitiveData = (message) => {
  if (typeof message !== 'string') return message;
  
  // Mask API keys
  message = message.replace(/(api[_-]?key|apikey|token|password)["']?\s*[:=]\s*["']?([^"'\s]{4})([^"'\s]+)(["'\s]|$)/gi, '$1: "$2***$4');
  
  return message;
};

// Create a custom logger that sanitizes data
const safeLogger = {
  error: (message, ...args) => logger.error(sanitizeSensitiveData(message), ...args),
  warn: (message, ...args) => logger.warn(sanitizeSensitiveData(message), ...args),
  info: (message, ...args) => logger.info(sanitizeSensitiveData(message), ...args),
  http: (message, ...args) => logger.http(sanitizeSensitiveData(message), ...args),
  debug: (message, ...args) => logger.debug(sanitizeSensitiveData(message), ...args),
  log: (level, message, ...args) => logger.log(level, sanitizeSensitiveData(message), ...args)
};

// Add request logging middleware for Express
const expressLogger = (req, res, next) => {
  // Skip logging for health check endpoints to avoid log pollution
  if (req.path === '/health' && isProduction) {
    return next();
  }
  
  const start = Date.now();
  
  // Sanitize authorization headers
  const sanitizedHeaders = { ...req.headers };
  if (sanitizedHeaders.authorization) {
    sanitizedHeaders.authorization = sanitizedHeaders.authorization.replace(
      /^(Bearer\s+)([a-zA-Z0-9\-_\.]+)(.*)$/i,
      '$1***TOKEN***$3'
    );
  }
  
  // Log request
  safeLogger.http(`REQUEST: ${req.method} ${req.originalUrl} - User-Agent: ${req.get('user-agent') || 'Unknown'}`);
  
  // Log when the request is complete
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `RESPONSE: ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 500) {
      safeLogger.error(message);
    } else if (res.statusCode >= 400) {
      safeLogger.warn(message);
    } else {
      safeLogger.http(message);
    }
  });
  
  next();
};

module.exports = {
  logger: safeLogger,
  expressLogger,
}; 