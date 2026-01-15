# Server Foundation Design

## Overview

Fastify server with NATS message-based architecture, Drizzle ORM, and Chain of Thought flow pattern.

## Architecture

```
HTTP Request
    ↓
Fastify Route
    ↓
NATS Request (api.v1.auth.validate) → authFlow
    ↓
NATS Request (api.v1.<module>.<action>) → businessFlow(userinfo)
    ↓
HTTP Response (status from flow)
```

## Project Structure

```
/
├── docker-compose.yml          # Postgres 15 + NATS
├── Taskfile.yml                # dev, test, db:migrate, etc.
├── server/
│   ├── package.json            # fastify, drizzle, nats, tsx, vitest, zod, bcrypt
│   ├── drizzle.config.ts       # drizzle-kit config
│   ├── drizzle/                # migrations
│   ├── src/
│   │   ├── entrypoint/
│   │   │   ├── index.ts              # Fastify entry
│   │   │   ├── healthcheck.route.ts
│   │   │   ├── admin.route.ts
│   │   │   └── customer.route.ts
│   │   ├── types/
│   │   │   └── flow.ts         # FlowOutput, ErrorCodes, FlowException
│   │   ├── lib/
│   │   │   ├── flowWrapper.ts  # createFlow (ok, try/catch)
│   │   │   ├── auth.ts         # isValidRole
│   │   │   ├── validation.ts   # isValid (zod)
│   │   │   └── natsRequest.ts  # NATS request helper
│   │   ├── resources/          # Singletons
│   │   │   ├── config.ts
│   │   │   ├── db.ts
│   │   │   ├── nats.ts
│   │   │   ├── password.ts     # bcrypt
│   │   │   └── context.ts      # FlowContext (injectable)
│   │   ├── schemas/            # Drizzle
│   │   │   ├── admin.ts
│   │   │   └── customer.ts
│   │   ├── flows/
│   │   │   ├── register.ts     # NATS subscriptions
│   │   │   ├── healthcheck.flow.ts
│   │   │   ├── auth.flow.ts
│   │   │   ├── admin/
│   │   │   │   ├── login.flow.ts
│   │   │   │   └── createAdmin.flow.ts
│   │   │   └── customer/
│   │   │       ├── login.flow.ts
│   │   │       └── register.flow.ts
│   │   └── middleware/
│   │       └── auth.ts         # Fastify preHandler
│   └── tests/
└── client/                     # existing Next.js
```

## Database Schema

### admins

```typescript
export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  root: boolean('root').notNull().default(false),
  createdBy: uuid('created_by').references(() => admins.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### customers

```typescript
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

## Flow Pattern (Chain of Thought)

### Types

```typescript
export const ErrorCodes = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  CONFLICT: { code: 'CONFLICT', status: 409 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

export type FlowOutput<T> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; errorCode: ErrorCode; message: string; detailed: any[] };

// Internal type with trace (not sent in response)
export type FlowResult<T> = FlowOutput<T> & { trace: string[] };

export class FlowException {
  constructor(
    public status: number,
    public errorCode: ErrorCode,
    public message: string,
    public detailed: any[] = [],
    public traceMessage: string = ''
  ) {}
}
```

### Flow Wrapper

```typescript
export const createFlow = <I, O>(
  name: string,
  fn: (input: I, trace: string[], ok: OkFn<O>) => Promise<FlowOutput<O>>
) => {
  return async (input: I): Promise<FlowOutput<O>> => {
    const trace: string[] = [];

    const ok = (data: O, status = 200): FlowOutput<O> => {
      trace.push('SUCCESS');
      return { success: true, status, data, trace };
    };

    try {
      return await fn(input, trace, ok);
    } catch (err) {
      if (err instanceof FlowException) {
        trace.push(err.traceMessage || `REJECTED: ${err.message}`);
        return { success: false, status: err.status, errorCode: err.errorCode, message: err.message, detailed: err.detailed, trace };
      }
      trace.push(`ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return { success: false, status: 500, errorCode: 'INTERNAL_ERROR', message: 'Unexpected error', detailed: [], trace };
    }
  };
};
```

### Validation Helpers

```typescript
// isValidRole - throws FlowException
export const isValidRole = ({ userinfo, roles }: { userinfo?: UserInfo; roles?: Array<'admin' | 'customer'> } = {}): UserInfo => {
  if (!userinfo) {
    throw new FlowException(401, 'UNAUTHORIZED', 'Not authenticated');
  }
  if (roles && !roles.includes(userinfo.role)) {
    throw new FlowException(403, 'FORBIDDEN', `Required role: ${roles.join(' or ')}`);
  }
  return userinfo;
};

