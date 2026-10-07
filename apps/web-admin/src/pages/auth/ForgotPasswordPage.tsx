import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { Button, Input, useToast } from '@pospe/ui-library';
import { apiClient } from '../../services/api/client';
import { apiErrorMessage } from './session';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // The server answers the same way whether or not the email exists.
      await apiClient.post('/api/auth/password/forgot', { email: email.trim() });
      showToast('If that email has an account, a reset code is on its way.', 'success');
      navigate('/reset-password', { state: { email: email.trim() } });
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not send a reset code. Try again.'), 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-6 relative overflow-hidden animate-scale-in">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Reset Account Password
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your business email and we&apos;ll send you a 6-digit reset code.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Registered Business Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={submitting} className="w-full !rounded-xl py-3">
          {submitting ? 'Sending…' : 'Send Reset Code'}
        </Button>
      </form>

      <div className="text-center space-y-2">
        <Link to="/reset-password" state={{ email }} className="block text-xs text-slate-500 dark:text-slate-400 hover:underline">
          Already have a code?
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}
