import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@pospe/ui-library';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/api/client';
import type { Role } from '@pospe/permissions';

interface LocationState {
  pendingToken?: string;
}

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const pendingToken = (location.state as LocationState | null)?.pendingToken;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // No pending login session to verify against (e.g. a direct hit on /2fa)
    // — nothing to do here but go back and start over.
    if (!pendingToken) navigate('/login', { replace: true });
  }, [pendingToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingToken || code.length !== 6) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post<{ token: string; user: { name: string; email: string; role: Role } }>(
        '/api/auth/login/2fa-verify',
        { pendingToken, token: code },
      );
      login({ name: res.user.name, email: res.user.email, role: res.user.role }, res.token);
      navigate('/dashboard');
    } catch {
      setError('Invalid or expired code — try again.');
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-6 relative overflow-hidden animate-scale-in text-center">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

      <div className="space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Two-Factor Authentication
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Enter the code from your authenticator app.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
          required
          autoFocus
          className="w-full p-2.5 text-center font-mono text-lg tracking-[0.4em] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
        />
        {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        <Button type="submit" className="w-full !rounded-xl py-3" disabled={submitting || code.length !== 6}>
          {submitting ? 'Verifying…' : 'Authenticate'}
        </Button>
      </form>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
