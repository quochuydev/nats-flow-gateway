import { FastifyInstance } from 'fastify';
import { FlowContext } from '../resources/context.js';
import { route } from '../lib/natsRequest.js';

export const customerRoute = (app: FastifyInstance, ctx: FlowContext) => {
  app.post('/api/v1/customer/login', route(ctx, 'api.v1.customer.login'));
  app.post('/api/v1/customer/register', route(ctx, 'api.v1.customer.register'));
};
