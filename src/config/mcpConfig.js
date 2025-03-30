/**
 * MCP Server Configuration
 * 
 * This file contains all configuration settings for the MCP server.
 * It defines server parameters, model settings, SAP integration settings,
 * security settings, and more.
 */

require('dotenv').config({ path: process.env.ENV_FILE || './config/.env' });

/**
 * Get environment variable with fallback
 * @param {string} key - Environment variable key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} - Environment variable value or default
 */
function env(key, defaultValue) {
  return process.env[key] !== undefined ? process.env[key] : defaultValue;
}

/**
 * Parse boolean environment variable
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default value if not found
 * @returns {boolean} - Parsed boolean value
 */
function envBool(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
}

/**
 * Parse number environment variable
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value if not found
 * @returns {number} - Parsed number value
 */
function envNum(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

module.exports = {
  /**
   * MCP Server configuration
   */
  server: {
    // Server port
    port: envNum('MCP_PORT', 3000),
    
    // Server host
    host: env('MCP_HOST', '0.0.0.0'),
    
    // Maximum concurrent requests
    maxConcurrentRequests: envNum('MCP_MAX_CONCURRENT_REQUESTS', 100),
    
    // Request timeout in milliseconds
    requestTimeoutMs: envNum('MCP_REQUEST_TIMEOUT_MS', 30000),
    
    // Enable compression for responses
    enableCompression: envBool('MCP_ENABLE_COMPRESSION', true),
    
    // Log level
    logLevel: env('MCP_LOG_LEVEL', 'info')
  },
  
  /**
   * Context window settings
   */
  context: {
    // Maximum tokens for a context window
    maxTokens: envNum('MCP_CONTEXT_MAX_TOKENS', 8192),
    
    // Time-to-live for context windows in milliseconds
    ttlMs: envNum('MCP_CONTEXT_TTL_MS', 3600000), // 1 hour
    
    // Cleanup interval for expired contexts in milliseconds
    cleanupIntervalMs: envNum('MCP_CONTEXT_CLEANUP_INTERVAL_MS', 300000), // 5 minutes
    
    // Default temperature for generation
    defaultTemperature: envNum('MCP_DEFAULT_TEMPERATURE', 0.7),
    
    // Default max tokens for generation
    defaultMaxTokens: envNum('MCP_DEFAULT_MAX_TOKENS', 1024)
  },
  
  /**
   * AI Model settings
   */
  models: {
    // Default model to use
    defaultModel: env('MCP_DEFAULT_MODEL', 'gpt-3.5-turbo'),
    
    // Model providers
    providers: {
      // OpenAI configuration
      openai: {
        apiKey: env('OPENAI_API_KEY', ''),
        models: [
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-16k',
          'gpt-4',
          'gpt-4-vision',
          'gpt-4-turbo'
        ]
      },
      
      // Anthropic configuration
      anthropic: {
        apiKey: env('ANTHROPIC_API_KEY', ''),
        models: [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1'
        ]
      },
      
      // Ollama configuration
      ollama: {
        baseUrl: env('OLLAMA_BASE_URL', 'http://localhost:11434'),
        models: [
          'llama2',
          'mistral',
          'codellama',
          'phi'
        ]
      }
    },
    
    // Endpoint mappings for models
    endpoints: {
      query: '/api/query',
      generate: '/api/generate',
      stream: '/api/stream'
    }
  },
  
  /**
   * SAP ODATA integration settings
   */
  sap: {
    // SAP ODATA service URL
    serviceUrl: env('SAP_SERVICE_URL', 'https://sap.example.com/sap/opu/odata/sap/ZMM_PURCHASE_ORDER_SRV'),
    
    // SAP authentication
    username: env('SAP_USERNAME', ''),
    password: env('SAP_PASSWORD', ''),
    
    // Maximum results per request
    maxResultsPerRequest: envNum('SAP_MAX_RESULTS', 100),
    
    // Cache time-to-live in milliseconds
    cacheTtlMs: envNum('SAP_CACHE_TTL_MS', 300000), // 5 minutes
    
    // Enable schema validation
    validateSchema: envBool('SAP_VALIDATE_SCHEMA', true),
    
    // Entity model mapping
    modelMapping: {
      // Map SAP entity names to AI-friendly names
      PurchaseOrder: 'purchaseOrder',
      PurchaseOrderItem: 'purchaseOrderItem',
      Supplier: 'supplier',
      Material: 'material'
    }
  },
  
  /**
   * Security settings
   */
  security: {
    // Require authentication
    authRequired: envBool('MCP_AUTH_REQUIRED', true),
    
    // API key for server
    apiKey: env('MCP_API_KEY', ''),
    
    // Additional API keys
    additionalApiKeys: [],
    
    // Token validity in milliseconds
    tokenValidityMs: envNum('MCP_TOKEN_VALIDITY_MS', 3600000), // 1 hour
    
    // Rate limiting
    rateLimit: {
      // Time window in milliseconds
      windowMs: envNum('MCP_RATE_LIMIT_WINDOW_MS', 60000), // 1 minute
      
      // Maximum requests per window
      maxRequests: envNum('MCP_RATE_LIMIT_MAX_REQUESTS', 100)
    },
    
    // CORS settings
    cors: {
      // Allowed origins
      allowedOrigins: env('MCP_CORS_ALLOWED_ORIGINS', '*').split(','),
      
      // Allowed methods
      allowedMethods: env('MCP_CORS_ALLOWED_METHODS', 'GET,POST,PUT,DELETE').split(',')
    }
  }
}; 