// isValid - throws FlowException with detailed field errors
export const isValid = <T>(schema: ZodSchema<T>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const detailed = parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw new FlowException(400, 'VALIDATION_ERROR', 'Invalid input', detailed);
  }
  return parsed.data;
};
```

### Example Flow

```typescript
const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createAdminFlow = (ctx: FlowContext) => createFlow(
  'api.v1.admin.createAdmin',
  async (input, trace, ok) => {
    const userinfo = isValidRole({ userinfo: input.userinfo });
    const { email, password } = isValid(inputSchema, input.payload);

    if (!userinfo.root) {
      throw new FlowException(403, 'FORBIDDEN', 'Root admin required');
    }

    trace.push('Checking email not taken');
    const existing = await ctx.db.query.admins.findFirst({
      where: eq(admins.email, email),
    });
    if (existing) {
      throw new FlowException(409, 'CONFLICT', 'Email already exists');
    }

    trace.push('Hashing password');
    const passwordHash = await ctx.password.hash(password);

    trace.push('Creating admin');
    const [admin] = await ctx.db.insert(admins).values({
      email,
      passwordHash,
      root: false,
      createdBy: userinfo.id,
    }).returning();

    return ok({ id: admin.id }, 201);
  }
);
```

## Resources (Singletons with DI)

```typescript
export type FlowContext = {
  db: typeof db;
  nats: NatsConnection;
  config: typeof config;
  password: { hash: typeof hashPassword; verify: typeof verifyPassword };
};

export const createContext = async (): Promise<FlowContext> => ({
  db,
  nats: await getNats(),
  config,
  password: { hash: hashPassword, verify: verifyPassword },
});
```

## NATS Subjects

| Subject | Flow | Auth |
|---------|------|------|
| api.v1.healthcheck | healthcheckFlow | No |
| api.v1.auth.validate | authFlow | No |
| api.v1.admin.login | adminLoginFlow | No |
| api.v1.admin.createAdmin | createAdminFlow | Yes (root) |
| api.v1.customer.login | customerLoginFlow | No |
| api.v1.customer.register | customerRegisterFlow | No |

## Routes

```typescript
// entrypoint/healthcheck.route.ts
export const healthcheckRoute = (app: FastifyInstance, ctx: FlowContext) => {
  app.get('/api/v1/healthcheck', route(ctx, 'api.v1.healthcheck'));
};

// entrypoint/admin.route.ts
export const adminRoute = (app: FastifyInstance, ctx: FlowContext) => {
  const auth = authMiddleware(ctx);

  app.post('/api/v1/admin/login', route(ctx, 'api.v1.admin.login'));
  app.post('/api/v1/admin/create-admin', { preHandler: auth }, route(ctx, 'api.v1.admin.createAdmin'));
};

// entrypoint/customer.route.ts
export const customerRoute = (app: FastifyInstance, ctx: FlowContext) => {
  app.post('/api/v1/customer/login', route(ctx, 'api.v1.customer.login'));
  app.post('/api/v1/customer/register', route(ctx, 'api.v1.customer.register'));
};

// lib/natsRequest.ts
import { randomUUID } from 'crypto';

export const route = (ctx: FlowContext, subject: string) => async (req: FastifyRequest, reply: FastifyReply) => {
  const traceId = (req.headers['x-trace-id'] as string) || randomUUID();

  const result = await natsRequest(ctx, subject, {
    traceId,
    userinfo: req.userinfo,
    payload: req.body
  });

  // Log trace internally (for monitoring later)
  console.log({ traceId, subject, trace: result.trace });

  // Strip trace from response
  const { trace, ...response } = result;

  return reply
    .header('x-trace-id', traceId)
    .status(response.status)
    .send(response);
};

// entrypoint/index.ts
const start = async () => {
  const app = Fastify({ logger: true });
  const ctx = await createContext();

  healthcheckRoute(app, ctx);
  adminRoute(app, ctx);
  customerRoute(app, ctx);

  await app.listen({ port: ctx.config.port });
};
```

## Infrastructure

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: next-better-auth-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: server_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nats:
    image: nats:latest
    container_name: next-better-auth-nats
    ports:
      - '4222:4222'
      - '8222:8222'
    command: ['--jetstream', '--monitor', '8222']

volumes:
  postgres_data:
```

### Taskfile.yml

```yaml
version: '3'

tasks:
  up:
    desc: Start docker services
    cmd: docker-compose up -d

  down:
    desc: Stop docker services
    cmd: docker-compose down

  dev:
    desc: Run server in dev mode
    dir: ./server
    cmd: npx tsx watch src/entrypoint/index.ts

  db:generate:
    desc: Generate migrations
    dir: ./server
    cmd: npx drizzle-kit generate

  db:migrate:
    desc: Run migrations
    dir: ./server
    cmd: npx tsx src/scripts/migrate.ts

  db:seed:
    desc: Seed root admin
    dir: ./server
    cmd: npx tsx src/scripts/seed.ts

  test:
    desc: Run tests
    dir: ./server
    cmd: npx vitest run

  test:watch:
    desc: Run tests in watch mode
    dir: ./server
    cmd: npx vitest --watch
```

## Key Decisions

| Area | Choice | Reason |
|------|--------|--------|
| Password | bcrypt (cost 14) | Easy migration to better-auth/Zitadel |
| Validation | Zod + `isValid()` | Type-safe, throws to catch |
| Auth | `isValidRole()` + middleware | Clean, DRY |
| Error handling | `FlowException` | Single try/catch in createFlow |
| Flow response | `ok(data, status?)` | Default 200, customizable |
| Status codes | From flow | No hardcoded status in routes |
| Context | Functional injection | Testable |
| Trace | Internal only | Not in response, logged with traceId |
| TraceId | `x-trace-id` header | Request/response correlation for monitoring |

## Seed Data

Root admin:
- email: `admin@local`
- password: (hashed)
- root: `true`
