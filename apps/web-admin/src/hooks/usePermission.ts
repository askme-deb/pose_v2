// Deep import: the package root also exports Express/JWT middleware, which
// must not end up in the browser bundle.
import { listHasPermission } from '@pospe/permissions/src/roles';
import { useAuthStore } from '../store/useAuthStore';

// The access token carries the user's effective permissions (`perms`, from
// the tenant's RBAC matrix) — the same list every service checks. Reading it
// here only decides what UI to offer; the server still enforces it.
function tokenPerms(token: string | null): string[] {
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { perms?: unknown };
    return Array.isArray(payload.perms) ? payload.perms.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

/** Does the signed-in user hold `permission`? Re-evaluates when the token changes. */
export function usePermission(permission: string): boolean {
  return useAuthStore((s) => listHasPermission(tokenPerms(s.token), permission));
}
