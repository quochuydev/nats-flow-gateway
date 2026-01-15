FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY server/package*.json ./
RUN npm ci

# Copy source
COPY server/ .

# Generate Drizzle migrations
RUN npx drizzle-kit generate

EXPOSE 3001

CMD ["npx", "tsx", "src/entrypoint/index.ts"]
