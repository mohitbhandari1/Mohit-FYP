FROM node:20-alpine

WORKDIR /app

# Copy dependency files first for better caching
COPY package.json package-lock.json tsconfig.json tailwind.config.ts postcss.config.js ./
RUN npm install

# Copy application code
COPY app ./app
COPY public ./public

EXPOSE 3000

CMD ["npm", "run", "dev"]
