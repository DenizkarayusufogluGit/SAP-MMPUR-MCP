/**
 * Cursor IDE Helper Utilities
 * 
 * This file contains helper functions and documentation specifically for 
 * improving the Cursor IDE experience when working with this project.
 */

/**
 * SAP Purchase Order Model Structure
 * 
 * This documentation helps Cursor provide better code completion for
 * SAP purchase order data structures.
 * 
 * @typedef {Object} PurchaseOrder
 * @property {string} PurchaseOrder - Purchase order ID
 * @property {string} PurchaseOrderType - Type of purchase order (e.g., "NB")
 * @property {string} PurchaseOrderSubtype - Subtype of purchase order
 * @property {string} PurchasingDocumentOrigin - Origin of the purchasing document
 * @property {string} CreatedByUser - User who created the purchase order
 * @property {string} CreationDate - Date when the purchase order was created
 * @property {string} PurchaseOrderDate - Purchase order date
 * @property {string} CompanyCode - Company code
 * @property {string} PurchasingOrganization - Purchasing organization
 * @property {string} PurchasingGroup - Purchasing group
 * @property {string} Supplier - Supplier ID
 * @property {string} DocumentCurrency - Currency code
 * @property {Array<PurchaseOrderItem>} _Item - Purchase order items
 */

/**
 * Purchase Order Item Structure
 * 
 * @typedef {Object} PurchaseOrderItem
 * @property {string} PurchaseOrder - Purchase order ID
 * @property {string} PurchaseOrderItem - Purchase order item ID
 * @property {string} Material - Material ID
 * @property {string} PurchaseOrderItemText - Item description
 * @property {string} OrderQuantity - Quantity to order
 * @property {string} PurchaseOrderQuantityUnit - Unit of measure
 * @property {string} Plant - Plant ID
 */

/**
 * Common SAP OData query parameters
 * 
 * @typedef {Object} ODataQueryParams
 * @property {number} $top - Maximum number of records to return
 * @property {number} $skip - Number of records to skip for pagination
 * @property {string} $select - Comma-separated list of properties to include
 * @property {string} $expand - Comma-separated list of navigation properties to expand
 * @property {string} $filter - OData filter expression
 * @property {string} $orderby - Property and direction to order results
 */

/**
 * Example SAP API endpoints
 */
const SAP_API_EXAMPLES = {
  GET_ALL_PURCHASE_ORDERS: 'GET /api/purchaseOrder',
  GET_PURCHASE_ORDER_BY_ID: 'GET /api/purchaseOrder/4500000001',
  CREATE_PURCHASE_ORDER: 'POST /api/purchaseOrder',
  UPDATE_PURCHASE_ORDER: 'PUT /api/purchaseOrder/4500000001',
  DELETE_PURCHASE_ORDER: 'DELETE /api/purchaseOrder/4500000001',
};

/**
 * Example SAP OData filter expressions for purchase orders
 */
const SAP_ODATA_FILTER_EXAMPLES = {
  FILTER_BY_SUPPLIER: "$filter=Supplier eq '17300001'",
  FILTER_BY_DATE_RANGE: "$filter=CreationDate ge '2023-01-01' and CreationDate le '2023-12-31'",
  FILTER_BY_PURCHASE_ORDER_TYPE: "$filter=PurchaseOrderType eq 'NB'",
  EXPAND_ITEMS: "$expand=_Item",
  SELECT_SPECIFIC_FIELDS: "$select=PurchaseOrder,Supplier,CreationDate,DocumentCurrency",
};

/**
 * Example request body for creating a purchase order
 */
const PURCHASE_ORDER_CREATE_EXAMPLE = {
  PurchaseOrderType: "NB",
  CompanyCode: "1710",
  PurchasingOrganization: "1710",
  PurchasingGroup: "001",
  Supplier: "17300001",
  DocumentCurrency: "USD",
  _Item: [
    {
      Material: "BASIC_MATERIAL",
      PurchaseOrderItemText: "Basic material for production",
      OrderQuantity: "10",
      PurchaseOrderQuantityUnit: "EA",
      Plant: "1710"
    }
  ]
};

// Export constants for Cursor IDE to provide better autocomplete
module.exports = {
  SAP_API_EXAMPLES,
  SAP_ODATA_FILTER_EXAMPLES,
  PURCHASE_ORDER_CREATE_EXAMPLE
}; 