import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button, Input, useToast } from '@pospe/ui-library';
import { apiClient } from '../../services/api/client';
import { apiErrorMessage } from './session';

interface LocationState {
  email?: string;
}

// Redeems a 6-digit code from "Forgot password" — or from a staff invite
// email, which is the same kind of code — and sets a new password.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [email, setEmail] = useState((location.state as LocationState | null)?.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await apiClient.post('/api/auth/password/reset', { email: email.trim(), code, newPassword });
      showToast('Password updated. Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset your password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-6 relative overflow-hidden animate-scale-in">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Set New Password</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter the code we emailed you and choose a strong new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <Input
          label="New Password"
          type="password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label="Confirm Password"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={error}
        />
        <Button type="submit" disabled={submitting} className="w-full !rounded-xl py-3">
          {submitting ? 'Updating…' : 'Update Password'}
        </Button>
      </form>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        Remembered it after all?{' '}
        <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
