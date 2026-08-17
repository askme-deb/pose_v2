import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delete } from 'lucide-react';
import logo from '../assets/logo.svg';
import { usePosSessionStore } from '../store/usePosSessionStore';
import { apiClient } from '../services/api/client';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'go'];

interface PinLoginResponse {
  token: string;
  user: { name: string };
  store: { name: string } | null;
}

export default function PosLoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const login = usePosSessionStore((s) => s.login);

  const press = async (key: string) => {
    if (submitting) return;
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
        const res = await apiClient.post<PinLoginResponse>('/api/auth/login/pin', { pin });
        login(
          { cashierName: res.user.name, registerName: res.store?.name ?? 'Register 02', shiftLabel: 'Morning Shift' },
          res.token,
        );
        navigate('/pos');
      } catch {
        setError('Invalid PIN');
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
        <img src={logo} alt="ApexPOS Logo" className="h-9 mx-auto" />
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white">Cashier PIN Login</h1>
          <p className="text-xs text-slate-400 mt-1">Enter your 4-digit terminal PIN</p>
        </div>

        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full border-2 ${i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}
            />
          ))}
        </div>

        <p className="text-xs font-semibold text-red-500 h-4">{error ?? (submitting ? 'Checking...' : '')}</p>

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

        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <Delete className="w-3.5 h-3.5" />
          Backspace
        </button>
      </div>
    </div>
  );
}
