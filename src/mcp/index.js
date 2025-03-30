/**
 * MCP Server Entry Point
 * 
 * This file serves as the main entry point for the MCP server.
 * It initializes and starts the server, and sets up shutdown handlers.
 */

const mcpServer = require('./mcpServer');
const mcpContextManager = require('./mcpContextManager');
const { logger } = require('../util/logger');

/**
 * Start the MCP server
 */
async function startServer() {
  try {
    logger.info('Starting MCP server...');
    
    // Start the server
    await mcpServer.start();
    
    logger.info('MCP server started successfully');
    
    // Set up graceful shutdown
    setupShutdownHandlers();
    
  } catch (error) {
    logger.error(`Error starting MCP server: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Set up handlers for graceful shutdown
 */
function setupShutdownHandlers() {
  // Handle process termination signals
  process.on('SIGINT', async () => {
    await shutdown('SIGINT');
  });
  
  process.on('SIGTERM', async () => {
    await shutdown('SIGTERM');
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    await shutdown('uncaughtException');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    logger.error(`Unhandled rejection: ${reason}`);
    await shutdown('unhandledRejection');
  });
}

/**
 * Perform graceful shutdown
 * @param {string} signal - Signal that triggered the shutdown
 */
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  try {
    // Stop the server
    await mcpServer.stop();
    
    // Stop the context manager
    mcpContextManager.stop();
    
    logger.info('Shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${error.message}`);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
  shutdown
}; 