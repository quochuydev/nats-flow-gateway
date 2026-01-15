# NATS Flow Gateway

A Fastify server with NATS message-based architecture, featuring Chain of Thought flow pattern for traceable API operations.

## Architecture

```
Client → Fastify → NATS Request → Flow → NATS Reply → Response
```

```typescript
export const exampleFlow = (ctx: FlowContext) =>
  createFlow('api.v1.module.action', async (input, trace, ok) => {
    const userinfo = isValidRole({ userinfo: input.userinfo });
    const data = isValid(inputSchema, input.payload);

    trace.push('Processing request');
    // Business logic here

    return ok({ result });
  });
```

## Local Development

```bash
# Start infrastructure
docker compose up -d

# Install and run server
cd server
npm install
npx drizzle-kit generate
npx tsx src/scripts/migrate.ts
npx tsx src/scripts/seed.ts
npx tsx src/entrypoint/index.ts
```

## Deploy

```bash
# Build and run all services
docker compose -f docker-compose.dev.yml up -d

# Run migrations
docker compose -f docker-compose.dev.yml exec server npx tsx src/scripts/migrate.ts
docker compose -f docker-compose.dev.yml exec server npx tsx src/scripts/seed.ts
```

## Test

```bash
# Health check
curl http://localhost:3001/api/v1/healthcheck

# Admin login
curl -X POST http://localhost:3001/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost.com","password":"admin123"}'

# Authenticated request
curl http://localhost:3001/api/v1/admin/list \
  -H "Authorization: Bearer <token>"
```

## License

MIT
