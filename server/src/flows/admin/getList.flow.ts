import { z } from 'zod';
import { createFlow } from '../../lib/flowWrapper';
import { isValidRole } from '../../lib/auth';
import { isValid } from '../../lib/validation';
import { FlowContext } from '../../resources/context';
import { FlowInput } from '../../types/flow';

const inputSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
});

type ValidatedInput = z.output<typeof inputSchema>;
type Input = FlowInput<z.input<typeof inputSchema>>;

type AdminItem = {
  id: string;
  email: string;
  root: boolean;
  createdAt: Date;
};

type Response = {
  items: AdminItem[];
  total: number;
  page: number;
  limit: number;
};

export const getListFlow = (ctx: FlowContext) =>
  createFlow<Input, Response>('api.v1.admin.getList', async (input, trace, ok) => {
    const userinfo = isValidRole({ userinfo: input.userinfo, roles: ['admin'] });

    const { page, limit } = isValid(inputSchema, input.payload || {}) as ValidatedInput;

    trace.push('Fetching admin list');
    const offset = (page - 1) * limit;

    const items = await ctx.db.query.admins.findMany({
      columns: {
        id: true,
        email: true,
        root: true,
        createdAt: true,
      },
      limit,
      offset,
    });

    trace.push('Counting total admins');
    const allAdmins = await ctx.db.query.admins.findMany();
    const total = allAdmins.length;

    return ok({ items, total, page, limit });
  });
