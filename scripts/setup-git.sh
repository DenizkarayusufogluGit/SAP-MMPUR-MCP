#!/bin/bash

# Git setup script for SAP-MMPUR-MCP
#
# This script initializes a Git repository, makes an initial commit,
# and helps set up the remote repository.

# Exit on error
set -e

REPO_NAME="sap-mmpur-mcp"
REMOTE_URL=""

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Please install Git first."
    exit 1
fi

echo "Setting up Git repository for $REPO_NAME..."

# Check if already a git repository
if [ -d ".git" ]; then
    echo "This is already a Git repository. Skipping initialization."
else
    # Initialize Git repository
    git init
    echo "Git repository initialized."
fi

# Ask for remote URL
read -p "Enter your GitHub/GitLab repository URL (or press Enter to skip): " REMOTE_URL

# Configure Git if information not available
if [ -z "$(git config --get user.name)" ]; then
    read -p "Enter your Git username: " GIT_USERNAME
    git config user.name "$GIT_USERNAME"
fi

if [ -z "$(git config --get user.email)" ]; then
    read -p "Enter your Git email: " GIT_EMAIL
    git config user.email "$GIT_EMAIL"
fi

# Add all files except those in .gitignore
git add .

# Make initial commit
git commit -m "Initial commit of SAP-MMPUR-MCP"

# Add remote if provided
if [ ! -z "$REMOTE_URL" ]; then
    if git remote | grep -q "origin"; then
        # Remote already exists, update it
        git remote set-url origin "$REMOTE_URL"
    else
        # Add new remote
        git remote add origin "$REMOTE_URL"
    fi
    
    echo "Remote 'origin' set to $REMOTE_URL"
    echo ""
    echo "To push to your repository, run:"
    echo "git push -u origin main"
else
    echo ""
    echo "No remote URL provided. When ready, add your remote with:"
    echo "git remote add origin <your-repository-url>"
    echo "git push -u origin main"
fi

echo ""
echo "Git repository setup complete!" 