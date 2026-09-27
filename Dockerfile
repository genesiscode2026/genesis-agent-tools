FROM node:20-slim

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY mcp/package*.json ./mcp/
COPY release-guardian/package*.json ./release-guardian/

# Install production dependencies
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev

# Copy application files
COPY . .

# Expose default environment defaults
ENV NODE_ENV=production \
    GENESIS_MAX_SPEND_USD=0.02 \
    GENESIS_SESSION_BUDGET_USD=1.00

# Run MCP server over stdio
ENTRYPOINT ["node", "mcp/src/server.mjs"]
