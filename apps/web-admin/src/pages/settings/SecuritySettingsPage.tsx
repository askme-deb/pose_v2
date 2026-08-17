import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';
import { Badge, Button, GlassCard, Input, useToast } from '@pospe/ui-library';
import { getTwoFaStatus, setupTwoFa, confirmTwoFa, disableTwoFa, type TwoFaSetup } from '../../services/api/twoFactor';

export default function SecuritySettingsPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [setup, setSetup] = useState<TwoFaSetup | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  function refreshStatus() {
    return getTwoFaStatus()
      .then((res) => setTwoFaEnabled(res.twoFaEnabled))
      .catch(() => showToast('Failed to load security settings', 'danger'));
  }

  useEffect(() => {
    refreshStatus().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartSetup() {
    setBusy(true);
    try {
      const res = await setupTwoFa();
      setSetup(res);
    } catch {
      showToast('Failed to start 2FA setup', 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      await confirmTwoFa(code);
      setSetup(null);
      setCode('');
      await refreshStatus();
      showToast('Two-factor authentication enabled', 'success');
    } catch {
      showToast('Invalid code — try again', 'danger');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      await disableTwoFa();
      await refreshStatus();
      showToast('Two-factor authentication disabled', 'success');
    } catch {
      showToast('Failed to disable 2FA', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Security</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage two-factor authentication for your own account.
          </p>
        </div>
      </div>

      <GlassCard className="space-y-6 max-w-xl">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Two-Factor Authentication</h3>
            <p className="text-xs text-slate-400">Require a code from an authenticator app in addition to your password.</p>
          </div>
          {!loading && (
            <Badge color={twoFaEnabled ? 'emerald' : 'slate'} pill dot>
              {twoFaEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : twoFaEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>Two-factor authentication is protecting this account. You&apos;ll be asked for a code every time you sign in.</span>
            </div>
            <Button variant="danger" onClick={handleDisable} disabled={busy}>
              <ShieldOff className="w-4 h-4" />
              Disable Two-Factor Authentication
            </Button>
          </div>
        ) : setup ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scan or manually enter this key into an authenticator app (Google Authenticator, Authy, 1Password…), then enter the 6-digit
              code it shows to finish enabling 2FA.
            </p>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Manual entry key</p>
              <p className="font-mono text-sm font-bold text-slate-900 dark:text-white break-all select-all">{setup.secret}</p>
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider pt-2">Setup URI</p>
              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-all">{setup.otpauthUrl}</p>
            </div>
            <div className="flex items-end gap-3">
              <Input
                label="Confirmation Code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="font-mono tracking-widest"
              />
              <Button onClick={handleConfirm} disabled={busy || code.length !== 6}>
                Confirm & Enable
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <KeyRound className="w-5 h-5 shrink-0" />
              <span>Two-factor authentication is currently off. Anyone with your password can sign in.</span>
            </div>
            <Button onClick={handleStartSetup} disabled={busy}>
              <ShieldCheck className="w-4 h-4" />
              Enable Two-Factor Authentication
            </Button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
