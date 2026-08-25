export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
}

// Every access token issued by authentication-service carries the caller's
// tenantId as a JWT claim (see services/authentication/src/lib/tokens.ts).
// Decoding it client-side to derive x-tenant-id means every request is
// automatically scoped to whichever tenant actually logged in — without this,
// every backend route silently falls back to the single seeded demo tenant
// (see resolveTenantId in each service's lib/prisma.ts), so a real second
// tenant's dashboard would otherwise show someone else's data. This only
// reads the payload (no signature check) — the same trust boundary as
// storing the token at all; the server still verifies it on every request.
function decodeTenantId(token: string): string | null {
  try {
    const payloadB64 = token.split('.')[1];
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { tenantId?: string };
    return payload.tenantId ?? null;
  } catch {
    return null;
  }
}

export class ApiClient {
  constructor(private opts: ApiClientOptions) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.opts.getToken?.();
    const tenantId = token ? decodeTenantId(token) : null;
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown, init: RequestInit = {}) {
    return this.request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
