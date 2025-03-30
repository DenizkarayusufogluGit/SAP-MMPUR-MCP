FROM node:18-alpine AS builder

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Lint and test
RUN npm run lint
RUN npm test

# Build for production
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Create app directory
WORKDIR /usr/src/app

# Copy from builder stage
COPY --from=builder /usr/src/app/dist ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Set proper ownership for all files
RUN chown -R nodejs:nodejs .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "index.js"] 