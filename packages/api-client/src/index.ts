export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
}

export class ApiClient {
  constructor(private opts: ApiClientOptions) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.opts.getToken?.();
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
