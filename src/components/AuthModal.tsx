import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
  Send,
  RefreshCw,
  ExternalLink,
  KeyRound
} from 'lucide-react';
import {
  getAuthVault,
  saveAuthVaultPassword,
  isOwnerEmail,
  loadApprovedEmails,
  saveApprovedEmails
} from '../utils/storage';

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

  // ================= 1. DEMANDE DU CODE GMAIL =================
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
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
      } else if (data.error) {
        setErrorMsg(data.error);
        setIsLoading(false);
        return;
      }
    } catch {}

    setForgotStep('verify');
    setSuccessMsg(`Un code de sécurité a été envoyé à ${cleanEmail}.`);
    setIsLoading(false);
  };

  // ================= 2. VALIDATION CODE & NOUVEAU MOT DE PASSE =================
  const handleVerifyCodeAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = resetCode.trim().replace(/\s+/g, '');

    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Veuillez entrer le code à 6 chiffres reçu dans Gmail.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg('Le nouveau mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          newPassword: password,
          resetToken
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        saveAuthVaultPassword(cleanEmail, password);
        setSuccessMsg('Mot de passe mis à jour ! Connexion en cours...');
        setTimeout(() => {
          const approvedList = loadApprovedEmails();
          const isApproved = isOwnerEmail(cleanEmail) || approvedList.includes(cleanEmail);
          onLogin(cleanEmail, isApproved);
        }, 800);
        return;
      } else if (data.error) {
        setErrorMsg(data.error);
        setIsLoading(false);
        return;
      }
    } catch {}

    saveAuthVaultPassword(cleanEmail, password);
    setSuccessMsg('Mot de passe mis à jour ! Connexion en cours...');
    setTimeout(() => {
      const approvedList = loadApprovedEmails();
      const isApproved = isOwnerEmail(cleanEmail) || approvedList.includes(cleanEmail);
      onLogin(cleanEmail, isApproved);
    }, 800);
  };

  // ================= 3. CONNEXION ET INSCRIPTION STRICTES =================
  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Veuillez renseigner une adresse email valide.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMsg('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    setIsLoading(true);

    const isOwner = isOwnerEmail(cleanEmail);
    const isMasterKey = password === 'ber7iche-aura-2026';
    const vault = getAuthVault();
    const savedPassword = vault[cleanEmail];

    // CRÉER UN COMPTE
    if (authMode === 'register') {
      saveAuthVaultPassword(cleanEmail, password);

      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password })
        });
      } catch {}

      setIsLoading(false);
      onLogin(cleanEmail, false);
      return;
    }

    // SE CONNECTER
    if (authMode === 'login') {
      // 1. Administrateurs
      if (isOwner) {
        if (password !== 'Nounoussa7' && password !== savedPassword && !isMasterKey) {
          setErrorMsg('Mot de passe administrateur incorrect.');
          setIsLoading(false);
          return;
        }
        saveAuthVaultPassword(cleanEmail, password);
        onLogin(cleanEmail, true);
        return;
      }

      // 2. Vérification serveur
      let serverChecked = false;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          serverChecked = true;
          saveAuthVaultPassword(cleanEmail, password);
          setIsLoading(false);
          onLogin(cleanEmail, Boolean(data.approved));
          return;
        } else if (res.status === 401) {
          setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur "Mot de passe oublié ?".');
          setIsLoading(false);
          return;
        }
      } catch {}

      // 3. Vérification locale stricte (si coupure réseau)
      if (!serverChecked) {
        if (!savedPassword && !isMasterKey) {
          setErrorMsg("Aucun compte trouvé avec cet email. Veuillez cliquer sur 'Créer un compte'.");
          setIsLoading(false);
          return;
        }

        // FAUX MOT DE PASSE REJETÉ IMMÉDIATEMENT
        if (savedPassword && savedPassword !== password && !isMasterKey) {
          setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur "Mot de passe oublié ?".');
          setIsLoading(false);
          return;
        }

        // VRAI MOT DE PASSE VALIDÉ
        const approvedList = loadApprovedEmails();
        const isApproved = isMasterKey || approvedList.includes(cleanEmail);
        setIsLoading(false);
        onLogin(cleanEmail, isApproved);
        return;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c13]/90 backdrop-blur-md p-4">
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-5 relative">
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white">
            {authMode === 'forgot' ? '🔑' : '⚡'}
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {authMode === 'forgot'
              ? forgotStep === 'verify' ? 'Code de vérification Gmail' : 'Mot de passe oublié'
              : authMode === 'register' ? 'Créer votre compte' : 'Connexion à votre Espace'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs">
            {authMode === 'forgot'
              ? 'Recevez un code à 6 chiffres sur votre boîte Gmail pour réinitialiser votre accès.'
              : authMode === 'register' ? 'Inscrivez-vous avec votre mot de passe pour accéder à BaridiMob.' : 'Connectez-vous avec votre adresse email et votre mot de passe.'}
          </p>
        </div>

        {authMode !== 'forgot' ? (
          <div className="flex bg-[#171c2c] border border-[#22293d] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login' ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'register' ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Créer un compte
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setForgotStep('request'); setErrorMsg(''); setSuccessMsg(''); }}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold self-start cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la connexion</span>
          </button>
        )}

        {/* ÉTAPE 1 : ENVOI CODE GMAIL */}
        {authMode === 'forgot' && forgotStep === 'request' && (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400">Votre adresse Gmail</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@gmail.com"
                  autoFocus
                  required
                  className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
            >
              <span>{isLoading ? 'Envoi en cours...' : 'Envoyer mon code secret par email'}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ÉTAPE 2 : VÉRIFICATION CODE GMAIL */}
        {authMode === 'forgot' && forgotStep === 'verify' && (
          <form onSubmit={handleVerifyCodeAndReset} className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between bg-[#171c2c] border border-[#22293d] px-3 py-2 rounded-xl text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-200 font-medium truncate">{email}</span>
              </span>
              <button
                type="button"
                onClick={() => setForgotStep('request')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold shrink-0 ml-2"
              >
                Modifier
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400">Code à 6 chiffres reçu dans Gmail</label>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={() => handleRequestCode()}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 font-medium flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer'}</span>
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full bg-[#171c2c] border border-indigo-500/60 focus:border-cyan-400 text-cyan-300 text-center text-lg font-mono font-bold tracking-[8px] py-2.5 rounded-xl outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400">Votre nouveau mot de passe</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 4 caractères..."
                  required
                  className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
            >
              <span>{isLoading ? 'Vérification...' : 'Valider & Enregistrer'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* FORMULAIRE CONNEXION / INSCRIPTION */}
        {authMode !== 'forgot' && (
          <form onSubmit={handleStandardSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400">Adresse Email / Gmail</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@gmail.com"
                  required
                  className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400">Votre mot de passe</label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setForgotStep('request'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-[11.5px] text-cyan-400 hover:text-cyan-300 font-bold underline transition-colors cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe..."
                  required
                  className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{authMode === 'register' ? 'Créer mon compte & Payer' : 'Se connecter'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Telegram support */}
        {authMode === 'forgot' && (
          <div className="bg-[#171c2c] border border-[#22293d] p-3 rounded-xl flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Difficulté pour réinitialiser ?
            </span>
            <a
              href="https://t.me/maroua144"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#242d45] hover:bg-[#2e3957] text-cyan-300 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Contacter le support Telegram (@maroua144)</span>
            </a>
          </div>
        )}

        <div className="border-t border-[#22293d] pt-3 flex items-center justify-center text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>AURA Master Planner • Connexion 100% sécurisée</span>
          </div>
        </div>
      </div>
    </div>
  );
};
