## Server

- Working on `./server`
- Lib: `tsx`; `fastify`; `zod`, `fetch`; No `axios`; cors; `drizzle`;
- Open API routers design
- Resource `resources`: Design pattern singleton control drizzle, config, nats
- Flow `./flows`: Design pattern chain of thought, Dependencies injections
- Client -> Proxy -> Fastify server -> Nats Request <-> Nats Reply -> Flow

### Testing

- `vitest`
- Integration test for Flow

### Modules:

- `/api/healthcheck`
- `/api/admin/*`
- `/api/customer/*`
- `/api/*` - public APIs, requested by anyone

## User roles

### Role: Admin

#### Root admin

- username: `admin`
- Can create other admin (email/password)
- Can login to admin app
- Can request to APIs `/api/admin/*`

#### admin

- Create by root admin
- Can login to admin app

### Role: Customer

- Can register
- Can login to mobile app
- Can request to: `/api/customer/*`
