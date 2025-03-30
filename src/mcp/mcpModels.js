/**
 * MCP Models Module
 * 
 * Handles interactions with AI models through the MCP protocol.
 * Supports multiple model providers including OpenAI, Anthropic, and Ollama.
 */

const axios = require('axios');
const mcpConfig = require('../config/mcpConfig');
const mcpContextManager = require('./mcpContextManager');
const { logger } = require('../util/logger');

class McpModels {
  constructor() {
    // Model providers and their configurations
    this.providers = {
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: mcpConfig.models.providers.openai.apiKey,
        supportedModels: mcpConfig.models.providers.openai.models || []
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: mcpConfig.models.providers.anthropic.apiKey,
        supportedModels: mcpConfig.models.providers.anthropic.models || []
      },
      ollama: {
        baseUrl: mcpConfig.models.providers.ollama.baseUrl || 'http://localhost:11434',
        supportedModels: mcpConfig.models.providers.ollama.models || []
      }
    };
  }
  
  /**
   * Get the provider for a model
   * @param {string} modelId - Model identifier
   * @returns {Object} - Provider information
   */
  getProviderForModel(modelId) {
    for (const [providerName, provider] of Object.entries(this.providers)) {
      if (provider.supportedModels.includes(modelId)) {
        return { name: providerName, ...provider };
      }
    }
    
    throw new Error(`No provider found for model ${modelId}`);
  }
  
  /**
   * Get available models
   * @returns {Array} - List of available models
   */
  async getAvailableModels() {
    const models = [];
    
    for (const [providerName, provider] of Object.entries(this.providers)) {
      // Only include providers with configured models
      if (provider.supportedModels && provider.supportedModels.length > 0) {
        for (const modelId of provider.supportedModels) {
          models.push({
            id: modelId,
            provider: providerName,
            capabilities: await this.getModelCapabilities(modelId)
          });
        }
      }
    }
    
    return models;
  }
  
  /**
   * Get model capabilities
   * @param {string} modelId - Model identifier
   * @returns {Object} - Model capabilities
   */
  async getModelCapabilities(modelId) {
    // Default capabilities
    const capabilities = {
      contextSize: 2048,
      supportsFunctions: false,
      supportsVision: false,
      supportsStreaming: true
    };
    
    try {
      const provider = this.getProviderForModel(modelId);
      
      // Set provider-specific capabilities
      switch (provider.name) {
        case 'openai':
          // OpenAI models capabilities
          if (modelId.includes('gpt-4')) {
            capabilities.contextSize = modelId.includes('32k') ? 32768 : 8192;
            capabilities.supportsFunctions = true;
            capabilities.supportsVision = modelId.includes('vision');
          } else if (modelId.includes('gpt-3.5-turbo')) {
            capabilities.contextSize = modelId.includes('16k') ? 16384 : 4096;
            capabilities.supportsFunctions = true;
          }
          break;
          
        case 'anthropic':
          // Anthropic models capabilities
          if (modelId.includes('claude-3')) {
            capabilities.contextSize = 200000;
            capabilities.supportsVision = true;
          } else if (modelId.includes('claude-2')) {
            capabilities.contextSize = 100000;
          } else {
            capabilities.contextSize = 9000;
          }
          break;
          
        case 'ollama':
          // Ollama models capabilities - these vary by model
          capabilities.contextSize = 4096;  // Default for most Ollama models
          // Can be overridden with specific values if known
          break;
      }
      
      return capabilities;
      
    } catch (error) {
      logger.error(`Error getting capabilities for model ${modelId}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Query a model
   * @param {Object} options - Query options
   * @param {string} options.contextId - Context ID
   * @param {string} options.query - Query text
   * @param {string} options.model - Model to use
   * @returns {Object} - Query result
   */
  async query(options) {
    const { contextId, query, model = mcpConfig.models.defaultModel } = options;
    
    try {
      // Get context if provided
      let context = null;
      if (contextId) {
        context = await mcpContextManager.getContext(contextId);
        if (!context) {
          throw new Error(`Context ${contextId} not found`);
        }
      }
      
      // Get provider for the model
      const provider = this.getProviderForModel(model);
      
      // Create messages based on context and query
      const messages = [];
      
      if (context && context.contents.length > 0) {
        messages.push(...context.contents);
      }
      
      // Add the user query
      messages.push({
        role: 'user',
        content: query
      });
      
      // Call the appropriate provider
      let response;
      switch (provider.name) {
        case 'openai':
          response = await this.callOpenAI(model, messages);
          break;
        case 'anthropic':
          response = await this.callAnthropic(model, messages);
          break;
        case 'ollama':
          response = await this.callOllama(model, messages);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider.name}`);
      }
      
      // Update context if provided
      if (contextId && response.responseMessage) {
        await mcpContextManager.updateContext(contextId, 'append', response.responseMessage);
      }
      
      return response;
      
    } catch (error) {
      logger.error(`Error querying model ${model}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Generate content using a model
   * @param {Object} options - Generation options
   * @param {string} options.contextId - Context ID
   * @param {string} options.prompt - Prompt text
   * @param {string} options.model - Model to use
   * @param {Object} options.parameters - Generation parameters
   * @returns {Object} - Generation result
   */
  async generate(options) {
    const { 
      contextId, 
      prompt, 
      model = mcpConfig.models.defaultModel,
      parameters = {}
    } = options;
    
    try {
      // Get context if provided
      let context = null;
      if (contextId) {
        context = await mcpContextManager.getContext(contextId);
        if (!context) {
          throw new Error(`Context ${contextId} not found`);
        }
      }
      
      // Get provider for the model
      const provider = this.getProviderForModel(model);
      
      // Create messages based on context and prompt
      const messages = [];
      
      if (context && context.contents.length > 0) {
        messages.push(...context.contents);
      }
      
      // Add the prompt if provided
      if (prompt) {
        messages.push({
          role: 'user',
          content: prompt
        });
      } else if (!context || context.contents.length === 0) {
        throw new Error('Either prompt or non-empty context is required');
      }
      
      // Call the appropriate provider
      let response;
      switch (provider.name) {
        case 'openai':
          response = await this.callOpenAI(model, messages, parameters);
          break;
        case 'anthropic':
          response = await this.callAnthropic(model, messages, parameters);
          break;
        case 'ollama':
          response = await this.callOllama(model, messages, parameters);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider.name}`);
      }
      
      // Update context if provided
      if (contextId && response.responseMessage) {
        await mcpContextManager.updateContext(contextId, 'append', response.responseMessage);
      }
      
      return response;
      
    } catch (error) {
      logger.error(`Error generating with model ${model}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Call OpenAI API
   * @param {string} model - Model to use
   * @param {Array} messages - Messages
   * @param {Object} parameters - Generation parameters
   * @returns {Object} - API response
   */
  async callOpenAI(model, messages, parameters = {}) {
    const provider = this.providers.openai;
    
    try {
      // Set up request
      const requestBody = {
        model,
        messages,
        temperature: parameters.temperature ?? 0.7,
        max_tokens: parameters.maxTokens ?? 1024,
        top_p: parameters.topP ?? 1.0,
        frequency_penalty: parameters.frequencyPenalty ?? 0,
        presence_penalty: parameters.presencePenalty ?? 0
      };
      
      // Call OpenAI API
      const response = await axios.post(
        `${provider.baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extract response
      const aiResponse = response.data;
      const responseMessage = aiResponse.choices[0].message;
      
      return {
        content: responseMessage.content,
        responseMessage: {
          role: 'assistant',
          content: responseMessage.content
        },
        model,
        provider: 'openai',
        usage: aiResponse.usage,
        rawResponse: aiResponse
      };
      
    } catch (error) {
      logger.error(`OpenAI API error: ${error.message}`);
      throw new Error(`Failed to call OpenAI API: ${error.message}`);
    }
  }
  
  /**
   * Call Anthropic API
   * @param {string} model - Model to use
   * @param {Array} messages - Messages
   * @param {Object} parameters - Generation parameters
   * @returns {Object} - API response
   */
  async callAnthropic(model, messages, parameters = {}) {
    const provider = this.providers.anthropic;
    
    try {
      // Convert messages to Anthropic format
      const anthropicMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'assistant' : msg.role,
        content: msg.content
      }));
      
      // Extract system message if present
      let systemPrompt = '';
      const systemMessage = messages.find(msg => msg.role === 'system');
      if (systemMessage) {
        systemPrompt = systemMessage.content;
        // Remove system message from messages
        const index = anthropicMessages.findIndex(msg => msg.role === 'assistant' && msg.content === systemMessage.content);
        if (index !== -1) {
          anthropicMessages.splice(index, 1);
        }
      }
      
      // Set up request
      const requestBody = {
        model,
        messages: anthropicMessages,
        system: systemPrompt,
        max_tokens: parameters.maxTokens ?? 1024,
        temperature: parameters.temperature ?? 0.7,
        top_p: parameters.topP ?? 1.0
      };
      
      // Call Anthropic API
      const response = await axios.post(
        `${provider.baseUrl}/messages`,
        requestBody,
        {
          headers: {
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extract response
      const aiResponse = response.data;
      const content = aiResponse.content[0].text;
      
      return {
        content,
        responseMessage: {
          role: 'assistant',
          content
        },
        model,
        provider: 'anthropic',
        usage: {
          prompt_tokens: aiResponse.usage?.input_tokens,
          completion_tokens: aiResponse.usage?.output_tokens,
          total_tokens: (aiResponse.usage?.input_tokens || 0) + (aiResponse.usage?.output_tokens || 0)
        },
        rawResponse: aiResponse
      };
      
    } catch (error) {
      logger.error(`Anthropic API error: ${error.message}`);
      throw new Error(`Failed to call Anthropic API: ${error.message}`);
    }
  }
  
  /**
   * Call Ollama API
   * @param {string} model - Model to use
   * @param {Array} messages - Messages
   * @param {Object} parameters - Generation parameters
   * @returns {Object} - API response
   */
  async callOllama(model, messages, parameters = {}) {
    const provider = this.providers.ollama;
    
    try {
      // Set up request
      const requestBody = {
        model,
        messages,
        options: {
          temperature: parameters.temperature ?? 0.7,
          top_p: parameters.topP ?? 1.0,
          num_predict: parameters.maxTokens ?? 1024
        }
      };
      
      // Call Ollama API
      const response = await axios.post(
        `${provider.baseUrl}/api/chat`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extract response
      const aiResponse = response.data;
      const content = aiResponse.message?.content || '';
      
      return {
        content,
        responseMessage: {
          role: 'assistant',
          content
        },
        model,
        provider: 'ollama',
        usage: null, // Ollama doesn't provide token usage
        rawResponse: aiResponse
      };
      
    } catch (error) {
      logger.error(`Ollama API error: ${error.message}`);
      throw new Error(`Failed to call Ollama API: ${error.message}`);
    }
  }
}

module.exports = new McpModels(); 