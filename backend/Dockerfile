# Backend Dockerfile — Node.js + Playwright Chromium + MySQL client
FROM node:22-slim

# Install Playwright Chromium dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libatspi2.0-0 libxshmfence1 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npx playwright install chromium

# Copy source
COPY . .

# Create data directory
RUN mkdir -p data/auth_info

# Expose port
EXPOSE 3001

# Start
CMD ["node", "src/index.js"]