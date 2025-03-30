/**
 * SAP ODATA API Configuration
 */
module.exports = {
  // SAP API key for authentication
  apiKey: process.env.SAP_API_KEY || 'YOUR_API_KEY_REQUIRED',
  
  // Base URL for the ODATA service 
  baseUrl: process.env.SAP_ODATA_BASE_URL || 'https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/',
  
  // Endpoints for different entities
  purchaseOrderEndpoint: 'PurchaseOrder',
  purchaseOrderItemEndpoint: 'PurchaseOrderItem',
  
  // ODATA specific configuration
  odata: {
    version: '4.0', // ODATA version
    maxPageSize: 1000,
    defaultExpand: ['_Item', '_ScheduleLine'],
    defaultSelect: ['PurchaseOrder', 'PurchaseOrderType', 'Supplier', 'PurchasingOrganization', 'PurchasingGroup']
  },
  
  // Add request headers
  headers: {
    'APIKey': process.env.SAP_API_KEY || 'YOUR_API_KEY_REQUIRED',
    'Accept': 'application/json'
  }
}; 