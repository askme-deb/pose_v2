import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, Eye, EyeOff, ShieldCheck, ShieldAlert, Globe, Building, Delete, AlertCircle } from 'lucide-react';
import { Button, Checkbox } from '@pospe/ui-library';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/api/client';
import type { Role } from '@pospe/permissions';

type LoginRole = 'tenant' | 'cashier' | 'superadmin';

const POS_URL = (import.meta.env.VITE_POS_URL as string | undefined) ?? 'http://localhost:5174';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [role, setRole] = useState<LoginRole>('tenant');

  // Tenant Admin form state
  const [email, setEmail] = useState('aarav.sharma@apexsupermarket.com');
  const [password, setPassword] = useState('Demo@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Cashier PIN state
  const [pin, setPin] = useState('');

  // Super Admin form state
  const [masterAdminId, setMasterAdminId] = useState('superadmin@apexpos.com');
  const [otpCode, setOtpCode] = useState('892-041');

  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post<{ token: string; user: { name: string; email: string; role: Role } }>(
        '/api/auth/login',
        { email, password },
      );
      login({ name: res.user.name, email: res.user.email, role: res.user.role }, res.token);
      navigate('/dashboard');
    } catch {
      setLoginError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuperAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ name: 'Priya Menon', email: 'superadmin@apexpos.com', role: 'super_admin' });
    navigate('/superadmin');
  };

  const handleSso = () => {
    login({ name: 'Alexander Wright', email, role: 'tenant_owner' });
    navigate('/dashboard');
  };

  const appendPin = (digit: string) => {
    if (pin.length < 4) setPin((p) => p + digit);
  };

  const clearPin = () => setPin('');

  const submitCashierPin = () => {
    if (pin.length === 4) {
      window.location.href = `${POS_URL}/login`;
    }
  };

  return (
    <div className="w-full max-w-md glass-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-6 relative overflow-hidden animate-scale-in">
      {/* Top Decorative Glow Accent Line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

      {/* Card Title & Subtitle */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">SaaS Control Portal</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Select your access role to sign in to workspace</p>
      </div>

      {/* Multi-Role Login Tab Switcher */}
      <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setRole('tenant')}
          className={`flex-1 py-2 rounded-xl font-bold transition ${
            role === 'tenant'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Tenant Admin
        </button>
        <button
          type="button"
          onClick={() => setRole('cashier')}
          className={`flex-1 py-2 rounded-xl font-bold transition ${
            role === 'cashier'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Cashier PIN
        </button>
        <button
          type="button"
          onClick={() => setRole('superadmin')}
          className={`flex-1 py-2 rounded-xl font-bold transition ${
            role === 'superadmin'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Super Admin
        </button>
      </div>

      {/* ROLE 1: Tenant Admin Login Form */}
      {role === 'tenant' && (
        <form onSubmit={handleTenantSubmit} className="space-y-4 animate-fade-in">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Business Email / Username
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Account Password</label>
              <Link to="/forgot-password" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Checkbox
              label="Remember this device"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              2FA Active
            </span>
          </div>

          {loginError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {loginError}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full !rounded-xl py-3 disabled:opacity-60">
            {submitting ? 'Signing in...' : 'Sign In to Workspace'}
          </Button>

          {/* Social SSO Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
            <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
              Or continue with
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSso}
                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <Globe className="w-4 h-4 text-red-500" />
                <span>Google Workspace</span>
              </button>
              <button
                type="button"
                onClick={handleSso}
                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <Building className="w-4 h-4 text-blue-500" />
                <span>Microsoft SSO</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ROLE 2: Cashier Quick PIN Pad Form */}
      {role === 'cashier' && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Counter #04 (POS Express) - Enter Cashier PIN
            </p>
            <div className="flex justify-center gap-3 my-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border transition ${
                    i < pin.length
                      ? 'bg-blue-600 border-blue-400 shadow-md shadow-blue-500/50'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendPin(digit)}
                className="py-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-extrabold text-slate-800 dark:text-white hover:bg-blue-600 hover:text-white transition"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={clearPin}
              className="py-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => appendPin('0')}
              className="py-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-extrabold text-slate-800 dark:text-white hover:bg-blue-600 hover:text-white transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={submitCashierPin}
              disabled={pin.length !== 4}
              className="py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              GO
            </button>
          </div>
        </div>
      )}

      {/* ROLE 3: Super Admin Portal Form */}
      {role === 'superadmin' && (
        <form onSubmit={handleSuperAdminSubmit} className="space-y-4 animate-fade-in">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Global Platform Management Portal</span>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Master Admin ID
            </label>
            <input
              type="text"
              value={masterAdminId}
              onChange={(e) => setMasterAdminId(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Hardware Security Key / OTP Code
            </label>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono text-center tracking-widest outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25"
          >
            Authenticate Super Admin Session
          </button>
        </form>
      )}

      {/* Bottom Card Link */}
      <div className="text-center pt-2 text-xs text-slate-500 dark:text-slate-400">
        Don&apos;t have an enterprise account?{' '}
        <Link to="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
          Start 14-Day Free Trial →
        </Link>
      </div>
    </div>
  );
}
