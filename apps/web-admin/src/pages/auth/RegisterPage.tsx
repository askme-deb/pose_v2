import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button, Input, useToast } from '@pospe/ui-library';
import logo from '../../assets/logo.svg';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/api/client';
import type { Role } from '@pospe/permissions';

interface RegisterResponse {
  token: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: Role; tenantId: string; tenantName: string };
}

// Registration hits the same catch-all API error shape every other page in
// this app uses (ApiClient throws `API error ${status}: ${rawBody}`) — the
// raw body is the zod-flattened validation error or a plain `{error}`
// message from the backend, so surface it as-is rather than re-deriving it.
function extractApiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Could not create your account. Please try again.';
  const match = err.message.match(/API error \d+: (.+)/s);
  if (!match) return err.message;
  try {
    const body = JSON.parse(match[1]);
    if (typeof body.error === 'string') return body.error;
    if (body.error?.fieldErrors) {
      const firstField = Object.values(body.error.fieldErrors).find((v) => Array.isArray(v) && v.length) as
        | string[]
        | undefined;
      if (firstField) return firstField[0];
    }
  } catch {
    // fall through to raw message
  }
  return 'Could not create your account. Please try again.';
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const login = useAuthStore((s) => s.login);

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<RegisterResponse>('/api/auth/register', {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        email: workEmail.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      login({ name: res.user.name, email: res.user.email, role: res.user.role }, res.token);
      showToast(`Welcome to ApexPOS, ${res.user.name}! Your workspace "${res.user.tenantName}" is ready.`, 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-6 relative overflow-hidden animate-scale-in">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

      <div className="text-center space-y-2">
        <img src={logo} alt="ApexPOS" className="h-10 mx-auto" />
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Start 14-Day Free Trial
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">No credit card required. Instant POS setup.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Business Name"
          required
          placeholder="e.g. Apex Supermarket"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <Input
          label="Your Full Name"
          required
          placeholder="e.g. Aarav Sharma"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
        />
        <Input
          label="Work Email"
          type="email"
          required
          placeholder="you@business.com"
          value={workEmail}
          onChange={(e) => setWorkEmail(e.target.value)}
        />
        <Input
          label="Phone (optional)"
          placeholder="+91 98201 99887"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-[30px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" disabled={submitting} className="w-full !rounded-xl py-3 gap-2 disabled:opacity-60">
          <Sparkles className="w-4 h-4" />
          {submitting ? 'Setting up your workspace…' : 'Launch My POS Workspace →'}
        </Button>
      </form>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
