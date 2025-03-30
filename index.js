const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { logger, expressLogger } = require('./src/util/logger');
const mcpServer = require('./src/mcp/mcpServer');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? './config/.env.production' 
  : process.env.ENV_FILE || './config/.env';

dotenv.config({ path: envFile });

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Apply security middlewares
app.use(helmet()); // Adds various HTTP headers for security
app.disable('x-powered-by'); // Hide server info

// CORS configuration
const corsOptions = {
  origin: isProduction 
    ? (process.env.ALLOWED_ORIGINS || '').split(',') 
    : '*',
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Request logging
app.use(expressLogger);

// Body parsing with size limits
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// Trust proxy if in production (important for rate limiting when behind load balancers)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Routes
const purchaseOrderRoutes = require('./src/api/purchaseOrderRoutes');
app.use('/api/purchaseOrder', purchaseOrderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Service is up and running' });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorMessage = isProduction && statusCode === 500 
    ? 'Internal server error' 
    : err.message || 'Internal server error';

  logger.error(`Error: ${err.message}`);
  
  res.status(statusCode).json({
    status: 'error',
    message: errorMessage
  });
});

// Determine whether to start in MCP mode
const startMcpServer = process.env.ENABLE_MCP === 'true' || process.argv.includes('--mcp');

// Start the appropriate server
if (startMcpServer) {
  // Start MCP server directly
  mcpServer.start().then(() => {
    logger.info(`MCP Server started on port ${mcpServer.port} - Model Context Protocol mode enabled`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  }).catch(err => {
    logger.error(`Failed to start MCP server: ${err.message}`);
    process.exit(1);
  });
} else {
  // Start regular API server
  const server = app.listen(PORT, () => {
    logger.info(`API Server running on port ${PORT} - Standard API mode enabled`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
  
  // Set timeout for server responses
  server.timeout = process.env.SERVER_TIMEOUT ? parseInt(process.env.SERVER_TIMEOUT) : 120000; // 2 minutes default
}

// Set up uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  // Perform a graceful shutdown
  process.exit(1);
});

// Set up unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Set up graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Shutting down gracefully...');
  
  if (startMcpServer) {
    await mcpServer.stop();
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Shutting down gracefully...');
  
  if (startMcpServer) {
    await mcpServer.stop();
  }
  
  process.exit(0);
}); 