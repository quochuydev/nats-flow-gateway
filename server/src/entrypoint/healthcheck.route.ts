import { FastifyInstance } from 'fastify';
import { FlowContext } from '../resources/context.js';
import { route } from '../lib/natsRequest.js';

export const healthcheckRoute = (app: FastifyInstance, ctx: FlowContext) => {
  app.get('/api/v1/healthcheck', route(ctx, 'api.v1.healthcheck'));
};
