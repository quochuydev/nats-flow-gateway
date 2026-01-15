import { FastifyRequest, FastifyReply } from 'fastify';
import { FlowContext } from '../resources/context.js';
import { natsRequest } from '../lib/natsRequest.js';

declare module 'fastify' {
  interface FastifyRequest {
    userinfo?: {
      id: string;
      email: string;
      role: 'admin' | 'customer';
      root?: boolean;
    };
  }
}

export const authMiddleware = (ctx: FlowContext) => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({
        success: false,
        status: 401,
        errorCode: 'UNAUTHORIZED',
        message: 'No token provided',
        detailed: [],
      });
    }

    const auth = await natsRequest<{
      id: string;
      email: string;
      role: 'admin' | 'customer';
      root?: boolean;
    }>(ctx, 'api.v1.auth.validate', { payload: { token } });

    if (!auth.success) {
      const { trace, ...response } = auth;
      return reply.status(response.status).send(response);
    }

    req.userinfo = auth.data;
  };
};
