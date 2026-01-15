import { createFlow } from '../lib/flowWrapper.js';
import { FlowContext } from '../resources/context.js';
import { FlowException, FlowInput, UserInfo } from '../types/flow.js';
import { z } from 'zod';
import { isValid } from '../lib/validation.js';
import { createHmac } from 'crypto';

const inputSchema = z.object({
  token: z.string(),
  requiredRole: z.enum(['admin', 'customer']).optional(),
});

type AuthInput = FlowInput<z.infer<typeof inputSchema>>;

export const authFlow = (ctx: FlowContext) =>
  createFlow<AuthInput, UserInfo>('api.v1.auth.validate', async (input, trace, ok) => {
    const { token, requiredRole } = isValid(inputSchema, input.payload);

    trace.push('Verifying token signature');
    const decoded = verifyJwt(token, ctx.config.jwt.secret);
    if (!decoded) {
      throw new FlowException(401, 'UNAUTHORIZED', 'Invalid token');
    }

    if (requiredRole && decoded.role !== requiredRole) {
      trace.push('Checking role requirement');
      throw new FlowException(403, 'FORBIDDEN', 'Insufficient permissions');
    }

    return ok(decoded);
  });

// Simple JWT implementation
function verifyJwt(token: string, secret: string): UserInfo | null {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const expectedSignature = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      root: payload.root,
    };
  } catch {
    return null;
  }
}

export function signJwt(
  payload: { id: string; email: string; role: 'admin' | 'customer'; root?: boolean },
  secret: string,
  expiresInSeconds = 86400
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signature = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}
