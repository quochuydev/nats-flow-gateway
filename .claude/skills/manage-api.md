---
name: manage-api
description: Create, update, or fix APIs in the nats-flow server
---

# Manage API Skill

Use this skill to create, update, or fix APIs in the server.

## Architecture Overview

```
HTTP Request → Fastify Route → NATS Request → Flow → NATS Reply → HTTP Response
```

## File Locations

- **Flows:** `server/src/flows/<module>/<action>.flow.ts`
- **Routes:** `server/src/entrypoint/<module>.route.ts`
- **Schemas:** `server/src/schemas/<table>.ts`
- **Flow registration:** `server/src/flows/register.ts`

## Naming Conventions

- NATS subject: `api.v1.<module>.<action>` (e.g., `api.v1.admin.getList`)
- Route path: `/api/v1/<module>/<action>` (e.g., `/api/v1/admin/list`)
- Flow file: `<action>.flow.ts` (e.g., `getList.flow.ts`)

## Flow Template

```typescript
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createFlow } from '../../lib/flowWrapper';
import { isValidRole } from '../../lib/auth';
import { isValid } from '../../lib/validation';
import { FlowContext } from '../../resources/context';
import { FlowException, FlowInput } from '../../types/flow';

const inputSchema = z.object({
  // Define input validation
});

type Input = FlowInput<z.infer<typeof inputSchema>>;

export const <action>Flow = (ctx: FlowContext) =>
  createFlow<Input, ResponseType>('api.v1.<module>.<action>', async (input, trace, ok) => {
    // Auth check (if protected)
    const userinfo = isValidRole({ userinfo: input.userinfo });

    // Input validation (if needed)
    const data = isValid(inputSchema, input.payload);

    // Business logic
    trace.push('Doing something');

    // Return result
    return ok({ ... });
  });
```

## Route Template

```typescript
// In entrypoint/<module>.route.ts
app.get('/api/v1/<module>/<path>', route(ctx, 'api.v1.<module>.<action>'));

// Or with auth
app.get('/api/v1/<module>/<path>', { preHandler: auth }, route(ctx, 'api.v1.<module>.<action>'));
```

## Checklist for New API

1. [ ] Create flow file in `server/src/flows/<module>/<action>.flow.ts`
2. [ ] Add Zod input schema
3. [ ] Implement business logic with trace messages
4. [ ] Register flow in `server/src/flows/register.ts`
5. [ ] Add route in `server/src/entrypoint/<module>.route.ts`
6. [ ] Test with curl

## Common Patterns

### Protected route (requires auth)

```typescript
const userinfo = isValidRole({ userinfo: input.userinfo });
```

### Protected route (specific role)

```typescript
const userinfo = isValidRole({ userinfo: input.userinfo, roles: ['admin'] });
```

### Root admin only

```typescript
const userinfo = isValidRole({ userinfo: input.userinfo });
if (!userinfo.root) {
  throw new FlowException(403, 'FORBIDDEN', 'Root admin required');
}
```

### Query with pagination

```typescript
const inputSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
});

const offset = (data.page - 1) * data.limit;
const items = await ctx.db.query.table.findMany({
  limit: data.limit,
  offset,
});
```

### Return 201 for created

```typescript
return ok({ id: created.id }, 201);
```

## When to Use

- User asks to create a new API endpoint
- User asks to update an existing API
- User asks to fix an API bug
- User asks to add a new feature to an API
