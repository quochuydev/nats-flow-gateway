# NATS Flow Gateway

A Fastify server with NATS message-based architecture, featuring Chain of Thought flow pattern for traceable API operations.

## Features

- **NATS Message-Based Architecture** - HTTP requests are forwarded to NATS subjects for processing
- **Chain of Thought Pattern** - Every flow logs trace steps for debugging and monitoring
- **Drizzle ORM** - Type-safe database operations with PostgreSQL
- **JWT Authentication** - Secure API access with role-based authorization
- **Zod Validation** - Runtime input validation with detailed error messages
- **Dependency Injection** - Testable flows with injectable context

## Architecture

```
HTTP Request → Fastify Route → NATS Request → Flow → NATS Reply → HTTP Response
```

### Flow Pattern

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

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- [Task](https://taskfile.dev/) (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/quochuydev/nats-flow-gateway.git
cd nats-flow-gateway

# Start infrastructure
docker compose up -d

# Install dependencies
cd server && npm install

# Run migrations
npx drizzle-kit generate
npx tsx src/scripts/migrate.ts

# Seed root admin
npx tsx src/scripts/seed.ts

# Start server
npx tsx src/entrypoint/index.ts
```

Or with Taskfile:

```bash
task up           # Start Docker services
task db:generate  # Generate migrations
task db:migrate   # Run migrations
task db:seed      # Seed root admin
task dev          # Start dev server
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/healthcheck` | No | Health check |
| POST | `/api/v1/admin/login` | No | Admin login |
| POST | `/api/v1/admin/create-admin` | Root | Create admin |
| GET | `/api/v1/admin/list` | Admin | List admins |
| POST | `/api/v1/customer/register` | No | Customer registration |
| POST | `/api/v1/customer/login` | No | Customer login |

## Example Requests

```bash
# Health check
curl http://localhost:3001/api/v1/healthcheck

# Admin login
curl -X POST http://localhost:3001/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost.com","password":"admin123"}'

# Get admin list (with token)
curl http://localhost:3001/api/v1/admin/list \
  -H "Authorization: Bearer <token>"

# Customer registration
curl -X POST http://localhost:3001/api/v1/customer/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123","firstName":"John","lastName":"Doe"}'
```

## Project Structure

```
server/
├── src/
│   ├── entrypoint/        # Fastify routes
│   ├── flows/             # NATS flow handlers
│   │   ├── admin/
│   │   └── customer/
│   ├── lib/               # Utilities
│   ├── middleware/        # Fastify middleware
│   ├── resources/         # Singletons (db, nats, config)
│   ├── schemas/           # Drizzle schemas
│   ├── scripts/           # Migration & seed scripts
│   └── types/             # TypeScript types
├── drizzle/               # Database migrations
└── tests/                 # Test files
```

## Configuration

Environment variables (with defaults):

```bash
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5433/server_db
NATS_URL=nats://localhost:4222
JWT_SECRET=dev-secret-change-in-production
```

## Response Format

### Success

```json
{
  "success": true,
  "status": 200,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "status": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Invalid input",
  "detailed": [
    { "field": "email", "message": "Invalid email" }
  ]
}
```

## Tracing

Every request includes a `x-trace-id` header for correlation:

```bash
curl -v http://localhost:3001/api/v1/healthcheck
# < x-trace-id: a9522183-d595-4304-97c1-34c6bb197611
```

## License

MIT
