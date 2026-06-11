FROM node:20-alpine

WORKDIR /app

# Copy dependency files first for better caching
COPY package.json package-lock.json tsconfig.json ./
RUN npm install

# Copy application code
COPY src ./src
COPY scripts ./scripts

EXPOSE 4000

CMD ["npm", "run", "dev"]
