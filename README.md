# SAP Mobile Cloud Platform service for Purchase Order Modifications using ODATA API

A Node.js application that provides a bridge between SAP OData APIs for purchase orders and AI models via the Model Context Protocol (MCP).

## Features

- **Dual-Mode Operation**: Operates as both a standard API server and an MCP server for AI model integration
- **SAP Integration**: Connects to SAP systems using OData APIs with optimized connectivity, connection pooling, and caching
- **AI Model Support**: Integrates with OpenAI, Anthropic, and Ollama models through a unified interface
- **Security**: Robust authentication, rate limiting, and sanitized error handling
- **Production-Ready**: Optimized for performance, security, and reliability in production environments

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/sap-mmpur-mcp.git
cd sap-mmpur-mcp

# Install dependencies
npm install

# Copy and configure environment variables
cp config/.env.example config/.env.production
```

## Configuration

### Environment Variables

Configure the application by editing the `.env` or `.env.production` file:

```
# Basic server configuration
PORT=3000
NODE_ENV=production

# SAP connection details
SAP_BASE_URL=https://your-sap-system.com/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV
SAP_USERNAME=your_sap_username
SAP_PASSWORD=your_secure_password
SAP_CLIENT=100

# Security settings
API_KEY=your_secure_api_key
JWT_SECRET=your_secure_jwt_secret

# AI Model API Keys (if using MCP features)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

See `config/.env.example` for all available configuration options.

## Model Context Protocol (MCP) Server

The SAP-MMPUR-MCP includes a full-featured Model Context Protocol server that enables AI models to interact directly with SAP purchase order data. This protocol establishes a standardized way for LLMs (Large Language Models) to maintain contextual awareness across interactions and access enterprise data.

### What is Model Context Protocol?

Model Context Protocol (MCP) provides a standardized interface for:

1. **Context Management**: Create, store, retrieve, and update conversation context windows
2. **Natural Language Processing**: Process natural language requests that query or manipulate SAP data
3. **Multi-Model Support**: Use different AI models (OpenAI, Anthropic, Ollama) through a unified interface
4. **Enterprise Data Access**: Bridge between AI models and enterprise systems like SAP

### MCP Architecture

The MCP server architecture consists of several key components:

- **MCP Server (`mcpServer.js`)**: Express-based HTTP server implementing the protocol
- **Context Manager (`mcpContextManager.js`)**: Manages conversation state and context windows
- **Model Providers (`mcpModels.js`)**: Interfaces with AI models from different providers
- **SAP Adapter (`mcpSapAdapter.js`)**: Translates between AI intent and SAP ODATA operations
- **Authentication (`mcpAuth.js`)**: Secures access to the MCP server endpoints

### MCP Capabilities

The MCP server provides the following capabilities:

#### 1. Context Management

- Create and maintain context windows for persistent conversations
- Track dialogue history between user and model
- Store enterprise data within context windows
- Manage context lifetimes and token limitations

#### 2. AI Model Integration

- Support for OpenAI models (GPT-3.5, GPT-4)
- Support for Anthropic models (Claude)
- Support for local models via Ollama (Llama-3, etc.)
- Dynamic model selection based on query complexity
- Unified response format across different models

#### 3. SAP ODATA Connectivity

- Convert natural language queries to structured SAP queries
- Access purchase order data through semantic understanding
- Perform CRUD operations on SAP entities
- Handle SAP authentication and connection pooling

#### 4. Security Features

- API key and JWT authentication
- Rate limiting for request throttling
- Sanitized error handling for production
- HTTPS support with proper certificate management
- Protection against common web vulnerabilities

### MCP Endpoints

The MCP server exposes the following endpoints:

#### Context Management

```
POST /api/context                - Create a new context window
GET /api/context/:contextId      - Retrieve a context by ID
PUT /api/context/:contextId      - Update a context with new content
DELETE /api/context/:contextId   - Delete a context
```

#### Querying and Generation

```
POST /api/query                  - Process a natural language query with optional context
POST /api/generate               - Generate content with a specified model
```

#### SAP Integration

```
GET /api/sap/purchaseOrder       - List purchase orders (supports natural language filtering)
GET /api/sap/purchaseOrder/:id   - Get purchase order by ID
POST /api/sap/purchaseOrder      - Create a purchase order
PUT /api/sap/purchaseOrder/:id   - Update a purchase order
DELETE /api/sap/purchaseOrder/:id - Delete a purchase order
```

#### Model Information

```
GET /api/models                  - List available AI models
GET /api/models/:modelId/capabilities - Get capabilities of a specific model
```

### Implementing MCP Clients

Here's how to implement a client that interacts with the MCP server:

#### 1. Create a Context

```bash
curl -X POST https://your-server.com/api/context \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "model": "gpt-4",
    "maxTokens": 8192
  }'
```

Response:
```json
{
  "status": "success",
  "contextId": "ctx_abc123def456",
  "message": "Context created successfully"
}
```

#### 2. Query with Context

```bash
curl -X POST https://your-server.com/api/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "contextId": "ctx_abc123def456",
    "query": "Find purchase orders from supplier ACME Corp with total value over $10,000"
  }'
```

