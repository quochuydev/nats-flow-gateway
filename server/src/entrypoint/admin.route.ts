import { FastifyInstance } from 'fastify';
import { FlowContext } from '../resources/context.js';
import { route } from '../lib/natsRequest.js';
import { authMiddleware } from '../middleware/auth.js';

export const adminRoute = (app: FastifyInstance, ctx: FlowContext) => {
  const auth = authMiddleware(ctx);

  app.post('/api/v1/admin/login', route(ctx, 'api.v1.admin.login'));
  app.post('/api/v1/admin/create-admin', { preHandler: auth }, route(ctx, 'api.v1.admin.createAdmin'));
  app.get('/api/v1/admin/list', { preHandler: auth }, route(ctx, 'api.v1.admin.getList'));
};
