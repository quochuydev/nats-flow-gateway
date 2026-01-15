import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createFlow } from '../../lib/flowWrapper.js';
import { isValid } from '../../lib/validation.js';
import { FlowContext } from '../../resources/context.js';
import { customers } from '../../schemas/customer.js';
import { FlowException, FlowInput } from '../../types/flow.js';

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

type RegisterInput = FlowInput<z.infer<typeof inputSchema>>;

export const customerRegisterFlow = (ctx: FlowContext) =>
  createFlow<RegisterInput, { id: string }>('api.v1.customer.register', async (input, trace, ok) => {
    const { email, password, firstName, lastName } = isValid(inputSchema, input.payload);

    trace.push('Checking email not taken');
    const existing = await ctx.db.query.customers.findFirst({
      where: eq(customers.email, email),
    });

    if (existing) {
      throw new FlowException(409, 'CONFLICT', 'Email already exists');
    }

    trace.push('Hashing password');
    const passwordHash = await ctx.password.hash(password);

    trace.push('Creating customer');
    const [customer] = await ctx.db
      .insert(customers)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
      })
      .returning();

    return ok({ id: customer.id }, 201);
  });
