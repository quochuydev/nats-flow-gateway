import { FlowException, FlowResult, OkFn } from '../types/flow.js';

export const createFlow = <I, O>(
  name: string,
  fn: (input: I, trace: string[], ok: OkFn<O>) => Promise<FlowResult<O>>
) => {
  return async (input: I): Promise<FlowResult<O>> => {
    const trace: string[] = [];

    const ok = (data: O, status = 200): FlowResult<O> => {
      trace.push('SUCCESS');
      return { success: true, status, data, trace };
    };

    try {
      return await fn(input, trace, ok);
    } catch (err) {
      if (err instanceof FlowException) {
        trace.push(err.traceMessage || `REJECTED: ${err.message}`);
        return {
          success: false,
          status: err.status,
          errorCode: err.errorCode,
          message: err.message,
          detailed: err.detailed,
          trace,
        };
      }
      trace.push(`ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return {
        success: false,
        status: 500,
        errorCode: 'INTERNAL_ERROR',
        message: 'Unexpected error',
        detailed: [],
        trace,
      };
    }
  };
};
