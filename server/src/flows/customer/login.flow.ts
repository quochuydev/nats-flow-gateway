import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createFlow } from '../../lib/flowWrapper.js';
import { isValid } from '../../lib/validation.js';
import { FlowContext } from '../../resources/context.js';
import { customers } from '../../schemas/customer.js';
import { FlowException, FlowInput } from '../../types/flow.js';
import { signJwt } from '../auth.flow.js';

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginInput = FlowInput<z.infer<typeof inputSchema>>;

export const customerLoginFlow = (ctx: FlowContext) =>
  createFlow<LoginInput, { token: string }>('api.v1.customer.login', async (input, trace, ok) => {
    const { email, password } = isValid(inputSchema, input.payload);

    trace.push('Looking up customer by email');
    const customer = await ctx.db.query.customers.findFirst({
      where: eq(customers.email, email),
    });

    if (!customer) {
      throw new FlowException(401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    trace.push('Verifying password');
    const valid = await ctx.password.verify(password, customer.passwordHash);

    if (!valid) {
      throw new FlowException(401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    trace.push('Generating JWT token');
    const token = signJwt(
      { id: customer.id, email: customer.email, role: 'customer' },
      ctx.config.jwt.secret
    );

    return ok({ token });
  });
