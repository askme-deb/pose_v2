import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '@pospe/permissions';

const IST = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';

const pad = (n: number | string) => String(n).padStart(2, '0');

function istParts(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return parts;
}

/** DD-MM-YYYY in India time — the contract's date shape for transactions. */
export function ddmmyyyy(d: Date): string {
  const p = istParts(d);
  return `${p.day}-${p.month}-${p.year}`;
}
export function ddmmyyyyHhmm(d: Date): string {
  const p = istParts(d);
  return `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute}`;
}
export function ymd(d: Date): string {
  const p = istParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}
export const monthName = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: IST, month: 'long' }).format(d);
export const weekdayName = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: IST, weekday: 'long' }).format(d);

/** Start of an India calendar day from YYYY-MM-DD or DD-MM-YYYY. */
export function dayStart(input: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input) ?? null;
  const n = /^(\d{2})-(\d{2})-(\d{4})$/.exec(input) ?? null;
  const parts = m ? [m[1], m[2], m[3]] : n ? [n[3], n[2], n[1]] : null;
  if (!parts) return null;
  const date = new Date(`${parts[0]}-${pad(parts[1])}-${pad(parts[2])}T00:00:00${IST_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}
export const dayEnd = (start: Date) => new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
export const startOfTodayIst = () => dayStart(ymd(new Date()))!;

export interface DateRange {
  from: Date;
  to: Date;
}

/** Dashboard / report presets (`TD`, `YD`, `15D`, … or an explicit Custom range). */
export function rangeFor(key: string | undefined, startDate?: string, endDate?: string): DateRange {
  const today = startOfTodayIst();
  const day = 24 * 60 * 60 * 1000;
  const back = (days: number): DateRange => ({ from: new Date(today.getTime() - (days - 1) * day), to: dayEnd(today) });
  switch ((key ?? 'TD').toLowerCase()) {
    case 'yd':
    case 'yesterday':
      return { from: new Date(today.getTime() - day), to: new Date(today.getTime() - 1) };
    case '15d':
    case '15days':
      return back(15);
    case '1m':
    case 'monthly':
      return back(30);
    case '3m':
    case 'quarterly':
      return back(90);
    case '6m':
      return back(180);
    case '1y':
      return back(365);
    case 'custom': {
      const from = startDate ? dayStart(startDate) : null;
      const to = endDate ? dayStart(endDate) : null;
      if (from && to) return { from, to: dayEnd(to) };
      return back(1);
    }
    default:
      return back(1);
  }
}

export const titleCaseMethod = (m: string) => (m === 'UPI' ? 'UPI' : m.charAt(0) + m.slice(1).toLowerCase());
export const num = (v: unknown): number => Number(v ?? 0);
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** `HLD-XXXXXX` — a held bill has no invoice number yet, so the app is shown this stable code. */
export const holdCode = (id: string) => `HLD-${id.slice(-6).toUpperCase()}`;
export const idFromHoldCode = (code: string) => code.replace(/^HLD-/i, '').toLowerCase();

/**
 * The app toasts `body.message` on every error, but the shared middleware
 * (requireAuth, validation, …) answers `{ error }`. Mirror one into the other
 * so no failure reaches the user as a blank toast.
 */
export function messageShim(_req: Request, res: Response, next: NextFunction) {
  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode >= 400 && body && typeof body === 'object' && !Array.isArray(body)) {
      const b = body as Record<string, unknown>;
      if (b.message == null && b.error != null) {
        b.message = typeof b.error === 'string' ? b.error : 'Invalid request';
      } else if (b.error == null && typeof b.message === 'string') {
        b.error = b.message;
      }
    }
    return json(body);
  };
  next();
}

export function mobileErrorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ status: false, message: err.message });
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({ status: false, message: first ? `${first.path.join('.') || 'request'}: ${first.message}` : 'Invalid request' });
  }
  const status = (err as { status?: number }).status;
  if (status && status < 500) return res.status(status).json({ status: false, message: (err as Error).message });
  req.log?.error({ err }, 'mobile-service request failed');
  return res.status(500).json({ status: false, message: 'Something went wrong. Please try again.' });
}

/** Parse a body/query value that the app may send as number or numeric string. */
export function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Express 4 drops a rejected promise from an async handler (the process then
 * crashes). @pospe/utilities' installAsyncErrorHandling does the same patch,
 * but it patches whichever copy of express *it* resolves; patching from here
 * guarantees it is the copy this service actually routes with.
 */
export function ensureAsyncErrorHandling() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Layer = require('express/lib/router/layer') as {
    prototype: { handle: (...a: unknown[]) => unknown; handle_request: (req: Request, res: Response, next: NextFunction) => void; __mobileAsyncPatched?: boolean };
  };
  if (Layer.prototype.__mobileAsyncPatched) return;
  Layer.prototype.__mobileAsyncPatched = true;
  Layer.prototype.handle_request = function handleRequest(this: typeof Layer.prototype, req, res, next) {
    const fn = this.handle as unknown as (req: Request, res: Response, next: NextFunction) => unknown;
    if (fn.length > 3) return next();
    try {
      const result = fn(req, res, next) as Promise<unknown> | undefined;
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}
