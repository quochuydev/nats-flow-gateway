import { ZodSchema } from 'zod';
import { FlowException } from '../types/flow';

export const isValid = <T>(schema: ZodSchema<T>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const detailed = parsed.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw new FlowException(400, 'VALIDATION_ERROR', 'Invalid input', detailed);
  }
  return parsed.data;
};
