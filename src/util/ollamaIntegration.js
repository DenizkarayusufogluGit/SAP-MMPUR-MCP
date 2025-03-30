const axios = require('axios');
const { logger } = require('./logger');

// Ollama service URL - can be configured via environment variable
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

/**
 * Class for integrating with Ollama LLM service
 */
class OllamaIntegration {
  constructor(config = {}) {
    this.modelName = config.model || 'llama3';
    this.baseUrl = config.baseUrl || OLLAMA_URL;
    this.logger = logger;
  }

  /**
   * Generate a completion from Ollama
   * 
   * @param {string} prompt - The prompt to generate a completion for
   * @param {Object} options - Additional parameters for the completion
   * @returns {Promise<string>} The generated completion
   */
  async generateCompletion(prompt, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.modelName,
        prompt,
        stream: false,
        ...options
      });

      return response.data.response;
    } catch (error) {
      this.logger.error(`Error generating completion from Ollama: ${error.message}`);
      throw new Error(`Failed to generate completion: ${error.message}`);
    }
  }

  /**
   * Process a purchase order query using Ollama
   * 
   * @param {string} query - The user's query about purchase orders
   * @param {Object} context - Additional context about the request
   * @returns {Promise<Object>} The processed query with AI insights
   */
  async processPurchaseOrderQuery(query, context = {}) {
    const systemPrompt = `
      You are a purchase order processing assistant for SAP systems.
      Help the user with their query about purchase orders, based on the provided context.
      
      Available API endpoints:
      - GET /api/purchaseOrder - List all purchase orders
      - GET /api/purchaseOrder/{id} - Get a specific purchase order
      - POST /api/purchaseOrder - Create a new purchase order
      - PUT /api/purchaseOrder/{id} - Update a purchase order
      - DELETE /api/purchaseOrder/{id} - Delete a purchase order
      
      Respond in JSON format with actionable insights.
    `;
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_ctx: 8192,
          num_predict: 1024
        }
      });

      // Parse the response to extract actionable insights
      const aiResponse = response.data.message.content;
      
      // Try to parse as JSON if it's in that format
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (e) {
        parsedResponse = { response: aiResponse };
      }
      
      return {
        query,
        timestamp: new Date().toISOString(),
        aiResponse: parsedResponse,
        context
      };
    } catch (error) {
      this.logger.error(`Error processing purchase order query: ${error.message}`);
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }
  
  /**
   * Check if Ollama service is available
   * 
   * @returns {Promise<boolean>} True if Ollama is available
   */
  async isAvailable() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/version`);
      return response.status === 200;
    } catch (error) {
      this.logger.warn(`Ollama service not available: ${error.message}`);
      return false;
    }
  }
}

module.exports = OllamaIntegration; 