#!/bin/bash

# Production Deployment Script for SAP-MMPUR-MCP
# 
# This script helps with the deployment of the application
# to production environments.

# Exit on error
set -e

echo "Starting deployment process for SAP-MMPUR-MCP..."

# Check if .env file exists
if [ ! -f "config/.env" ]; then
    echo "ERROR: config/.env file not found. Please create it before deploying."
    exit 1
fi

# Check for API key
if ! grep -q "SAP_API_KEY" config/.env; then
    echo "ERROR: SAP_API_KEY not found in config/.env file."
    exit 1
fi

# Clean dist folder
echo "Cleaning previous build..."
rm -rf dist
mkdir -p dist

# Run linting
echo "Running linting checks..."
npm run lint

# Run tests
echo "Running tests..."
npm test

# Build for production
echo "Building for production..."
npm run build

# Check for CF CLI
if ! command -v cf &> /dev/null; then
    echo "Cloud Foundry CLI not found. Please install it first."
    echo "Visit: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html"
    exit 1
fi

# Deploy to Cloud Foundry
echo "Deploying to Cloud Foundry..."
cd dist && cf push

echo "Deployment completed successfully!" 