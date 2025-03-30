/**
 * SAP Connectivity Utility
 * 
 * Provides methods to connect to SAP systems via OData.
 * Handles authentication, request execution, and error handling.
 */

const axios = require('axios');
const { logger } = require('./logger');

/**
 * Create an OData filter from a filter object
 * @param {Object} filter - Filter object
 * @returns {string} - OData filter string
 */
function createFilter(filter) {
  if (!filter || typeof filter !== 'object') {
    return '';
  }
  
  const conditions = [];
  
  for (const [field, value] of Object.entries(filter)) {
    if (value === undefined || value === null) {
      continue;
    }
    
    if (typeof value === 'string') {
      // String comparison
      conditions.push(`substringof('${value}', ${field})`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      // Number or boolean comparison
      conditions.push(`${field} eq ${value}`);
    } else if (value instanceof Date) {
      // Date comparison
      const dateStr = value.toISOString().split('T')[0];
      conditions.push(`${field} eq datetime'${dateStr}'`);
    } else if (typeof value === 'object') {
      // Range comparison
      if (value.eq !== undefined) {
        conditions.push(`${field} eq ${formatValue(value.eq)}`);
      }
      if (value.ne !== undefined) {
        conditions.push(`${field} ne ${formatValue(value.ne)}`);
      }
      if (value.gt !== undefined) {
        conditions.push(`${field} gt ${formatValue(value.gt)}`);
      }
      if (value.ge !== undefined) {
        conditions.push(`${field} ge ${formatValue(value.ge)}`);
      }
      if (value.lt !== undefined) {
        conditions.push(`${field} lt ${formatValue(value.lt)}`);
      }
      if (value.le !== undefined) {
        conditions.push(`${field} le ${formatValue(value.le)}`);
      }
    }
  }
  
  return conditions.join(' and ');
}

/**
 * Format a value for OData query
 * @param {*} value - Value to format
 * @returns {string} - Formatted value
 */
function formatValue(value) {
  if (typeof value === 'string') {
    return `'${value}'`;
  } else if (value instanceof Date) {
    return `datetime'${value.toISOString()}'`;
  } else {
    return String(value);
  }
}

/**
 * Execute an OData request to SAP
 * @param {string} url - Request URL
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} data - Request data
 * @param {Object} credentials - Authentication credentials
 * @returns {Object} - Response data
 */
async function executeODataRequest(url, method, data, credentials) {
  try {
    logger.info(`Executing ${method} request to ${url}`);
    
    // Set up request configuration
    const config = {
      method,
      url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    // Add authentication if credentials are provided
    if (credentials) {
      if (credentials.username && credentials.password) {
        // Basic authentication
        const authString = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
        config.headers['Authorization'] = `Basic ${authString}`;
      } else if (credentials.token) {
        // Token authentication
        config.headers['Authorization'] = `Bearer ${credentials.token}`;
      }
    }
    
    // Add request data for POST and PUT requests
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    // Execute the request
    const response = await axios(config);
    
    // Log success
    logger.info(`${method} request to ${url} successful`);
    
    return response.data;
    
  } catch (error) {
    // Log the error
    logger.error(`Error executing ${method} request to ${url}: ${error.message}`);
    
    // Handle specific SAP error responses
    if (error.response) {
      logger.error(`SAP responded with status code ${error.response.status}`);
      
      if (error.response.data && error.response.data.error) {
        logger.error(`SAP error message: ${error.response.data.error.message.value}`);
      }
    }
    
    // Rethrow the error
    throw error;
  }
}

/**
 * Create an XSRF token for SAP Gateway
 * @param {string} url - Gateway URL
 * @param {Object} credentials - Authentication credentials
 * @returns {string} - XSRF token
 */
async function createXsrfToken(url, credentials) {
  try {
    // Execute a HEAD request to get the XSRF token
    const config = {
      method: 'HEAD',
      url,
      headers: {
        'x-csrf-token': 'Fetch',
        'Accept': 'application/json'
      }
    };
    
    // Add authentication if credentials are provided
    if (credentials) {
      if (credentials.username && credentials.password) {
        // Basic authentication
        const authString = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
        config.headers['Authorization'] = `Basic ${authString}`;
      } else if (credentials.token) {
        // Token authentication
        config.headers['Authorization'] = `Bearer ${credentials.token}`;
      }
    }
    
    // Execute the request
    const response = await axios(config);
    
    // Get the XSRF token from the response headers
    const xsrfToken = response.headers['x-csrf-token'];
    
    if (!xsrfToken) {
      throw new Error('Failed to fetch XSRF token');
    }
    
    return xsrfToken;
    
  } catch (error) {
    logger.error(`Error fetching XSRF token: ${error.message}`);
    throw error;
  }
}

/**
 * Batch execute multiple OData requests
 * @param {string} batchUrl - Batch endpoint URL
 * @param {Array} requests - Array of request objects
 * @param {Object} credentials - Authentication credentials
 * @returns {Array} - Array of response objects
 */
async function executeBatchRequest(batchUrl, requests, credentials) {
  try {
    // Get XSRF token
    const xsrfToken = await createXsrfToken(batchUrl, credentials);
    
    // Generate a batch boundary
    const boundary = `batch_${Date.now()}`;
    
    // Build the batch request body
    let batchBody = '';
    
    requests.forEach((request, index) => {
      // Add batch delimiter
      batchBody += `--${boundary}\r\n`;
      batchBody += 'Content-Type: application/http\r\n';
      batchBody += `Content-Transfer-Encoding: binary\r\n\r\n`;
      
      // Add request line
      batchBody += `${request.method} ${request.url} HTTP/1.1\r\n`;
      
      // Add headers
      batchBody += 'Accept: application/json\r\n';
      if (request.method === 'POST' || request.method === 'PUT') {
        batchBody += 'Content-Type: application/json\r\n';
      }
      
      // Add request data for POST and PUT requests
      if (request.data && (request.method === 'POST' || request.method === 'PUT')) {
        const jsonData = JSON.stringify(request.data);
        batchBody += `Content-Length: ${Buffer.byteLength(jsonData, 'utf8')}\r\n\r\n`;
        batchBody += `${jsonData}\r\n`;
      } else {
        batchBody += '\r\n';
      }
    });
    
    // Add final boundary
    batchBody += `--${boundary}--`;
    
    // Execute the batch request
    const response = await axios({
      method: 'POST',
      url: batchUrl,
      headers: {
        'Content-Type': `multipart/mixed; boundary=${boundary}`,
        'x-csrf-token': xsrfToken,
        'Accept': 'multipart/mixed'
      },
      data: batchBody
    });
    
    // Parse the batch response
    // This is a simplified version, in production implement proper batch response parsing
    return response.data;
    
  } catch (error) {
    logger.error(`Error executing batch request: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createFilter,
  executeODataRequest,
  createXsrfToken,
  executeBatchRequest
}; 