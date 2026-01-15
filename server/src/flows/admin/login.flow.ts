import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createFlow } from '../../lib/flowWrapper';
import { isValid } from '../../lib/validation';
import { FlowContext } from '../../resources/context';
import { admins } from '../../schemas/admin';
import { FlowException, FlowInput } from '../../types/flow';
import { signJwt } from '../auth.flow';

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginInput = FlowInput<z.infer<typeof inputSchema>>;

export const adminLoginFlow = (ctx: FlowContext) =>
  createFlow<LoginInput, { token: string }>('api.v1.admin.login', async (input, trace, ok) => {
    const { email, password } = isValid(inputSchema, input.payload);

    trace.push('Looking up admin by email');
    const admin = await ctx.db.query.admins.findFirst({
      where: eq(admins.email, email),
    });

    if (!admin) {
      throw new FlowException(401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    trace.push('Verifying password');
    const valid = await ctx.password.verify(password, admin.passwordHash);

    if (!valid) {
      throw new FlowException(401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    trace.push('Generating JWT token');
    const token = signJwt({ id: admin.id, email: admin.email, role: 'admin', root: admin.root }, ctx.config.jwt.secret);

    return ok({ token });
  });
