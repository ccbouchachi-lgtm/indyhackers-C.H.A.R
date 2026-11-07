import { sessionClient } from './supabase';

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export function validation(message: string): never {
  throw new ApiError(400, 'VALIDATION_ERROR', message);
}

const errorCodes: Record<string, [number, string]> = {
  PT400: [400, 'VALIDATION_ERROR'],
  PT401: [401, 'UNAUTHENTICATED'],
  PT403: [403, 'FORBIDDEN'],
  PT404: [404, 'NOT_FOUND'],
  PT409: [409, 'INVALID_TRANSITION'],
  PT410: [409, 'IDEMPOTENCY_CONFLICT'],
};

export function unwrap<T>({ data, error }: { data: T; error: { code: string; message: string } | null }): T {
  if (error) {
    const mapped = errorCodes[error.code];
    if (mapped) throw new ApiError(...mapped, error.message);
    console.error('GroupLock database error', error.code);
    throw new ApiError(500, 'INTERNAL_ERROR', 'Request failed');
  }
  return data;
}

const noStore = { 'Cache-Control': 'private, no-store' };

export function route<C>(handler: (request: Request, context: C) => Promise<unknown>, status = 200) {
  return async (request: Request, context: C) => {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const expected = new URL(process.env.APP_ORIGIN ?? request.url).origin;
        if (request.headers.get('origin') !== expected) {
          throw new ApiError(403, 'FORBIDDEN', 'Same-origin request required');
        }
      }
      const data = await handler(request, context);
      return Response.json({ data }, { status, headers: noStore });
    } catch (error) {
      const issue = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'Request failed');
      if (!(error instanceof ApiError)) console.error('GroupLock unexpected request failure', error instanceof Error ? error.name : 'Unknown');
      return Response.json({ error: { code: issue.code, message: issue.message } }, {
        status: issue.status, headers: noStore,
      });
    }
  };
}

export async function signedIn() {
  const client = await sessionClient();
  const { data, error } = await client.auth.getClaims();
  const id = data?.claims.sub;
  if (error || !id) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in required');
  return { client, id };
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) validation('Expected a JSON object');
  return value as Record<string, unknown>;
}

export async function body(request: Request) {
  const value: unknown = await request.json().catch(() => validation('Expected valid JSON'));
  return object(value);
}

export function string(value: unknown, field: string, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) validation(`Invalid ${field}`);
  return value;
}

export function uuid(value: unknown, field: string) {
  const input = string(value, field, 36);
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(input)) validation(`Invalid ${field}`);
  return input;
}

export function timestamp(value: unknown, field: string) {
  const input = string(value, field, 64);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(input) || !Number.isFinite(Date.parse(input))) {
    validation(`Invalid ${field}`);
  }
  return input;
}

export function version(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 2147483646) validation(`Invalid ${field}`);
  return value;
}
