/**
 * MCP Context Manager
 * 
 * Handles the creation, storage, retrieval, updating, and deletion of MCP contexts.
 * Contexts are used to maintain conversation history and state for AI model interactions.
 */

const crypto = require('crypto');
const mcpConfig = require('../config/mcpConfig');
const { logger } = require('../util/logger');

class McpContextManager {
  constructor() {
    // In-memory context storage - for production use, replace with a database
    this.contexts = new Map();
    
    // Context cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredContexts();
    }, mcpConfig.context.cleanupIntervalMs);
  }
  
  /**
   * Create a new context
   * @param {Object} options - Context creation options
   * @param {string} options.model - Model identifier
   * @param {number} options.maxTokens - Maximum tokens for the context
   * @param {Array} options.contents - Initial context contents
   * @returns {string} - Context ID
   */
  async createContext(options) {
    const { model, maxTokens, contents } = options;
    
    // Generate unique context ID
    const contextId = crypto.randomUUID();
    
    // Create the context object
    const context = {
      id: contextId,
      model,
      maxTokens: maxTokens || mcpConfig.context.maxTokens,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + mcpConfig.context.ttlMs),
      tokenCount: 0,
      contents: contents || []
    };
    
    // Store the context
    this.contexts.set(contextId, context);
    
    logger.info(`Created context ${contextId} for model ${model}`);
    return contextId;
  }
  
  /**
   * Get a context by its ID
   * @param {string} contextId - Context ID
   * @returns {Object|null} - Context object or null if not found
   */
  async getContext(contextId) {
    const context = this.contexts.get(contextId);
    
    if (!context) {
      logger.warn(`Context ${contextId} not found`);
      return null;
    }
    
    // Update the expiration time
    context.expiresAt = new Date(Date.now() + mcpConfig.context.ttlMs);
    context.updatedAt = new Date();
    
    return context;
  }
  
  /**
   * Update a context
   * @param {string} contextId - Context ID
   * @param {string} operation - Operation to perform ('append', 'replace', 'clear')
   * @param {Object} content - Content to be added or used for replacement
   * @returns {Object|null} - Updated context or null if not found
   */
  async updateContext(contextId, operation, content) {
    const context = await this.getContext(contextId);
    
    if (!context) {
      return null;
    }
    
    switch (operation) {
      case 'append':
        context.contents.push(content);
        break;
      case 'replace':
        context.contents = [content];
        break;
      case 'clear':
        context.contents = [];
        break;
      default:
        throw new Error(`Unknown context operation: ${operation}`);
    }
    
    // Estimate token count (very simplified)
    // In a real application, use a proper tokenizer for the specific model
    context.tokenCount = context.contents.reduce((count, item) => {
      const contentStr = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
      return count + Math.ceil(contentStr.length / 4); // Very rough estimate
    }, 0);
    
    // Check if token count exceeds the limit
    if (context.tokenCount > context.maxTokens) {
      logger.warn(`Context ${contextId} exceeded token limit. Removing oldest messages.`);
      
      // Remove oldest messages until token count is under the limit
      while (context.tokenCount > context.maxTokens && context.contents.length > 0) {
        const removed = context.contents.shift();
        const removedContent = typeof removed.content === 'string' ? removed.content : JSON.stringify(removed.content);
        context.tokenCount -= Math.ceil(removedContent.length / 4);
      }
    }
    
    context.updatedAt = new Date();
    context.expiresAt = new Date(Date.now() + mcpConfig.context.ttlMs);
    
    // Update the context in storage
    this.contexts.set(contextId, context);
    
    logger.info(`Updated context ${contextId} with operation ${operation}`);
    return context;
  }
  
  /**
   * Delete a context
   * @param {string} contextId - Context ID
   * @returns {boolean} - Success indicator
   */
  async deleteContext(contextId) {
    if (!this.contexts.has(contextId)) {
      logger.warn(`Attempted to delete non-existent context ${contextId}`);
      return false;
    }
    
    this.contexts.delete(contextId);
    logger.info(`Deleted context ${contextId}`);
    return true;
  }
  
  /**
   * Clean up expired contexts
   */
  cleanupExpiredContexts() {
    const now = new Date();
    let expiredCount = 0;
    
    for (const [contextId, context] of this.contexts.entries()) {
      if (context.expiresAt < now) {
        this.contexts.delete(contextId);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.info(`Cleaned up ${expiredCount} expired contexts`);
    }
  }
  
  /**
   * Stop the context manager and clean up resources
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

module.exports = new McpContextManager(); 