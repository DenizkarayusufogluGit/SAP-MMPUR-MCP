# SAP-MMPUR-MCP

SAP Mobile Cloud Platform service for Purchase Order Modifications using ODATA API.

## Overview

This service acts as a middleware between mobile/frontend applications and SAP backend systems, specifically for purchase order management operations. It provides a RESTful API interface that connects to SAP's ODATA v4 services for purchase order processing.

## Features

- Create, read, update, and delete purchase orders
- Integration with SAP backend using ODATA v4 protocol
- API key authentication
- Error handling and logging
- Ready for deployment to SAP BTP (Cloud Foundry)
- Ollama AI integration for natural language processing
- Cursor IDE configuration for enhanced development experience

## Prerequisites

- Node.js 18 or higher
- SAP API key (to be configured in environment variables)
- Access to SAP S/4HANA Cloud Purchase Order OData V4 service
- Cloud Foundry CLI (for deployment)
- Ollama (optional, for AI features)
- Cursor IDE (optional, for enhanced development)

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the environment configuration:
   ```
   cp config/.env.example config/.env
   ```
4. Update the `.env` file with your own SAP API key
5. Start the application:
   ```
   npm start
   ```

## Development

For local development:
```
npm run dev
```

## Testing

Before deployment, test the API connection:
```
npm test
```

This will:
- Verify connectivity to the SAP API
- Retrieve a sample of purchase orders
- Display the response for verification

## Deployment Options

### Git Repository Setup

To set up a new Git repository:

1. Run the Git setup script:
   ```
   npm run git:setup
   ```
2. Follow the prompts to configure your repository
3. Push to your remote repository:
   ```
   git push -u origin main
   ```

### Docker Deployment

Build and run with Docker:

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run
```

Or use Docker Compose:

```bash
docker-compose up -d
```

### Cloud Foundry Deployment

Deploy to SAP BTP Cloud Foundry:

```bash
npm run deploy
```

## Ollama Integration

This project includes integration with Ollama for AI-powered purchase order assistance.

### Setup Ollama

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull the recommended model:
   ```
   ollama pull llama3
   ```
3. Check if Ollama is accessible from the application:
   ```
   npm run ollama:check
   ```

### Using Ollama with MCP

The integration allows you to:
- Process natural language queries about purchase orders
- Generate summaries and insights from purchase order data
- Get AI assistance for creating and updating purchase orders

See the `ollamaIntegration.js` utility for available functions.

## Cursor IDE Integration

This project includes configuration for Cursor IDE, enhancing the development experience.

### Cursor Features

- Context-aware code completion for SAP APIs
- Built-in documentation for purchase order data structures
- Integrated linting and formatting
- Quick access to SAP documentation

### Setup Cursor

1. Install Cursor IDE from [cursor.sh](https://cursor.sh)
2. Open the project in Cursor
3. Run the sync command:
   ```
   npm run cursor:sync
   ```

## Building and Deployment

### Building

To build the application:
```
npm run build
```

This creates a `dist` directory with all necessary files.

### Deploying to SAP BTP

1. Log in to Cloud Foundry:
   ```
   cf login -a <API_ENDPOINT> -u <USERNAME> -p <PASSWORD> -o <ORGANIZATION> -s <SPACE>
   ```

2. Deploy to BTP:
   ```
   npm run deploy
   ```

Or manually:
   ```
   cf push
   ```

## API Endpoints

- `GET /api/purchaseOrder` - Get all purchase orders
- `GET /api/purchaseOrder/:id` - Get purchase order by ID
- `POST /api/purchaseOrder` - Create a new purchase order
- `PUT /api/purchaseOrder/:id` - Update a purchase order
- `DELETE /api/purchaseOrder/:id` - Delete a purchase order

## Configuration

The application is configured using environment variables. See `.env.example` for available options.

## API Configuration

This service uses the SAP S/4HANA Cloud Purchase Order OData V4 service with API key authentication:

- API Base URL: `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_purchaseorder_2/srvd_a2x/sap/purchaseorder/0001/`
- API Key: Set in environment variables via `.env` file

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## References

- [SAP S/4HANA Cloud APIs](https://api.sap.com/products/SAPS4HANACloud)
- [SAP Purchase Order API Documentation](https://api.sap.com/api/API_PURCHASEORDER_PROCESS_SRV)
- [SAP BTP Documentation](https://help.sap.com/docs/btp)
- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Cursor IDE Documentation](https://cursor.sh/docs) 