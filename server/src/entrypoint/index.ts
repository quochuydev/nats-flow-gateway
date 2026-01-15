import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createContext } from '../resources/context.js';
import { registerFlows } from '../flows/register.js';
import { healthcheckRoute } from './healthcheck.route.js';
import { adminRoute } from './admin.route.js';
import { customerRoute } from './customer.route.js';

const start = async () => {
  const app = Fastify({ logger: true });

  await app.register(cors);

  const ctx = await createContext();

  // Register NATS flow handlers
  await registerFlows(ctx);

  // Register HTTP routes
  healthcheckRoute(app, ctx);
  adminRoute(app, ctx);
  customerRoute(app, ctx);

  await app.listen({ port: ctx.config.port, host: '0.0.0.0' });
  console.log(`Server listening on port ${ctx.config.port}`);
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
