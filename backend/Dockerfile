FROM node:20-alpine

WORKDIR /app

# Copy dependency files first for better caching
COPY package.json package-lock.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY src ./src
COPY scripts ./scripts
COPY schema.sql ./

# Create uploads directory
RUN mkdir -p uploads/avatars uploads/banners uploads/communities uploads/events

EXPOSE 4000

# Use ts-node-dev for dev mode (hot-reloading)
CMD ["npm", "run", "dev"]
