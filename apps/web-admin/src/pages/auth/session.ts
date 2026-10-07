import { ApiError } from '@pospe/api-client';
import type { Role } from '@pospe/permissions';
import { useAuthStore } from '../../store/useAuthStore';

export interface SessionResponse {
  token: string;
  refreshToken: string;
  user: { name: string; email: string; role: Role };
}

export type LoginResponse = { requiresTwoFactor: true; pendingToken: string } | SessionResponse;

/** Stores a freshly issued session (login, 2FA, email verification). */
export function startSession(res: SessionResponse) {
  useAuthStore.getState().login({ name: res.user.name, email: res.user.email, role: res.user.role }, res.token, res.refreshToken);
}

export function landingPathFor(role: Role) {
  return role === 'super_admin' ? '/superadmin' : '/dashboard';
}

export interface LoginFailure {
  message: string;
  requiresEmailVerification?: boolean;
  email?: string;
}

/** Turns a failed login call into what the form should show/do. */
export function describeLoginError(err: unknown): LoginFailure {
  if (!(err instanceof ApiError)) return { message: 'Could not reach the server. Check your connection.' };
  let body: { error?: unknown; requiresEmailVerification?: boolean; email?: string } = {};
  try {
    body = JSON.parse(err.body);
  } catch {
    // non-JSON body
  }
  const message = typeof body.error === 'string' ? body.error : 'Invalid email or password.';
  if (err.status === 401) return { message: 'Invalid email or password.' };
  if (body.requiresEmailVerification) return { message, requiresEmailVerification: true, email: body.email };
  return { message };
}

/**
 * The backend's error for a failed call: a plain `{ error }` message, or the
 * first field error from a zod-flattened validation error.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  try {
    const body = JSON.parse(err.body) as { error?: unknown };
    if (typeof body.error === 'string') return body.error;
    const fieldErrors = (body.error as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
    const first = fieldErrors && Object.values(fieldErrors).find((v) => Array.isArray(v) && v.length);
    if (first) return first[0];
  } catch {
    // non-JSON body
  }
  return fallback;
}
