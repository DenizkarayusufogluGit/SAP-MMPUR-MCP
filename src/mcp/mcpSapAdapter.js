/**
 * MCP SAP Adapter
 * 
 * Bridges between the MCP server and SAP ODATA services.
 * Handles ODATA queries, transformations, and operations.
 */

const { createFilter, executeODataRequest } = require('../util/sapConnectivity');
const mcpConfig = require('../config/mcpConfig');
const { logger } = require('../util/logger');

class McpSapAdapter {
  constructor() {
    this.sapServiceUrl = mcpConfig.sap.serviceUrl;
    this.sapCredentials = {
      username: mcpConfig.sap.username,
      password: mcpConfig.sap.password
    };
    
    // Cache for SAP entities - implement proper caching if needed
    this.cache = {
      purchaseOrders: new Map(),
      suppliers: new Map(),
      materials: new Map()
    };
    
    // Initialize the adapter
    this.initialize();
  }
  
  /**
   * Initialize the adapter
   */
  async initialize() {
    try {
      logger.info('Initializing MCP SAP adapter');
      
      // Perform any initialization tasks here
      // For example, pre-fetch common data, validate connection, etc.
      
      logger.info('MCP SAP adapter initialized successfully');
    } catch (error) {
      logger.error(`Error initializing MCP SAP adapter: ${error.message}`);
    }
  }
  
