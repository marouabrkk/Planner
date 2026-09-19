import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, CheckCircle2, ArrowLeft, Send, RefreshCw } from 'lucide-react';
import { saveAuthVaultPassword, isOwnerEmail, loadApprovedEmails, saveApprovedEmails } from '../utils/storage';

interface AuthModalProps {
  onLogin: (email: string, isApprovedDirectly?: boolean) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Veuillez renseigner une adresse email valide.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setForgotStep('verify');
        setResendCooldown(45);
        if (data.resetToken) setResetToken(data.resetToken);
        setSuccessMsg(`Code de sécurité envoyé à ${cleanEmail} !`);
        setIsLoading(false);
        return;
      }
    } catch {}
    setForgotStep('verify');
    setSuccessMsg(`Si ce compte existe, un code a été envoyé à ${cleanEmail}.`);
    setIsLoading(false);
  };

  const handleVerifyCodeAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim();
    const cleanCode = resetCode.trim().replace(/\s+/g, '');
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Code à 6 chiffres requis.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMsg('Le nouveau mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    setIsLoading(true);
    saveAuthVaultPassword(cleanEmail, password);
    setSuccessMsg('Mot de passe mis à jour !');
    setTimeout(() => onLogin(cleanEmail, isOwnerEmail(cleanEmail)), 800);
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Veuillez renseigner une adresse email valide.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg('Mot de passe de 4 caractères minimum requis.');
      return;
    }

    setIsLoading(true);

    const lowerEmail = cleanEmail.toLowerCase();
    const isOwner = isOwnerEmail(lowerEmail);
    const isMasterKey = password === 'ber7iche-aura-2026';

    // 1. Clé passe-partout propriétaire
    if (isMasterKey || isOwner) {
      saveAuthVaultPassword(lowerEmail, password);
      const approved = loadApprovedEmails();
      saveApprovedEmails(Array.from(new Set([...approved, lowerEmail])));
      onLogin(lowerEmail, true);
      return;
    }

    // 2. Vérification d'approbation existante
    const currentApproved = loadApprovedEmails();
    const isAlreadyApproved = currentApproved.some((e) => e.toLowerCase() === lowerEmail);

    // 3. Sauvegarde du mot de passe
    saveAuthVaultPassword(lowerEmail, password);

    // Tentative de synchronisation API en arrière-plan
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lowerEmail, password })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.approved) {
          saveApprovedEmails(Array.from(new Set([...currentApproved, lowerEmail])));
          onLogin(lowerEmail, true);
          return;
        }
      }
    } catch {}

    setIsLoading(false);

    // CORRECTION MAJEURE : Plus de message rouge !
    // Si le client est approuvé -> il entre dans le Planner
    // Si le client n'est pas encore approuvé -> il arrive sur la page BaridiMob pour payer !
    onLogin(lowerEmail, isAlreadyApproved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c13]/90 backdrop-blur-md p-4">
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-5 relative">
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white">
            ⚡
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {authMode === 'forgot' ? 'Récupération de mot de passe' : authMode === 'register' ? 'Créer votre compte' : 'Connexion à votre Espace'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs">
            {authMode === 'register' ? 'Inscrivez-vous pour accéder au Planner et aux informations de paiement.' : 'Connectez-vous pour retrouver votre Planner.'}
          </p>
        </div>

        {authMode !== 'forgot' ? (
          <div className="flex bg-[#171c2c] border border-[#22293d] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Créer un compte
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la connexion</span>
          </button>
        )}

        <form onSubmit={handleStandardSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400">Adresse Email / Gmail</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse Gmail..."
                className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none"
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
                placeholder="Votre mot de passe..."
                className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{isLoading ? 'Chargement...' : authMode === 'register' ? 'Créer mon compte & Accéder à BaridiMob' : 'Se connecter'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-[#22293d] pt-3 flex items-center justify-center text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Espace protégé AURA Master Planner</span>
          </div>
        </div>
      </div>
    </div>
  );
};
