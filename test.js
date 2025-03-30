const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/.env' });

const API_URL = process.env.SAP_ODATA_BASE_URL || 'https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/';
const API_KEY = process.env.SAP_API_KEY;

// Check if API key is present
if (!API_KEY) {
  console.error('❌ No API key found. Please set SAP_API_KEY in your .env file');
  process.exit(1);
}

async function testApi() {
  console.log(`Testing API connection to: ${API_URL}`);
  
  try {
    const response = await axios.get(`${API_URL}PurchaseOrder`, {
      headers: {
        'APIKey': API_KEY,
        'Accept': 'application/json'
      },
      params: {
        $top: 5  // Limit to 5 results for testing
      }
    });
    
    if (response.data && response.data.value) {
      console.log('✅ API connection successful!');
      console.log(`Retrieved ${response.data.value.length} purchase orders`);
      
      if (response.data.value.length > 0) {
        console.log('\nSample purchase order:');
        console.log(JSON.stringify(response.data.value[0], null, 2));
      }
    } else {
      console.log('❌ API response format unexpected:', response.data);
    }
  } catch (error) {
    console.error('❌ API connection failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testApi(); 