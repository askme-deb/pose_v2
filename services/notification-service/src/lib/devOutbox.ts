// While no mail server is configured, sign-in codes (password reset, invite,
// email verification) can't reach anyone. Keep the recent ones in memory so
// the platform admin can read them in the admin portal for testing. Memory
// only: nothing is persisted, and a restart clears it.

export interface PendingCode {
  to: string;
  name: string;
  purpose: string;
  code: string;
  at: string;
}

const MAX_CODES = 50;
// The longest-lived code is a staff/owner invite (72 hours).
const KEEP_MS = 72 * 60 * 60 * 1000;
const codes: PendingCode[] = [];

function prune() {
  const cutoff = Date.now() - KEEP_MS;
  while (codes.length && (codes.length > MAX_CODES || Date.parse(codes[codes.length - 1].at) < cutoff)) codes.pop();
}

export function recordCode(entry: Omit<PendingCode, 'at'>) {
  codes.unshift({ ...entry, at: new Date().toISOString() });
  prune();
}

export function listCodes(): PendingCode[] {
  prune();
  return [...codes];
}
