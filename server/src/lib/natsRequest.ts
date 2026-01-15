import { randomUUID } from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { StringCodec } from 'nats';
import { FlowContext } from '../resources/context';
import { FlowResult } from '../types/flow';

const sc = StringCodec();

export const natsRequest = async <T>(ctx: FlowContext, subject: string, payload: unknown): Promise<FlowResult<T>> => {
  const msg = await ctx.nats.request(subject, sc.encode(JSON.stringify(payload)), {
    timeout: 30000,
  });
  return JSON.parse(sc.decode(msg.data));
};

export const route = (ctx: FlowContext, subject: string) => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const traceId = (req.headers['x-trace-id'] as string) || randomUUID();

    const result = await natsRequest(ctx, subject, {
      traceId,
      userinfo: (req as any).userinfo,
      payload: req.body,
    });

    // Log trace internally (for monitoring later)
    console.log({ traceId, subject, trace: result.trace });

    // Strip trace from response
    const { trace, ...response } = result;

    return reply.header('x-trace-id', traceId).status(response.status).send(response);
  };
};
