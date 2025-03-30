FROM node:18-alpine AS builder

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy from builder stage
COPY --from=builder /usr/src/app/dist ./
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "index.js"] 