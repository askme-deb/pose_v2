import { useEffect, useState } from 'react';
import { apiClient } from '../services/api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useTenantStore, type Branch } from '../store/useTenantStore';

interface ApiBranch {
  id: string;
  name: string;
  code: string | null;
  isActive?: boolean;
}

interface Me {
  tenantId: string;
  tenantName: string;
  storeId: string | null;
}

/**
 * After sign-in: make sure we know which business this is (older stored
 * sessions predate tenantName/storeId), then load its branches and settle on
 * the active one. Returns false until that has settled (success or not), so
 * the page isn't rendered once against the wrong branch and again right after.
 */
export function useBranchBootstrap(): boolean {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const [settledFor, setSettledFor] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    // Platform admins work across businesses; there is no branch to scope to.
    if (role === 'super_admin') {
      setSettledFor(token);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const auth = useAuthStore.getState();
        let user = auth.user;
        if (user && (!user.tenantName || user.storeId === undefined)) {
          const me = await apiClient.get<Me>('/api/auth/me');
          auth.updateUser({ tenantId: me.tenantId, tenantName: me.tenantName, storeId: me.storeId });
          user = useAuthStore.getState().user;
        }
        const rows = await apiClient.get<ApiBranch[]>('/api/sales/branches');
        if (cancelled) return;
        const branches: Branch[] = rows.filter((b) => b.isActive !== false).map((b) => ({ id: b.id, name: b.name, code: b.code ?? '' }));
        useTenantStore.getState().setBranches(branches, user?.tenantId, user?.storeId);
      } catch {
        // Leave the list empty: requests fall back to the server's default branch.
      } finally {
        if (!cancelled) setSettledFor(token);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, role]);

  return settledFor === token;
}
