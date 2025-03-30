/**
 * Purchase Order Model
 * Represents the structure of a purchase order and provides validation
 */

/**
 * Validates a purchase order object
 * @param {Object} purchaseOrder The purchase order to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validatePurchaseOrder(purchaseOrder) {
  const errors = [];
  
  // Required fields
  if (!purchaseOrder.PurchaseOrderType) {
    errors.push('Purchase Order Type is required');
  }
  
  if (!purchaseOrder.Supplier) {
    errors.push('Supplier is required');
  }
  
  if (!purchaseOrder.PurchasingOrganization) {
    errors.push('Purchasing Organization is required');
  }
  
  // Validate items if present
  if (purchaseOrder._Item && 
      Array.isArray(purchaseOrder._Item)) {
    
    purchaseOrder._Item.forEach((item, index) => {
      if (!item.Material) {
        errors.push(`Item ${index + 1}: Material is required`);
      }
      
      if (!item.OrderQuantity || parseFloat(item.OrderQuantity) <= 0) {
        errors.push(`Item ${index + 1}: Order Quantity must be greater than 0`);
      }
      
      if (!item.Plant) {
        errors.push(`Item ${index + 1}: Plant is required`);
      }
    });
  } else if (purchaseOrder._Item === undefined || purchaseOrder._Item.length === 0) {
    errors.push('At least one Purchase Order Item is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a purchase order object with default values
 * @returns {Object} Default purchase order object
 */
function createDefaultPurchaseOrder() {
  return {
    PurchaseOrderType: 'NB', // Standard Purchase Order
    CompanyCode: '',
    PurchasingOrganization: '',
    PurchasingGroup: '',
    Supplier: '',
    DocumentCurrency: 'USD',
    _Item: []
  };
}

/**
 * Creates a purchase order item with default values
 * @returns {Object} Default purchase order item
 */
function createDefaultPurchaseOrderItem() {
  return {
    Material: '',
    PurchaseOrderItemText: '',
    OrderQuantity: '1',
    PurchaseOrderQuantityUnit: 'EA',
    Plant: '',
    MaterialGroup: '',
    AccountAssignmentCategory: ''
  };
}

/**
 * Maps external API data to internal model
 * @param {Object} apiData Data from external API
 * @returns {Object} Formatted purchase order
 */
function mapFromApi(apiData) {
  // Map from API format to our internal format
  // This can be expanded as needed
  return {
    ...apiData
  };
}

/**
 * Maps internal model to external API format
 * @param {Object} purchaseOrder Internal purchase order object
 * @returns {Object} API-formatted purchase order
 */
function mapToApi(purchaseOrder) {
  // Map from our internal format to API format
  // This can be expanded as needed
  return {
    ...purchaseOrder
  };
}

module.exports = {
  validatePurchaseOrder,
  createDefaultPurchaseOrder,
  createDefaultPurchaseOrderItem,
  mapFromApi,
  mapToApi
}; 