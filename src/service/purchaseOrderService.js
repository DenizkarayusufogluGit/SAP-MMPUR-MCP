const axios = require('axios');
const { logger } = require('../util/logger');
const odataConfig = require('../config/odataConfig');

/**
 * Get all purchase orders from SAP system
 * @returns {Promise<Array>} Array of purchase orders
 */
async function getAllPurchaseOrders() {
  try {
    const response = await axios.get(`${odataConfig.baseUrl}${odataConfig.purchaseOrderEndpoint}`, {
      headers: {
        'APIKey': odataConfig.apiKey,
        'Accept': 'application/json'
      },
      params: {
        $top: 10 // Limit results
      }
    });
    
    return response.data.value || [];
  } catch (error) {
    logger.error(`Failed to fetch purchase orders: ${error.message}`);
    throw new Error(`Failed to fetch purchase orders: ${error.message}`);
  }
}

/**
 * Get purchase order by ID
 * @param {string} id Purchase order ID
 * @returns {Promise<Object>} Purchase order data
 */
async function getPurchaseOrderById(id) {
  try {
    // Format the ID with single quotes for OData
    const formattedId = `'${id}'`;
    
    const response = await axios.get(`${odataConfig.baseUrl}${odataConfig.purchaseOrderEndpoint}(${formattedId})`, {
      headers: {
        'APIKey': odataConfig.apiKey,
        'Accept': 'application/json'
      }
    });
    
    return response.data || null;
  } catch (error) {
    logger.error(`Failed to fetch purchase order ${id}: ${error.message}`);
    
    if (error.response && error.response.status === 404) {
      return null;
    }
    
    throw new Error(`Failed to fetch purchase order ${id}: ${error.message}`);
  }
}

/**
 * Create a new purchase order
 * @param {Object} purchaseOrderData Purchase order data
 * @returns {Promise<Object>} Created purchase order
 */
async function createPurchaseOrder(purchaseOrderData) {
  try {
    const response = await axios.post(`${odataConfig.baseUrl}${odataConfig.purchaseOrderEndpoint}`, 
      purchaseOrderData,
      {
        headers: {
          'APIKey': odataConfig.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data || null;
  } catch (error) {
    logger.error(`Failed to create purchase order: ${error.message}`);
    throw new Error(`Failed to create purchase order: ${error.message}`);
  }
}

/**
 * Update a purchase order
 * @param {string} id Purchase order ID
 * @param {Object} updateData Update data
 * @returns {Promise<Object>} Updated purchase order
 */
async function updatePurchaseOrder(id, updateData) {
  try {
    // First check if purchase order exists
    const exists = await getPurchaseOrderById(id);
    if (!exists) {
      return null;
    }
    
    // Format the ID with single quotes for OData
    const formattedId = `'${id}'`;
    
    const response = await axios.patch(
      `${odataConfig.baseUrl}${odataConfig.purchaseOrderEndpoint}(${formattedId})`,
      updateData,
      {
        headers: {
          'APIKey': odataConfig.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Return updated order
    return await getPurchaseOrderById(id);
  } catch (error) {
    logger.error(`Failed to update purchase order ${id}: ${error.message}`);
    throw new Error(`Failed to update purchase order ${id}: ${error.message}`);
  }
}

/**
 * Delete a purchase order
 * @param {string} id Purchase order ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deletePurchaseOrder(id) {
  try {
    // First check if purchase order exists
    const exists = await getPurchaseOrderById(id);
    if (!exists) {
      return false;
    }
    
    // Format the ID with single quotes for OData
    const formattedId = `'${id}'`;
    
    await axios.delete(
      `${odataConfig.baseUrl}${odataConfig.purchaseOrderEndpoint}(${formattedId})`,
      {
        headers: {
          'APIKey': odataConfig.apiKey,
          'Accept': 'application/json'
        }
      }
    );
    
    return true;
  } catch (error) {
    logger.error(`Failed to delete purchase order ${id}: ${error.message}`);
    throw new Error(`Failed to delete purchase order ${id}: ${error.message}`);
  }
}

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder
}; 