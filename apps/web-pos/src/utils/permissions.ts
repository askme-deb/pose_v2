// Deep import: the package root also exports Express/JWT middleware, which
// must not end up in the browser bundle.
import { hasPermission, type Role } from '@pospe/permissions/src/roles';
import { usePosSessionStore } from '../store/usePosSessionStore';

// The role lives in the access token's payload (see authentication-service's
// lib/tokens.ts). Reading it here only decides what UI to show; the server
// re-checks the permission on every request.
function decodeRole(token: string | null): Role | null {
  if (!token) return null;
  try {
    const payloadB64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: Role };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function canOverridePrice(token = usePosSessionStore.getState().token): boolean {
  const role = decodeRole(token);
  return !!role && hasPermission(role, 'billing:price_override');
}