  /**
   * Check if a query is a SAP-related query
   * @param {string} query - Query text
   * @returns {boolean} - Whether the query is SAP-related
   */
  isSapQuery(query) {
    // Detect SAP-related queries based on keywords
    const sapKeywords = [
      'purchase order',
      'PO',
      'vendor',
      'supplier',
      'material',
      'SAP',
      'goods receipt',
      'invoice',
      'procurement',
      'MMPUR'
    ];
    
    // Check if the query contains any SAP keywords
    return sapKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  
  /**
   * Process a SAP-related query
   * @param {string} query - Query text
   * @returns {Object} - Query result
   */
  async processSapQuery(query) {
    try {
      logger.info(`Processing SAP query: ${query}`);
      
      // Extract query intent and parameters
      const { intent, parameters } = this.extractQueryIntent(query);
      
      // Process the query based on the intent
      let result;
      switch (intent) {
        case 'getPurchaseOrders':
          result = await this.getPurchaseOrders(parameters);
          break;
        case 'getPurchaseOrderById':
          result = await this.getPurchaseOrderById(parameters.id);
          break;
        case 'searchPurchaseOrders':
          result = await this.searchPurchaseOrders(parameters.searchTerm);
          break;
        case 'getSuppliers':
          result = await this.getSuppliers(parameters);
          break;
        case 'getMaterials':
          result = await this.getMaterials(parameters);
          break;
        default:
          result = {
            status: 'error',
            message: `Unknown SAP query intent: ${intent}`
          };
      }
      
      return result;
      
    } catch (error) {
      logger.error(`Error processing SAP query: ${error.message}`);
      return {
        status: 'error',
        message: `Failed to process SAP query: ${error.message}`
      };
    }
  }
  
  /**
   * Extract query intent and parameters from a natural language query
   * @param {string} query - Query text
   * @returns {Object} - Intent and parameters
   */
  extractQueryIntent(query) {
    const normalizedQuery = query.toLowerCase();
    
    // This is a simple rule-based approach, in production use NLP/ML
    if (normalizedQuery.includes('purchase order') && 
        (normalizedQuery.includes('get') || normalizedQuery.includes('show') || normalizedQuery.includes('list'))) {
      
      // Check if searching for a specific purchase order
      const idMatch = normalizedQuery.match(/purchase order (\d+)|po (\d+)|po number (\d+)/i);
      if (idMatch) {
        const id = idMatch[1] || idMatch[2] || idMatch[3];
        return {
          intent: 'getPurchaseOrderById',
          parameters: { id }
        };
      }
      
      // Check if searching for purchase orders
      const searchMatch = normalizedQuery.match(/search for (.+?)( in| related to| from| with| containing|$)/i);
      if (searchMatch) {
        return {
          intent: 'searchPurchaseOrders',
          parameters: { searchTerm: searchMatch[1].trim() }
        };
      }
      
      // Default to get all purchase orders
      return {
        intent: 'getPurchaseOrders',
        parameters: { limit: mcpConfig.sap.maxResultsPerRequest }
      };
    }
    
    if (normalizedQuery.includes('supplier') || normalizedQuery.includes('vendor')) {
      return {
        intent: 'getSuppliers',
        parameters: { limit: mcpConfig.sap.maxResultsPerRequest }
      };
    }
    
    if (normalizedQuery.includes('material') || normalizedQuery.includes('product')) {
      return {
        intent: 'getMaterials',
        parameters: { limit: mcpConfig.sap.maxResultsPerRequest }
      };
    }
    
    // Default to getting purchase orders
    return {
      intent: 'getPurchaseOrders',
      parameters: { limit: mcpConfig.sap.maxResultsPerRequest }
    };
  }
  
  /**
   * Get purchase orders
   * @param {Object} options - Filter options
   * @returns {Array} - Purchase orders
   */
  async getPurchaseOrders(options = {}) {
    try {
      const { limit = mcpConfig.sap.maxResultsPerRequest, filter } = options;
      
      // Build OData query
      let odataQuery = `${this.sapServiceUrl}/PurchaseOrderSet`;
      const queryParams = [];
      
      // Add $top parameter for limiting results
      queryParams.push(`$top=${limit}`);
      
      // Add $filter parameter if a filter is provided
      if (filter) {
        const odataFilter = createFilter(filter);
        if (odataFilter) {
          queryParams.push(`$filter=${encodeURIComponent(odataFilter)}`);
        }
      }
      
      // Add $expand parameter to include related entities
      queryParams.push('$expand=ToItems');
      
      // Build the final query URL
      if (queryParams.length > 0) {
        odataQuery += '?' + queryParams.join('&');
      }
      
      // Execute the OData request
      const response = await executeODataRequest(odataQuery, 'GET', null, this.sapCredentials);
      
      // Transform the response for MCP
      const purchaseOrders = response.d.results.map(po => this.transformPurchaseOrder(po));
      
      // Cache the purchase orders
      purchaseOrders.forEach(po => {
        this.cache.purchaseOrders.set(po.PurchaseOrder, po);
      });
      
      return {
        status: 'success',
        count: purchaseOrders.length,
        results: purchaseOrders
      };
      
    } catch (error) {
      logger.error(`Error fetching purchase orders: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a purchase order by ID
   * @param {string} id - Purchase order ID
   * @returns {Object} - Purchase order
   */
  async getPurchaseOrderById(id) {
    try {
      // Check cache first
      if (this.cache.purchaseOrders.has(id)) {
        const cachedPO = this.cache.purchaseOrders.get(id);
        // Only use cache if not expired
        const cacheExpiry = mcpConfig.sap.cacheTtlMs || 300000; // 5 minutes default
        if (cachedPO._cachedAt && (Date.now() - cachedPO._cachedAt) < cacheExpiry) {
          return {
            status: 'success',
            result: cachedPO,
            source: 'cache'
          };
        }
      }
      
      // Build OData query
      const odataQuery = `${this.sapServiceUrl}/PurchaseOrderSet('${id}')?$expand=ToItems`;
      
      // Execute the OData request
      const response = await executeODataRequest(odataQuery, 'GET', null, this.sapCredentials);
      
      // Transform the response for MCP
      const purchaseOrder = this.transformPurchaseOrder(response.d);
      
      // Cache the purchase order
      purchaseOrder._cachedAt = Date.now();
      this.cache.purchaseOrders.set(id, purchaseOrder);
      
      return {
        status: 'success',
        result: purchaseOrder,
        source: 'sap'
      };
      
    } catch (error) {
      logger.error(`Error fetching purchase order ${id}: ${error.message}`);
      
      // Check if it's a "not found" error
      if (error.response && error.response.status === 404) {
        return {
          status: 'error',
          message: `Purchase order with ID ${id} not found`
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Search for purchase orders
   * @param {string} searchTerm - Search term
   * @returns {Array} - Matching purchase orders
   */
  async searchPurchaseOrders(searchTerm) {
    try {
      // Build OData query with search filters
      let odataQuery = `${this.sapServiceUrl}/PurchaseOrderSet`;
      const queryParams = [];
      
      // Add $top parameter for limiting results
      queryParams.push(`$top=${mcpConfig.sap.maxResultsPerRequest}`);
      
      // Create search filter
      // This is a simple implementation - extend as needed
      const searchFilter = `substringof('${searchTerm}', CompanyName) or substringof('${searchTerm}', PurchaseOrderType) or substringof('${searchTerm}', DocumentType)`;
      queryParams.push(`$filter=${encodeURIComponent(searchFilter)}`);
      
      // Add $expand parameter to include related entities
      queryParams.push('$expand=ToItems');
      
      // Build the final query URL
      if (queryParams.length > 0) {
        odataQuery += '?' + queryParams.join('&');
      }
      
      // Execute the OData request
      const response = await executeODataRequest(odataQuery, 'GET', null, this.sapCredentials);
      
      // Transform the response for MCP
      const purchaseOrders = response.d.results.map(po => this.transformPurchaseOrder(po));
      
      // Cache the purchase orders
      purchaseOrders.forEach(po => {
        this.cache.purchaseOrders.set(po.PurchaseOrder, po);
      });
      
      return {
        status: 'success',
        count: purchaseOrders.length,
        searchTerm,
        results: purchaseOrders
      };
      
    } catch (error) {
      logger.error(`Error searching purchase orders: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a purchase order
   * @param {Object} purchaseOrderData - Purchase order data
   * @returns {Object} - Created purchase order
   */
  async createPurchaseOrder(purchaseOrderData) {
    try {
      // Transform MCP format to SAP format
      const sapPurchaseOrderData = this.transformPurchaseOrderForSap(purchaseOrderData);
      
      // Build OData query
      const odataQuery = `${this.sapServiceUrl}/PurchaseOrderSet`;
      
      // Execute the OData request
      const response = await executeODataRequest(odataQuery, 'POST', sapPurchaseOrderData, this.sapCredentials);
      
      // Transform the response for MCP
      const createdPurchaseOrder = this.transformPurchaseOrder(response.d);
      
      // Cache the purchase order
      createdPurchaseOrder._cachedAt = Date.now();
      this.cache.purchaseOrders.set(createdPurchaseOrder.PurchaseOrder, createdPurchaseOrder);
      
      return createdPurchaseOrder;
      
    } catch (error) {
      logger.error(`Error creating purchase order: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update a purchase order
   * @param {string} id - Purchase order ID
   * @param {Object} updateData - Update data
   * @returns {Object} - Updated purchase order
   */
  async updatePurchaseOrder(id, updateData) {
    try {
      // Get the current purchase order
      const { result: currentPO } = await this.getPurchaseOrderById(id);
      
      if (!currentPO) {
        return null;
      }
      
      // Merge current data with update data
      const mergedData = { ...currentPO, ...updateData };
      
      // Transform MCP format to SAP format
      const sapPurchaseOrderData = this.transformPurchaseOrderForSap(mergedData);
      
      // Build OData query
      const odataQuery = `${this.sapServiceUrl}/PurchaseOrderSet('${id}')`;
      
      // Execute the OData request
      const response = await executeODataRequest(odataQuery, 'PUT', sapPurchaseOrderData, this.sapCredentials);
      
      // Transform the response for MCP
      const updatedPurchaseOrder = this.transformPurchaseOrder(response.d);
      
      // Update cache
      updatedPurchaseOrder._cachedAt = Date.now();
      this.cache.purchaseOrders.set(id, updatedPurchaseOrder);
      
      return updatedPurchaseOrder;
      
    } catch (error) {
      logger.error(`Error updating purchase order ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a purchase order
   * @param {string} id - Purchase order ID
   * @returns {boolean} - Success indicator
   */
  async deletePurchaseOrder(id) {
    try {
      // Build OData query
      const odataQuery = `${this.sapServiceUrl}/PurchaseOrderSet('${id}')`;
      
      // Execute the OData request
      await executeODataRequest(odataQuery, 'DELETE', null, this.sapCredentials);
      
      // Remove from cache
      this.cache.purchaseOrders.delete(id);
      
      return true;
      
    } catch (error) {
      logger.error(`Error deleting purchase order ${id}: ${error.message}`);
      
      // Check if it's a "not found" error
      if (error.response && error.response.status === 404) {
        return false;
      }
      
      throw error;
    }
  }
  
  /**
   * Get suppliers
   * @param {Object} options - Filter options
   * @returns {Array} - Suppliers
   */
  async getSuppliers(options = {}) {
    try {
      const { limit = mcpConfig.sap.maxResultsPerRequest, filter } = options;
      
      // Build OData query
      let odataQuery = `${this.sapServiceUrl}/SupplierSet`;
      const queryParams = [];
      
      // Add $top parameter for limiting results
      queryParams.push(`$top=${limit}`);
      
      // Add $filter parameter if a filter is provided
      if (filter) {
        const odataFilter = createFilter(filter);
        if (odataFilter) {
          queryParams.push(`$filter=${encodeURIComponent(odataFilter)}`);
        }
      }
      
      // Build the final query URL
      if (queryParams.length > 0) {
        odataQuery += '?' + queryParams.join('&');
      }
      
      // Execute the OData request
      const response = await executeODataRequest(odataQuery, 'GET', null, this.sapCredentials);
      
      // Transform the response for MCP
      const suppliers = response.d.results.map(supplier => this.transformSupplier(supplier));
      
      // Cache the suppliers
      suppliers.forEach(supplier => {
        this.cache.suppliers.set(supplier.SupplierId, supplier);
      });
      
      return {
        status: 'success',
        count: suppliers.length,
        results: suppliers
      };
      
    } catch (error) {
      logger.error(`Error fetching suppliers: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get materials
   * @param {Object} options - Filter options
   * @returns {Array} - Materials
   */
  async getMaterials(options = {}) {
    try {
      const { limit = mcpConfig.sap.maxResultsPerRequest, filter } = options;
      
      // Build OData query
      let odataQuery = `${this.sapServiceUrl}/MaterialSet`;
      const queryParams = [];
      
      // Add $top parameter for limiting results
      queryParams.push(`$top=${limit}`);
      
      // Add $filter parameter if a filter is provided
      if (filter) {
        const odataFilter = createFilter(filter);
        if (odataFilter) {
          queryParams.push(`$filter=${encodeURIComponent(odataFilter)}`);
        }
      }
      
      // Build the final query URL
      if (queryParams.length > 0) {
        odataQuery += '?' + queryParams.join('&');
      }
      
      // Execute the OData request
      const response = await executeODataRequest(odataQuery, 'GET', null, this.sapCredentials);
      
      // Transform the response for MCP
      const materials = response.d.results.map(material => this.transformMaterial(material));
      
      // Cache the materials
      materials.forEach(material => {
        this.cache.materials.set(material.MaterialId, material);
      });
      
      return {
        status: 'success',
        count: materials.length,
        results: materials
      };
      
    } catch (error) {
      logger.error(`Error fetching materials: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Transform a SAP purchase order to MCP format
   * @param {Object} sapPurchaseOrder - SAP purchase order
   * @returns {Object} - MCP purchase order
   */
  transformPurchaseOrder(sapPurchaseOrder) {
    const items = sapPurchaseOrder.ToItems?.results?.map(item => ({
      ItemNumber: item.ItemNumber,
      Material: item.Material,
      MaterialDescription: item.MaterialDescription,
      Plant: item.Plant,
      StorageLocation: item.StorageLocation,
      OrderQuantity: parseFloat(item.OrderQuantity),
      QuantityUnit: item.QuantityUnit,
      NetPrice: parseFloat(item.NetPrice),
      Currency: item.Currency,
      DeliveryDate: item.DeliveryDate,
      PurchasingInfoRecord: item.PurchasingInfoRecord
    })) || [];
    
    return {
      PurchaseOrder: sapPurchaseOrder.PurchaseOrder,
      CompanyCode: sapPurchaseOrder.CompanyCode,
      PurchaseOrderType: sapPurchaseOrder.PurchaseOrderType,
      PurchasingOrganization: sapPurchaseOrder.PurchasingOrganization,
      PurchasingGroup: sapPurchaseOrder.PurchasingGroup,
      Supplier: sapPurchaseOrder.Supplier,
      SupplierName: sapPurchaseOrder.SupplierName,
      CreatedBy: sapPurchaseOrder.CreatedBy,
      CreationDate: sapPurchaseOrder.CreationDate,
      DocumentDate: sapPurchaseOrder.DocumentDate,
      Currency: sapPurchaseOrder.Currency,
      ValidityStart: sapPurchaseOrder.ValidityStart,
      ValidityEnd: sapPurchaseOrder.ValidityEnd,
      Status: sapPurchaseOrder.Status,
      StatusDescription: sapPurchaseOrder.StatusDescription,
      GrossAmount: parseFloat(sapPurchaseOrder.GrossAmount),
      NetAmount: parseFloat(sapPurchaseOrder.NetAmount),
      TaxAmount: parseFloat(sapPurchaseOrder.TaxAmount),
      Items: items
    };
  }
  
  /**
   * Transform a purchase order from MCP format to SAP format
   * @param {Object} mcpPurchaseOrder - MCP purchase order
   * @returns {Object} - SAP purchase order
   */
  transformPurchaseOrderForSap(mcpPurchaseOrder) {
    const items = mcpPurchaseOrder.Items?.map(item => ({
      ItemNumber: item.ItemNumber,
      Material: item.Material,
      Plant: item.Plant,
      StorageLocation: item.StorageLocation,
      OrderQuantity: item.OrderQuantity.toString(),
      QuantityUnit: item.QuantityUnit,
      NetPrice: item.NetPrice.toString(),
      Currency: item.Currency,
      DeliveryDate: item.DeliveryDate
    })) || [];
    
    return {
      CompanyCode: mcpPurchaseOrder.CompanyCode,
      PurchaseOrderType: mcpPurchaseOrder.PurchaseOrderType,
      PurchasingOrganization: mcpPurchaseOrder.PurchasingOrganization,
      PurchasingGroup: mcpPurchaseOrder.PurchasingGroup,
      Supplier: mcpPurchaseOrder.Supplier,
      DocumentDate: mcpPurchaseOrder.DocumentDate,
      Currency: mcpPurchaseOrder.Currency,
      ValidityStart: mcpPurchaseOrder.ValidityStart,
      ValidityEnd: mcpPurchaseOrder.ValidityEnd,
      ToItems: {
        results: items
      }
    };
  }
  
  /**
   * Transform a SAP supplier to MCP format
   * @param {Object} sapSupplier - SAP supplier
   * @returns {Object} - MCP supplier
   */
  transformSupplier(sapSupplier) {
    return {
      SupplierId: sapSupplier.SupplierId,
      Name: sapSupplier.Name,
      Street: sapSupplier.Street,
      City: sapSupplier.City,
      PostalCode: sapSupplier.PostalCode,
      Country: sapSupplier.Country,
      PhoneNumber: sapSupplier.PhoneNumber,
      Email: sapSupplier.Email,
      VATNumber: sapSupplier.VATNumber,
      Status: sapSupplier.Status
    };
  }
  
  /**
   * Transform a SAP material to MCP format
   * @param {Object} sapMaterial - SAP material
   * @returns {Object} - MCP material
   */
  transformMaterial(sapMaterial) {
    return {
      MaterialId: sapMaterial.MaterialId,
      Description: sapMaterial.Description,
      MaterialType: sapMaterial.MaterialType,
      MaterialGroup: sapMaterial.MaterialGroup,
      BaseUnitOfMeasure: sapMaterial.BaseUnitOfMeasure,
      StandardPrice: parseFloat(sapMaterial.StandardPrice),
      Currency: sapMaterial.Currency,
      Plant: sapMaterial.Plant,
      StorageLocation: sapMaterial.StorageLocation,
      ProductHierarchy: sapMaterial.ProductHierarchy
    };
  }
}

module.exports = new McpSapAdapter(); 