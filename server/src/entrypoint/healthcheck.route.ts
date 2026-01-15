import { FastifyInstance } from 'fastify';
import { FlowContext } from '../resources/context';
import { route } from '../lib/natsRequest';

export const healthcheckRoute = (app: FastifyInstance, ctx: FlowContext) => {
  app.get('/api/v1/healthcheck', route(ctx, 'api.v1.healthcheck'));
};
