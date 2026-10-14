import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, MailCheck, RefreshCw } from 'lucide-react';
import { Badge, Button, useToast } from '@pospe/ui-library';
import { apiClient } from '../../services/api/client';
import { formatDateTime } from '../../utils/format';

interface PendingCode {
  to: string;
  name: string;
  purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFY' | 'INVITE' | string;
  code: string;
  at: string;
}

interface DevCodesResponse {
  emailConfigured: boolean;
  codes: PendingCode[];
}

// What each code is for, and how long it stays valid (see authentication-service lib/otp.ts).
const PURPOSE: Record<string, { label: string; validFor: string }> = {
  PASSWORD_RESET: { label: 'Password reset', validFor: '15 minutes' },
  EMAIL_VERIFY: { label: 'Sign-up email verification', validFor: '30 minutes' },
  INVITE: { label: 'Invite: set password', validFor: '72 hours' },
};

/**
 * Testing aid while no mail server is configured: the sign-in codes that
 * would have been emailed. Only the platform admin can see this, and the
 * list stays empty once SMTP is set up.
 */
export default function SuperAdminCodesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<DevCodesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiClient.get<DevCodesResponse>('/api/notification/dev-codes'));
      setError(null);
    } catch {
      setError('Could not load codes from the notification service.');
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  function copy(code: string) {
    void navigator.clipboard?.writeText(code);
    showToast(`Copied ${code}`, 'success');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Sign-in Codes</h1>
            {data && (
              <Badge color={data.emailConfigured ? 'emerald' : 'amber'} pill dot>
                {data.emailConfigured ? 'Email is configured' : 'Email not configured: codes shown here'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Password-reset, sign-up and invite codes that couldn't be emailed. Give the code to the person it was sent
            to. Newest first; refreshes every 5 seconds. Cleared when the notification service restarts.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {data?.emailConfigured ? (
        <div className="glass-card p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
          <MailCheck className="w-8 h-8 text-emerald-600 mx-auto" />
          <p className="font-bold text-slate-900 dark:text-white">Codes are being emailed</p>
          <p className="text-sm text-slate-500">A mail server is set up, so codes go to the user's inbox and aren't shown here.</p>
        </div>
      ) : data && data.codes.length === 0 ? (
        <div className="glass-card p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
          <KeyRound className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-900 dark:text-white">No codes yet</p>
          <p className="text-sm text-slate-500">Use "Forgot password", sign up, or invite a user, and the code will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {data?.codes.map((c) => {
            const purpose = PURPOSE[c.purpose] ?? { label: c.purpose, validFor: '' };
            return (
              <div
                key={`${c.to}-${c.at}`}
                className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {c.name} <span className="font-normal text-slate-500">({c.to})</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {purpose.label} &middot; sent {formatDateTime(c.at)}
                    {purpose.validFor && <> &middot; valid for {purpose.validFor}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black tracking-[0.3em] text-blue-600 dark:text-blue-400">{c.code}</span>
                  <button
                    onClick={() => copy(c.code)}
                    title="Copy code"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
