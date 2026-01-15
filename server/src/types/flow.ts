export const ErrorCodes = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  CONFLICT: { code: 'CONFLICT', status: 409 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

export type FlowOutput<T> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; errorCode: ErrorCode; message: string; detailed: any[] };

export type FlowResult<T> = FlowOutput<T> & { trace: string[] };

export class FlowException {
  constructor(
    public status: number,
    public errorCode: ErrorCode,
    public message: string,
    public detailed: any[] = [],
    public traceMessage: string = ''
  ) {}
}

export type UserInfo = {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  root?: boolean;
};

export type FlowInput<T> = {
  traceId: string;
  userinfo?: UserInfo;
  payload: T;
};

export type OkFn<O> = (data: O, status?: number) => FlowResult<O>;