Response:
```json
{
  "status": "success",
  "result": {
    "purchaseOrders": [
      {
        "id": "4500000123",
        "supplier": "ACME Corp",
        "totalValue": 12500.00,
        "currency": "USD",
        "createdAt": "2023-06-15"
      },
      {
        "id": "4500000456",
        "supplier": "ACME Corp",
        "totalValue": 18750.00,
        "currency": "USD",
        "createdAt": "2023-08-22"
      }
    ],
    "explanation": "I found 2 purchase orders from ACME Corp with a total value exceeding $10,000."
  }
}
```

#### 3. Update Context with New Information

```bash
curl -X PUT https://your-server.com/api/context/ctx_abc123def456 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "operation": "append",
    "content": {
      "role": "user",
      "content": "Show me details of purchase order 4500000123"
    }
  }'
```

### Advanced MCP Usage Scenarios

#### Entity Extraction and Semantic Search

The MCP server can extract entities from natural language and perform semantic searches:

```bash
curl -X POST https://your-server.com/api/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "contextId": "ctx_abc123def456",
    "query": "Find late deliveries from European suppliers in Q1 2023"
  }'
```

#### Multi-step Reasoning

MCP supports multi-step reasoning through context windows:

1. First query establishes context
2. Model analyzes purchase order data
3. User asks follow-up questions about specific details
4. Context window maintains the conversation thread

#### Data Transformation

MCP can transform data between different formats:

```bash
curl -X POST https://your-server.com/api/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "contextId": "ctx_abc123def456",
    "query": "Summarize the purchase orders from Q2 2023 by supplier and category in a table format"
  }'
```

### Configuring MCP Server

Key configuration options for the MCP server:

```
# MCP Server settings
ENABLE_MCP=true
MCP_PORT=3001
MCP_HOST=0.0.0.0
MCP_MAX_CONCURRENT_REQUESTS=20
MCP_RESPONSE_TIMEOUT=60000

# Context settings
MCP_CONTEXT_WINDOW_SIZE=8192
MCP_TOKEN_LIMIT_PER_REQUEST=4096

# AI model configuration
DEFAULT_AI_MODEL=gpt-4
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
OLLAMA_API_BASE_URL=http://localhost:11434
```

### Monitoring MCP Performance

The MCP server provides several monitoring endpoints and metrics:

- Health checks to ensure server is responsive
- Request/response time tracking
- Token usage monitoring
- Context window analytics
- Error rate tracking

To view MCP server metrics:

```bash
curl -X GET https://your-server.com/metrics \
  -H "x-api-key: your_api_key"
```

### MCP Implementation Best Practices

1. **Context Management**: Implement context cleanup to prevent token accumulation
2. **Error Handling**: Provide clear error messages that help diagnose issues
3. **Security**: Always use HTTPS and proper authentication in production
4. **Caching**: Implement caching for repetitive queries to reduce SAP load
5. **Logging**: Configure appropriate logging levels for diagnostics
6. **Rate Limiting**: Adjust rate limits based on expected traffic patterns
7. **Model Selection**: Choose appropriate models based on query complexity

## Deployment Options

### Standard Node.js Deployment

```bash
# Start in production mode
npm run start:prod

# Start in MCP mode
npm run start:mcp
```

### Docker Deployment

The application includes a production-ready Dockerfile with multi-stage builds:

```bash
# Build Docker image
npm run docker:build

# Run with Docker
npm run docker:run

# Or use Docker Compose
npm run docker:compose
```

### Cloud Foundry Deployment

Deploy to SAP BTP Cloud Foundry:

```bash
# Login to Cloud Foundry
cf login -a https://api.cf.eu10.hana.ondemand.com

# Deploy the application
npm run deploy:cf
```

## Usage

### Standard API

Access purchase order operations via RESTful endpoints:

```
GET /api/purchaseOrder - List purchase orders
GET /api/purchaseOrder/:id - Get purchase order by ID
POST /api/purchaseOrder - Create purchase order
PUT /api/purchaseOrder/:id - Update purchase order
DELETE /api/purchaseOrder/:id - Delete purchase order
```

### Health Monitoring

The application provides a health check endpoint:

```
GET /health - Returns server health status
```

For production monitoring, configure your monitoring solution to poll this endpoint.

## Security Considerations

- **API Authentication**: All API endpoints are protected with API key or JWT authentication
- **HTTPS**: In production, enable HTTPS by setting `ENABLE_HTTPS=true` and providing SSL certificate paths
- **Rate Limiting**: Configurable rate limiting prevents abuse
- **Error Handling**: Secure error responses don't leak internal details in production

## Development

```bash
# Run in development mode
npm run dev

# Run in MCP development mode
npm run mcp:dev

# Run linting
npm run lint

# Run tests
npm run test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## References

- [SAP S/4HANA Cloud APIs](https://api.sap.com/products/SAPS4HANACloud)
- [SAP Purchase Order API Documentation](https://api.sap.com/api/API_PURCHASEORDER_PROCESS_SRV)
- [SAP BTP Documentation](https://help.sap.com/docs/btp)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Cursor IDE Documentation](https://cursor.sh/docs) 