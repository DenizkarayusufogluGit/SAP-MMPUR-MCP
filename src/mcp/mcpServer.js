/**
 * Model Context Protocol (MCP) Server
 * 
 * This is the main MCP server implementation that exposes SAP ODATA
 * functionality to AI models through a context protocol interface.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const { logger } = require('../util/logger');
const mcpConfig = require('../config/mcpConfig');
const mcpContextManager = require('./mcpContextManager');
const mcpAuth = require('./mcpAuth');
const mcpModels = require('./mcpModels');
const mcpSapAdapter = require('./mcpSapAdapter');
const helmet = require('helmet');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const contextManager = require('./contextManager');
const auth = require('../middleware/auth');
const errorHandler = require('../middleware/errorHandler');

class McpServer {
  constructor() {
    this.app = express();
    this.port = process.env.MCP_PORT || 3001;
    this.host = process.env.MCP_HOST || '0.0.0.0';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.useHttps = this.isProduction && process.env.ENABLE_HTTPS === 'true';
    this.server = null;
    this.isRunning = false;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.contextManager = mcpContextManager;
    this.sapAdapter = mcpSapAdapter;
  }

  initializeMiddleware() {
    // Apply security middlewares
    this.app.use(helmet({
      contentSecurityPolicy: this.isProduction, // Enable CSP in production
      crossOriginEmbedderPolicy: this.isProduction,
      crossOriginOpenerPolicy: this.isProduction,
      crossOriginResourcePolicy: this.isProduction
    }));
    
    this.app.disable('x-powered-by');

    // Configure CORS
    const corsOptions = {
      origin: this.isProduction 
        ? (process.env.ALLOWED_ORIGINS || '').split(',') 
        : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
      credentials: true,
      maxAge: 86400 // 24 hours
    };
    this.app.use(cors(corsOptions));

    // Compression for response payloads
    this.app.use(compression({
      level: 6, // Balanced compression level
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Request logging (skip health endpoint in production)
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });

    // Request parsing with size limits
    const bodyParserOptions = { 
      limit: process.env.MAX_PAYLOAD_SIZE || '1mb'
    };
    this.app.use(bodyParser.json(bodyParserOptions));
    this.app.use(bodyParser.text({ type: 'text/plain', ...bodyParserOptions }));

    // Rate limiting for API endpoints
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per window
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: 429,
        message: 'Too many requests, please try again later.'
      },
      skip: (req) => {
        // Skip rate limiting for local development or specific IPs
        return !this.isProduction || req.path === '/health';
      }
    });
    this.app.use('/mcp', limiter);

    // Add request ID to track requests
    this.app.use((req, res, next) => {
      req.id = require('crypto').randomBytes(16).toString('hex');
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Trust proxy for correct IP detection (important for rate limiting)
    if (this.isProduction) {
      this.app.set('trust proxy', 1);
    }
  }

  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'healthy',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString()
      });
    });
    
    // MCP Protocol Endpoints
    
    // 1. Context management
    this.app.post('/api/context', this.createContext.bind(this));
    this.app.get('/api/context/:contextId', this.getContext.bind(this));
    this.app.put('/api/context/:contextId', this.updateContext.bind(this));
    this.app.delete('/api/context/:contextId', this.deleteContext.bind(this));
    
    // 2. Query endpoints
    this.app.post('/api/query', this.handleQuery.bind(this));
    this.app.post('/api/generate', this.handleGeneration.bind(this));
    
    // 3. SAP ODATA endpoints through MCP
    this.app.get('/api/sap/purchaseOrder', this.getPurchaseOrders.bind(this));
    this.app.get('/api/sap/purchaseOrder/:id', this.getPurchaseOrderById.bind(this));
    this.app.post('/api/sap/purchaseOrder', this.createPurchaseOrder.bind(this));
    this.app.put('/api/sap/purchaseOrder/:id', this.updatePurchaseOrder.bind(this));
    this.app.delete('/api/sap/purchaseOrder/:id', this.deletePurchaseOrder.bind(this));
    
    // 4. Model info and capabilities
    this.app.get('/api/models', this.getModels.bind(this));
    this.app.get('/api/models/:modelId/capabilities', this.getModelCapabilities.bind(this));
    
    // Error handling
    this.app.use(errorHandler);
  }
  
  // Context Management Methods
  
  async createContext(req, res) {
    try {
      const { model, maxTokens, contents } = req.body;
      
      if (!model) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Model identifier is required' 
        });
      }
      
      const contextId = await this.contextManager.createContext({
        model,
        maxTokens: maxTokens || mcpConfig.context.maxTokens,
        contents: contents || []
      });
      
      res.status(201).json({
        status: 'success',
        contextId,
        message: 'Context created successfully'
      });
    } catch (error) {
      logger.error(`Error creating context: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to create context: ${error.message}` 
      });
    }
  }
  
  async getContext(req, res) {
    try {
      const { contextId } = req.params;
      const context = await this.contextManager.getContext(contextId);
      
      if (!context) {
        return res.status(404).json({ 
          status: 'error', 
          message: `Context with ID ${contextId} not found` 
        });
      }
      
      res.status(200).json({
        status: 'success',
        context
      });
    } catch (error) {
      logger.error(`Error retrieving context: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to retrieve context: ${error.message}` 
      });
    }
  }
  
  async updateContext(req, res) {
    try {
      const { contextId } = req.params;
      const { operation, content } = req.body;
      
      if (!operation || !content) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Operation and content are required' 
        });
      }
      
      const updatedContext = await this.contextManager.updateContext(contextId, operation, content);
      
      res.status(200).json({
        status: 'success',
        context: updatedContext
      });
    } catch (error) {
      logger.error(`Error updating context: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to update context: ${error.message}` 
      });
    }
  }
  
  async deleteContext(req, res) {
    try {
      const { contextId } = req.params;
      const result = await this.contextManager.deleteContext(contextId);
      
      if (!result) {
        return res.status(404).json({ 
          status: 'error', 
          message: `Context with ID ${contextId} not found` 
        });
      }
      
      res.status(200).json({
        status: 'success',
        message: `Context ${contextId} deleted successfully`
      });
    } catch (error) {
      logger.error(`Error deleting context: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to delete context: ${error.message}` 
      });
    }
  }
  
  // Query and Generation Methods
  
  async handleQuery(req, res) {
    try {
      const { contextId, query, model } = req.body;
      
      if (!query) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Query is required' 
        });
      }
      
      // Process through SAP adapter if it's a SAP-related query
      if (this.sapAdapter.isSapQuery(query)) {
        const sapResult = await this.sapAdapter.processSapQuery(query);
        
        // Add result to context if contextId is provided
        if (contextId) {
          await this.contextManager.updateContext(contextId, 'append', {
            role: 'system',
            content: JSON.stringify(sapResult)
          });
        }
        
        return res.status(200).json({
          status: 'success',
          result: sapResult
        });
      }
      
      // Otherwise, process as a regular model query
      const result = await mcpModels.query({
        contextId,
        query,
        model: model || mcpConfig.models.defaultModel
      });
      
      res.status(200).json({
        status: 'success',
        result
      });
    } catch (error) {
      logger.error(`Error processing query: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to process query: ${error.message}` 
      });
    }
  }
  
  async handleGeneration(req, res) {
    try {
      const { contextId, prompt, model, parameters } = req.body;
      
      if (!prompt && !contextId) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Either prompt or contextId is required' 
        });
      }
      
      const result = await mcpModels.generate({
        contextId,
        prompt,
        model: model || mcpConfig.models.defaultModel,
        parameters: parameters || {}
      });
      
      res.status(200).json({
        status: 'success',
        result
      });
    } catch (error) {
      logger.error(`Error generating content: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to generate content: ${error.message}` 
      });
    }
  }
  
  // SAP ODATA Methods
  
  async getPurchaseOrders(req, res) {
    try {
      const { contextId, limit, filter } = req.query;
      
      // Call the SAP adapter to get purchase orders
      const purchaseOrders = await this.sapAdapter.getPurchaseOrders({
        limit: limit ? parseInt(limit) : mcpConfig.sap.maxResultsPerRequest,
        filter
      });
      
      // Add to context if contextId is provided
      if (contextId) {
        await this.contextManager.updateContext(contextId, 'append', {
          role: 'system',
          content: `Retrieved ${purchaseOrders.length} purchase orders`
        });
      }
      
      res.status(200).json(purchaseOrders);
    } catch (error) {
      logger.error(`Error fetching purchase orders: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to fetch purchase orders: ${error.message}` 
      });
    }
  }
  
  async getPurchaseOrderById(req, res) {
    try {
      const { id } = req.params;
      const { contextId } = req.query;
      
      // Call the SAP adapter to get the purchase order
      const purchaseOrder = await this.sapAdapter.getPurchaseOrderById(id);
      
      if (!purchaseOrder) {
        return res.status(404).json({ 
          status: 'error', 
          message: `Purchase order with ID ${id} not found` 
        });
      }
      
      // Add to context if contextId is provided
      if (contextId) {
        await this.contextManager.updateContext(contextId, 'append', {
          role: 'system',
          content: `Retrieved purchase order ${id}`
        });
      }
      
      res.status(200).json(purchaseOrder);
    } catch (error) {
      logger.error(`Error fetching purchase order: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to fetch purchase order: ${error.message}` 
      });
    }
  }
  
  async createPurchaseOrder(req, res) {
    try {
      const purchaseOrderData = req.body;
      const { contextId } = req.query;
      
      // Call the SAP adapter to create a purchase order
      const newPurchaseOrder = await this.sapAdapter.createPurchaseOrder(purchaseOrderData);
      
      // Add to context if contextId is provided
      if (contextId) {
        await this.contextManager.updateContext(contextId, 'append', {
          role: 'system',
          content: `Created purchase order ${newPurchaseOrder.PurchaseOrder}`
        });
      }
      
      res.status(201).json(newPurchaseOrder);
    } catch (error) {
      logger.error(`Error creating purchase order: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to create purchase order: ${error.message}` 
      });
    }
  }
  
  async updatePurchaseOrder(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const { contextId } = req.query;
      
      // Call the SAP adapter to update the purchase order
      const updatedPurchaseOrder = await this.sapAdapter.updatePurchaseOrder(id, updateData);
      
      if (!updatedPurchaseOrder) {
        return res.status(404).json({ 
          status: 'error', 
          message: `Purchase order with ID ${id} not found` 
        });
      }
      
      // Add to context if contextId is provided
      if (contextId) {
        await this.contextManager.updateContext(contextId, 'append', {
          role: 'system',
          content: `Updated purchase order ${id}`
        });
      }
      
      res.status(200).json(updatedPurchaseOrder);
    } catch (error) {
      logger.error(`Error updating purchase order: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to update purchase order: ${error.message}` 
      });
    }
  }
  
  async deletePurchaseOrder(req, res) {
    try {
      const { id } = req.params;
      const { contextId } = req.query;
      
      // Call the SAP adapter to delete the purchase order
      const result = await this.sapAdapter.deletePurchaseOrder(id);
      
      if (!result) {
        return res.status(404).json({ 
          status: 'error', 
          message: `Purchase order with ID ${id} not found` 
        });
      }
      
      // Add to context if contextId is provided
      if (contextId) {
        await this.contextManager.updateContext(contextId, 'append', {
          role: 'system',
          content: `Deleted purchase order ${id}`
        });
      }
      
      res.status(200).json({ 
        status: 'success', 
        message: `Purchase order with ID ${id} successfully deleted` 
      });
    } catch (error) {
      logger.error(`Error deleting purchase order: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to delete purchase order: ${error.message}` 
      });
    }
  }
  
  // Model Info Methods
  
  async getModels(req, res) {
    try {
      const models = await mcpModels.getAvailableModels();
      res.status(200).json({
        status: 'success',
        models
      });
    } catch (error) {
      logger.error(`Error fetching models: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to fetch models: ${error.message}` 
      });
    }
  }
  
  async getModelCapabilities(req, res) {
    try {
      const { modelId } = req.params;
      const capabilities = await mcpModels.getModelCapabilities(modelId);
      
      if (!capabilities) {
        return res.status(404).json({ 
          status: 'error', 
          message: `Model with ID ${modelId} not found` 
        });
      }
      
      res.status(200).json({
        status: 'success',
        modelId,
        capabilities
      });
    } catch (error) {
      logger.error(`Error fetching model capabilities: ${error.message}`);
      res.status(500).json({ 
        status: 'error', 
        message: `Failed to fetch model capabilities: ${error.message}` 
      });
    }
  }
  
  // Server Management Methods
  
  async start() {
    if (this.isRunning) {
      logger.warn('MCP Server is already running');
      return;
    }

    try {
      // Initialize server configuration
      this.init();

      // Create HTTPS or HTTP server
      if (this.useHttps) {
        // Load SSL certificates
        const sslKeyPath = process.env.SSL_KEY_PATH;
        const sslCertPath = process.env.SSL_CERT_PATH;
        
        if (!sslKeyPath || !sslCertPath) {
          throw new Error('SSL key and certificate paths must be provided for HTTPS');
        }
        
        const sslOptions = {
          key: fs.readFileSync(sslKeyPath),
          cert: fs.readFileSync(sslCertPath)
        };
        
        this.server = https.createServer(sslOptions, this.app);
        logger.info('Created HTTPS server with SSL');
      } else {
        this.server = http.createServer(this.app);
        if (this.isProduction) {
          logger.warn('Running HTTP server in production; HTTPS is recommended');
        }
      }

      // Configure timeouts
      const timeout = parseInt(process.env.MCP_RESPONSE_TIMEOUT || '60000');
      this.server.timeout = timeout;
      this.server.keepAliveTimeout = timeout / 2;
      this.server.headersTimeout = timeout / 2;

      // Start listening
      return new Promise((resolve, reject) => {
        this.server.listen(this.port, this.host, () => {
          this.isRunning = true;
          logger.info(`MCP Server running on ${this.useHttps ? 'https' : 'http'}://${this.host}:${this.port}`);
          logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error(`Failed to start MCP server: ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      logger.error(`Error starting MCP server: ${error.message}`);
      throw error;
    }
  }
  
  async stop() {
    if (!this.isRunning || !this.server) {
      logger.warn('MCP Server is not running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          logger.error(`Error stopping MCP server: ${err.message}`);
          reject(err);
          return;
        }
        
        this.isRunning = false;
        logger.info('MCP Server stopped gracefully');
        resolve();
      });
      
      // Force-close if it takes too long (10 seconds)
      setTimeout(() => {
        if (this.isRunning) {
          logger.warn('Forcing MCP server shutdown after timeout');
          this.isRunning = false;
          resolve();
        }
      }, 10000);
    });
  }
}

module.exports = new McpServer(); 