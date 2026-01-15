import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createFlow } from '../../lib/flowWrapper';
import { isValidRole } from '../../lib/auth';
import { isValid } from '../../lib/validation';
import { FlowContext } from '../../resources/context';
import { admins } from '../../schemas/admin';
import { FlowException, FlowInput } from '../../types/flow';

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type CreateAdminInput = FlowInput<z.infer<typeof inputSchema>>;

export const createAdminFlow = (ctx: FlowContext) =>
  createFlow<CreateAdminInput, { id: string }>('api.v1.admin.createAdmin', async (input, trace, ok) => {
    const userinfo = isValidRole({ userinfo: input.userinfo });
    const { email, password } = isValid(inputSchema, input.payload);

    if (!userinfo.root) {
      throw new FlowException(403, 'FORBIDDEN', 'Root admin required');
    }

    trace.push('Checking email not taken');
    const existing = await ctx.db.query.admins.findFirst({
      where: eq(admins.email, email),
    });

    if (existing) {
      throw new FlowException(409, 'CONFLICT', 'Email already exists');
    }

    trace.push('Hashing password');
    const passwordHash = await ctx.password.hash(password);

    trace.push('Creating admin');
    const [admin] = await ctx.db
      .insert(admins)
      .values({
        email,
        passwordHash,
        root: false,
        createdBy: userinfo.id,
      })
      .returning();

    return ok({ id: admin.id }, 201);
  });
