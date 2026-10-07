import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delete, Store } from 'lucide-react';
import { ApiError } from '@pospe/api-client';
import logo from '../assets/logo.svg';
import { usePosSessionStore } from '../store/usePosSessionStore';
import { useTerminalStore } from '../store/useTerminalStore';
import { apiClient } from '../services/api/client';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'go'];
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface PinLoginResponse {
  token: string;
  refreshToken: string;
  user: { name: string };
  store: { id: string; name: string };
}

interface ManagerSession {
  token: string;
  user: { name: string; role: string; storeId: string | null; tenantName: string };
}

type ManagerLoginResponse = { requiresTwoFactor: true; pendingToken: string } | ManagerSession;

function serverMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.serverMessage : fallback;
}

// A terminal must be paired with one store before cashiers can use PINs:
// PINs are short, so they're only ever matched against that store's staff.
function PairTerminal() {
  const pair = useTerminalStore((s) => s.pair);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish(session: ManagerSession) {
    if (session.user.role === 'cashier') throw new Error('A manager or owner must pair this terminal.');
    if (!session.user.storeId) throw new Error('This account has no store to pair with.');
    pair(session.user.storeId, session.user.tenantName);
    // The manager's session was only needed to prove who paired the
    // terminal — end it right away so it doesn't linger on a shared device.
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } }).catch(() => {});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (pendingToken) {
        await finish(await apiClient.post<ManagerSession>('/api/auth/login/2fa-verify', { pendingToken, token: code }));
        return;
      }
      const res = await apiClient.post<ManagerLoginResponse>('/api/auth/login', { email, password });
      if ('requiresTwoFactor' in res) setPendingToken(res.pendingToken);
      else await finish(res);
    } catch (err) {
      setError(err instanceof ApiError ? serverMessage(err, 'Sign-in failed') : err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30';

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Store className="w-4 h-4 text-blue-600" />
        <span>Pair this terminal with your store. A manager signs in once.</span>
      </div>
      {!pendingToken ? (
        <>
          <input className={inputClass} type="email" placeholder="Manager email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </>
      ) : (
        <input
          className={`${inputClass} font-mono tracking-widest text-center`}
          inputMode="numeric"
          maxLength={6}
          placeholder="Authenticator code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      )}
      <p className="text-xs font-semibold text-red-500 min-h-4">{error}</p>
      <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
        {busy ? 'Pairing…' : pendingToken ? 'Verify & Pair' : 'Pair Terminal'}
      </button>
    </form>
  );
}

export default function PosLoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const login = usePosSessionStore((s) => s.login);
  const { storeId, storeName, pair, unpair } = useTerminalStore();

  const press = async (key: string) => {
    if (submitting || !storeId) return;
    if (key === 'clear') {
      setPin('');
      setError(null);
      return;
    }
    if (key === 'go') {
      if (pin.length !== 4) return;
      setSubmitting(true);
      setError(null);
      try {
        const res = await apiClient.post<PinLoginResponse>('/api/auth/login/pin', { pin, storeId });
        pair(res.store.id, res.store.name);
        login({ cashierName: res.user.name, registerName: res.store.name, shiftLabel: 'Current Shift' }, res.token, res.store.id, res.refreshToken);
        navigate('/pos');
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) unpair();
        setError(serverMessage(err, 'Could not reach the server'));
        setPin('');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (pin.length < 4) {
      setError(null);
      setPin((p) => p + key);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 text-center">
        <img src={logo} alt="Pospe Logo" className="h-9 mx-auto" />
        {!storeId ? (
          <PairTerminal />
        ) : (
          <>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">Cashier PIN Login</h1>
              <p className="text-xs text-slate-400 mt-1">{storeName ?? 'Paired store'} · enter your 4-digit PIN</p>
            </div>

            <div className="flex items-center justify-center gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 ${i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}
                />
              ))}
            </div>

            <p className="text-xs font-semibold text-red-500 min-h-4">{error ?? (submitting ? 'Checking...' : '')}</p>

            <div className="grid grid-cols-3 gap-2.5">
              {KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => press(key)}
                  className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center"
                >
                  {key === 'clear' ? <span className="text-xs font-bold text-slate-500">Clear</span> : key === 'go' ? (
                    <span className="text-xs font-bold text-blue-600">GO</span>
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setPin((p) => p.slice(0, -1))}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Delete className="w-3.5 h-3.5" />
                Backspace
              </button>
              <button onClick={unpair} className="text-[11px] font-semibold text-slate-400 hover:text-red-500">
                Unpair terminal
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
