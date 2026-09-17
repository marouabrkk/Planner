import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  onLogin: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Veuillez renseigner une adresse email valide.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erreur lors de la connexion.');
        setIsLoading(false);
        return;
      }

      onLogin(cleanEmail);
    } catch {
      // Fallback to client-side auth if offline
      onLogin(cleanEmail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c13]/90 backdrop-blur-md p-4">
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-5 relative">
        {/* Decorative ambient glow */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Icon & Heading */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white">
            ⚡
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {authMode === 'register' ? 'Créer votre compte' : 'Connexion à votre Espace'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs">
            {authMode === 'register'
              ? 'Créez votre compte pour enregistrer vos données en toute sécurité.'
              : 'Connectez-vous pour retrouver vos tâches, cours et habitudes.'}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex bg-[#171c2c] border border-[#22293d] rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              authMode === 'login'
                ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              authMode === 'register'
                ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Créer un compte
          </button>
        </div>

        {/* Inputs Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400">Adresse Email</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse Gmail ou Email..."
                className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400">Mot de passe</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 6 caractères..."
                className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>{isLoading ? 'Vérification...' : authMode === 'register' ? 'Créer mon compte' : 'Se connecter'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-[#22293d] pt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Espace protégé AURA Master Planner</span>
        </div>
      </div>
    </div>
  );
};
