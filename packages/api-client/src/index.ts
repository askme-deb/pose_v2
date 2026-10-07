export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
  // With these two set, an expired access token is refreshed transparently:
  // on a 401 the client calls POST /api/auth/refresh once, stores the new
  // pair via onTokens, and replays the original request.
  getRefreshToken?: () => string | null | undefined;
  onTokens?: (tokens: AuthTokens) => void;
  // Called when the session can't be recovered (refresh failed or wasn't
  // possible), so the app can drop it instead of toasting 401s forever.
  onUnauthorized?: () => void;
}

/**
 * Message format stays `API error <status>: <body>` — several pages parse
 * it — with the status and parsed body also available as fields.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API error ${status}: ${body}`);
  }

  /** The server's `error` field when it's a string, else the raw body. */
  get serverMessage(): string {
    try {
      const parsed = JSON.parse(this.body) as { error?: unknown };
      if (typeof parsed.error === 'string') return parsed.error;
    } catch {
      // not JSON
    }
    return this.body;
  }
}

const REFRESH_PATH = '/api/auth/refresh';

export class ApiClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(private opts: ApiClientOptions) {}

  // Single-flight: many requests failing at once share one refresh call.
  private refreshSession(): Promise<boolean> {
    const refreshToken = this.opts.getRefreshToken?.();
    if (!refreshToken || !this.opts.onTokens) return Promise.resolve(false);
    if (!this.refreshing) {
      this.refreshing = (async () => {
        try {
          const res = await fetch(`${this.opts.baseUrl}${REFRESH_PATH}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (!res.ok) return false;
          const tokens = (await res.json()) as AuthTokens;
          this.opts.onTokens!({ token: tokens.token, refreshToken: tokens.refreshToken });
          return true;
        } catch {
          return false;
        } finally {
          this.refreshing = null;
        }
      })();
    }
    return this.refreshing;
  }

  private async send(path: string, init: RequestInit, json: boolean): Promise<Response> {
    const token = this.opts.getToken?.();
    return fetch(`${this.opts.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  }

  private async raw(path: string, init: RequestInit = {}, json = true): Promise<Response> {
    const hadToken = Boolean(this.opts.getToken?.());
    let res = await this.send(path, init, json);
    if (res.status === 401 && hadToken && path !== REFRESH_PATH) {
      if (await this.refreshSession()) res = await this.send(path, init, json);
      if (res.status === 401) this.opts.onUnauthorized?.();
    }
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res;
  }

  private async request<T>(path: string, init: RequestInit = {}, json = true): Promise<T> {
    const res = await this.raw(path, init, json);
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

  /** Multipart upload (the browser sets the multipart boundary header). */
  upload<T>(path: string, form: FormData) {
    return this.request<T>(path, { method: 'POST', body: form }, false);
  }

  /** Authenticated file download (exports). */
  async download(path: string): Promise<{ blob: Blob; filename: string | null }> {
    const res = await this.raw(path);
    const disposition = res.headers.get('content-disposition') ?? '';
    const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? null;
    return { blob: await res.blob(), filename };
  }
}
