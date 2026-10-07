import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MessageSquareLock } from 'lucide-react';
import { Button, useToast } from '@pospe/ui-library';
import { apiClient } from '../../services/api/client';
import { apiErrorMessage, landingPathFor, startSession, type SessionResponse } from './session';

const DIGIT_COUNT = 6;

interface LocationState {
  email?: string;
}

// Confirms the 6-digit code emailed after self-serve signup (or when an
// unverified account tries to sign in), then signs the owner straight in.
export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const email = (location.state as LocationState | null)?.email;

  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate('/login', { replace: true });
  }, [email, navigate]);

  const handleChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    // Pasting the whole code into any box fills every box.
    if (clean.length > 1) {
      const next = clean.slice(0, DIGIT_COUNT).split('');
      setDigits([...next, ...Array(DIGIT_COUNT - next.length).fill('')]);
      inputRefs.current[Math.min(next.length, DIGIT_COUNT - 1)]?.focus();
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < DIGIT_COUNT - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post<SessionResponse>('/api/auth/verify-email', { email, code: digits.join('') });
      startSession(res);
      showToast(`Welcome to Pospe, ${res.user.name}!`, 'success');
      navigate(landingPathFor(res.user.role));
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid or expired code.'));
      setDigits(Array(DIGIT_COUNT).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await apiClient.post('/api/auth/verify-email/resend', { email });
      showToast('A new code is on its way.', 'success');
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not resend the code.'), 'danger');
    } finally {
      setResending(false);
    }
  };

  const complete = digits.every((d) => d.length === 1);

  return (
    <div className="w-full max-w-md glass-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-6 relative overflow-hidden animate-scale-in text-center">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

      <div className="space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30">
          <MessageSquareLock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Verify your email</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          We sent a 6-digit code to <span className="font-bold text-slate-700 dark:text-slate-200">{email}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex justify-center gap-2">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={DIGIT_COUNT}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              className="w-11 h-12 text-center font-bold text-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          ))}
        </div>
        {error && <p className="text-[12px] text-red-600 dark:text-red-400 font-semibold">{error}</p>}
        <Button type="submit" disabled={!complete || submitting} className="w-full !rounded-xl py-3">
          {submitting ? 'Verifying…' : 'Verify & Continue'}
        </Button>
      </form>

      <div className="text-xs text-slate-500 dark:text-slate-400 space-x-3">
        <button type="button" onClick={handleResend} disabled={resending} className="font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
          {resending ? 'Sending…' : 'Resend code'}
        </button>
        <span>·</span>
        <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
