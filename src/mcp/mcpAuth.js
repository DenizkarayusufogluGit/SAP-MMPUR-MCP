/**
 * MCP Authentication Module
 * 
 * Handles authentication for the MCP server.
 * Supports API key authentication.
 */

const crypto = require('crypto');
const mcpConfig = require('../config/mcpConfig');
const { logger } = require('../util/logger');

class McpAuth {
  constructor() {
    // Store of valid API keys (in-memory)
    // For production, use a database or other secure storage
    this.apiKeys = new Map();
    
    // Initialize with API keys from config
    this.initializeApiKeys();
  }
  
  /**
   * Initialize API keys from configuration
   */
  initializeApiKeys() {
    // Add the server's own API key
    if (mcpConfig.security.apiKey) {
      this.apiKeys.set(mcpConfig.security.apiKey, {
        isValid: true,
        scopes: ['*'],
        owner: 'server'
      });
    }
    
    // Add any additional keys from configuration
    if (mcpConfig.security.additionalApiKeys && 
        Array.isArray(mcpConfig.security.additionalApiKeys)) {
      mcpConfig.security.additionalApiKeys.forEach(key => {
        if (key.value && key.scopes) {
          this.apiKeys.set(key.value, {
            isValid: true,
            scopes: key.scopes,
            owner: key.owner || 'unknown'
          });
        }
      });
    }
    
    logger.info(`Initialized ${this.apiKeys.size} API keys`);
  }
  
  /**
   * Authenticate a request
   * Middleware for Express routes
   */
  authenticate(req, res, next) {
    // Skip authentication if not required
    if (!mcpConfig.security.authRequired) {
      return next();
    }
    
    // Get the API key from the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn('Authentication failed: No authorization header');
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    // Check the format of the authorization header
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Invalid authorization format');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authorization format'
      });
    }
    
    // Extract the API key
    const apiKey = authHeader.substring(7);
    
    // Check if the API key exists and is valid
    const keyInfo = this.apiKeys.get(apiKey);
    if (!keyInfo || !keyInfo.isValid) {
      logger.warn('Authentication failed: Invalid API key');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid API key'
      });
    }
    
    // Check if the API key has the required scope
    const requiredScope = this.getScopeForPath(req.path);
    if (!this.hasScope(keyInfo.scopes, requiredScope)) {
      logger.warn(`Authentication failed: Insufficient scope for ${req.path}`);
      return res.status(403).json({
        status: 'error',
        message: `Insufficient permissions for ${req.path}`
      });
    }
    
    // Add the API key info to the request for later use
    req.auth = {
      apiKey,
      owner: keyInfo.owner,
      scopes: keyInfo.scopes
    };
    
    // Continue to the next middleware or route handler
    next();
  }
  
  /**
   * Get the required scope for a path
   * @param {string} path - Request path
   * @returns {string} - Required scope
   */
  getScopeForPath(path) {
    // Map paths to scopes
    // This is a simple implementation - extend as needed
    if (path.startsWith('/api/sap/')) {
      return 'sap:access';
    } else if (path.startsWith('/api/context')) {
      return 'context:manage';
    } else if (path.startsWith('/api/query') || path.startsWith('/api/generate')) {
      return 'model:access';
    } else if (path.startsWith('/api/models')) {
      return 'models:read';
    }
    
    // Default scope for unknown paths
    return 'api:access';
  }
  
  /**
   * Check if a key has the required scope
   * @param {Array} scopes - Scopes assigned to the key
   * @param {string} requiredScope - Required scope
   * @returns {boolean} - Whether the key has the required scope
   */
  hasScope(scopes, requiredScope) {
    // Wildcard scope grants access to everything
    if (scopes.includes('*')) {
      return true;
    }
    
    // Check for exact match
    if (scopes.includes(requiredScope)) {
      return true;
    }
    
    // Check for parent scope
    // e.g. 'sap:*' grants access to 'sap:access'
    const parentScope = requiredScope.split(':')[0] + ':*';
    if (scopes.includes(parentScope)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate a new API key
   * @param {Object} options - Options for the new key
   * @param {Array} options.scopes - Scopes for the new key
   * @param {string} options.owner - Owner of the new key
   * @returns {string} - Generated API key
   */
  generateApiKey(options = {}) {
    const { scopes = ['api:access'], owner = 'generated' } = options;
    
    // Generate a secure random key
    const apiKey = crypto.randomBytes(32).toString('hex');
    
    // Store the key
    this.apiKeys.set(apiKey, {
      isValid: true,
      scopes,
      owner,
      createdAt: new Date()
    });
    
    logger.info(`Generated new API key for ${owner}`);
    return apiKey;
  }
  
  /**
   * Revoke an API key
   * @param {string} apiKey - API key to revoke
   * @returns {boolean} - Success indicator
   */
  revokeApiKey(apiKey) {
    const keyInfo = this.apiKeys.get(apiKey);
    if (!keyInfo) {
      logger.warn(`Attempted to revoke non-existent API key`);
      return false;
    }
    
    // Mark the key as invalid
    keyInfo.isValid = false;
    keyInfo.revokedAt = new Date();
    this.apiKeys.set(apiKey, keyInfo);
    
    logger.info(`Revoked API key for ${keyInfo.owner}`);
    return true;
  }
}

// Create a singleton instance
const mcpAuth = new McpAuth();

// Export the middleware function directly for easier usage
module.exports = {
  authenticate: mcpAuth.authenticate.bind(mcpAuth),
  generateApiKey: mcpAuth.generateApiKey.bind(mcpAuth),
  revokeApiKey: mcpAuth.revokeApiKey.bind(mcpAuth)
}; 