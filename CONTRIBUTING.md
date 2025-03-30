# Contributing to SAP-MMPUR-MCP

Thank you for your interest in contributing to SAP-MMPUR-MCP! This document outlines the process and guidelines for contributing to this project.

## How to Contribute

### Reporting Bugs

Before submitting a bug report:
- Check the issue tracker to avoid duplicates
- Ensure the bug is related to this project

When submitting a bug report, include:
- A clear, descriptive title
- Detailed steps to reproduce the issue
- Expected behavior and what actually happened
- Version information (Node.js, npm, OS)
- Any relevant logs or screenshots

### Suggesting Features

Feature suggestions should include:
- A clear, descriptive title
- Detailed explanation of the feature
- Explanation of why this feature would be valuable
- Examples of how this feature would be used

### Pull Requests

1. Fork the repository
2. Create a new branch from `main`
3. Make your changes
4. Run tests to ensure they pass
5. Submit a pull request to the `main` branch

### Development Setup

1. Clone your fork of the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a configuration file:
   ```
   cp config/.env.example config/.env
   ```
4. Update the configuration with your own values
5. Start the development server:
   ```
   npm run dev
   ```

## Coding Guidelines

- Follow the ESLint configuration
- Write tests for new features
- Keep the codebase clean and maintainable
- Document new code using JSDoc comments
- Follow the existing code style

## Git Workflow

- Use meaningful commit messages
- Reference issue numbers in commit messages
- Keep commits focused on single changes
- Rebase your branch before submitting a pull request

## Testing

- Run tests before submitting a pull request:
  ```
  npm test
  ```
- Add tests for new features
- Ensure all tests pass

## Documentation

- Update documentation when changing functionality
- Use clear and concise language
- Include examples where appropriate

## Review Process

- All pull requests require at least one review
- Feedback must be addressed before merging
- Maintain a respectful and collaborative attitude

Thank you for contributing to SAP-MMPUR-MCP! 