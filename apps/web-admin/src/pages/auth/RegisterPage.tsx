import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button, Input, useToast } from '@pospe/ui-library';
import logo from '../../assets/logo.svg';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [businessName, setBusinessName] = useState('Apex Supermarket');
  const [workEmail, setWorkEmail] = useState('owner@apexsupermarket.com');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Trial account created — check your email to verify.', 'success');
    navigate('/login');
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
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <Input
          label="Work Email"
          type="email"
          required
          value={workEmail}
          onChange={(e) => setWorkEmail(e.target.value)}
        />
        <Button type="submit" className="w-full !rounded-xl py-3 gap-2">
          <Sparkles className="w-4 h-4" />
          Launch My POS Workspace →
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
