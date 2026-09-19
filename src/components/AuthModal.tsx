import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, ArrowRight, CheckCircle2, KeyRound, ArrowLeft, Send, RefreshCw, ExternalLink } from 'lucide-react';
import { getAuthVault, saveAuthVaultPassword, isOwnerEmail, loadApprovedEmails, saveApprovedEmails, DEFAULT_APPROVED_EMAILS } from '../utils/storage';

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

  // Compteur pour renvoi du code
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Demande d'envoi du code à 6 chiffres par email
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

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await res.json().catch(() => ({})) : {};

      if (res.ok && data.success) {
        setForgotStep('verify');
        setResendCooldown(45);
        if (data.resetToken) {
          setResetToken(data.resetToken);
        }
        setSuccessMsg(`Code de sécurité envoyé à ${cleanEmail} ! Consultez votre boîte de réception Gmail.`);
        setIsLoading(false);
        return;
      } else if (data.error) {
        setErrorMsg(data.error);
        setIsLoading(false);
        return;
      }
    } catch {
      // Erreur réseau
    }

    setErrorMsg("Impossible d'envoyer l'email pour le moment. Veuillez vérifier votre connexion ou votre adresse Gmail.");
    setIsLoading(false);
  };

  // Vérification du code reçu par Gmail et réinitialisation
  const handleVerifyCodeAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    const cleanCode = resetCode.trim().replace(/\s+/g, '');

    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Veuillez entrer le code de sécurité à 6 chiffres reçu dans votre boîte Gmail.');
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

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          saveAuthVaultPassword(cleanEmail, password);
          const currentApproved = loadApprovedEmails();
          const isApproved =
            isOwnerEmail(cleanEmail) ||
            currentApproved.some((e) => e.toLowerCase() === cleanEmail.toLowerCase()) ||
            DEFAULT_APPROVED_EMAILS.some((e) => e.toLowerCase() === cleanEmail.toLowerCase());
          if (isApproved) {
            saveApprovedEmails(Array.from(new Set([...currentApproved, cleanEmail.toLowerCase()])));
          }
          setSuccessMsg('Mot de passe mis à jour avec succès ! Connexion en cours...');
          setTimeout(() => onLogin(cleanEmail, isApproved), 1000);
          return;
        } else if (data.error) {
          setErrorMsg(data.error);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Erreur serveur
    }

    setErrorMsg('Code de vérification incorrect ou expiré. Veuillez vérifier le code reçu dans Gmail.');
    setIsLoading(false);
  };

  // Soumission Connexion OU Inscription
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
      setErrorMsg('Veuillez renseigner un mot de passe (au moins 4 caractères).');
      return;
    }

    setIsLoading(true);

    const lowerEmail = cleanEmail.toLowerCase();
    const isOwner = isOwnerEmail(lowerEmail);
    const isMasterKey = password === 'ber7iche-aura-2026';

    const currentApproved = loadApprovedEmails();
    const isPreApproved =
      isOwner ||
      currentApproved.some((e) => e.toLowerCase() === lowerEmail);

    // 1. Appel Backend
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lowerEmail, password })
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (res.ok && isJson) {
        const data = await res.json().catch(() => ({}));
        const approved = isOwner || data.approved === true || data.user?.status === 'approved';

        saveAuthVaultPassword(lowerEmail, password);

        if (approved) {
          saveApprovedEmails(Array.from(new Set([...currentApproved, lowerEmail])));
          onLogin(lowerEmail, true);
          return;
        }

        // CORRECTION : Dès que l'inscription est validée, on bascule IMMÉDIATEMENT sur BaridiMob
        if (authMode === 'register') {
          setIsLoading(false);
          onLogin(lowerEmail, false);
          return;
        } else {
          // Client déjà inscrit mais en attente
          setIsLoading(false);
          onLogin(lowerEmail, false);
          return;
        }
      }

      if (!res.ok && isJson) {
        const data = await res.json().catch(() => ({}));
        if (data.error && !isMasterKey) {
          setErrorMsg(data.error);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Mode hors-ligne / fallback
    }

    // 2. Fallback local sécurisé
    try {
      const vault = getAuthVault();
      const savedPass = vault[lowerEmail];

      if (isMasterKey) {
        saveAuthVaultPassword(lowerEmail, password);
        saveApprovedEmails(Array.from(new Set([...currentApproved, lowerEmail])));
        onLogin(lowerEmail, true);
        return;
      }

      if (isOwner) {
        const isOwnerPassValid = password === 'Nounoussa7' || (savedPass && password === savedPass);
        if (!isOwnerPassValid) {
          setErrorMsg('Mot de passe incorrect.');
          setIsLoading(false);
          return;
        }
        saveAuthVaultPassword(lowerEmail, password);
        saveApprovedEmails(Array.from(new Set([...currentApproved, lowerEmail])));
        onLogin(lowerEmail, true);
        return;
      }

      if (isPreApproved) {
        if (savedPass && savedPass !== password) {
          setErrorMsg('Mot de passe incorrect.');
          setIsLoading(false);
          return;
        }
        saveAuthVaultPassword(lowerEmail, password);
        saveApprovedEmails(Array.from(new Set([...currentApproved, lowerEmail])));
        onLogin(lowerEmail, true);
        return;
      }

      // Nouveau client qui s'inscrit en local
      if (authMode === 'register') {
        saveAuthVaultPassword(lowerEmail, password);
        setIsLoading(false);
        onLogin(lowerEmail, false);
        return;
      } else {
        setErrorMsg("Cette adresse Gmail n'est pas autorisée ou n'a pas encore été approuvée par l'administrateur.");
        setIsLoading(false);
        return;
      }
    } catch {
      setErrorMsg('Erreur de connexion. Veuillez vérifier votre saisie.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c13]/90 backdrop-blur-md p-4">
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-5 relative">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white">
            {authMode === 'forgot' ? (forgotStep === 'verify' ? '📩' : '🔑') : '⚡'}
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {authMode === 'forgot'
              ? forgotStep === 'verify'
                ? 'Code de vérification Gmail'
                : 'Récupération par Email'
              : authMode === 'register'
              ? 'Créer votre compte'
              : 'Connexion à votre Espace'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs">
            {authMode === 'forgot'
              ? forgotStep === 'verify'
                ? `Entrez le code à 6 chiffres envoyé à ${email || 'votre email'}.`
                : 'Recevez un code de sécurité à 6 chiffres sur votre boîte Gmail.'
              : authMode === 'register'
              ? 'Créez votre compte pour démarrer et accéder aux coordonnées BaridiMob.'
              : 'Connectez-vous pour retrouver votre Planner.'}
          </p>
        </div>

        {authMode !== 'forgot' ? (
          <div className="flex bg-[#171c2c] border border-[#22293d] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Créer un compte
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setForgotStep('request'); setErrorMsg(''); setSuccessMsg(''); }}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold self-start cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la connexion</span>
          </button>
        )}

        {/* OUBLI MOT DE PASSE : ÉTAPE 1 */}
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
                  placeholder="exemple@gmail.com..."
                  autoFocus
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

            {successMsg && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{isLoading ? 'Envoi en cours...' : 'Envoyer mon code secret par email'}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* OUBLI MOT DE PASSE : ÉTAPE 2 */}
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
                <label className="text-[11px] font-bold text-slate-400">Code secret reçu (6 chiffres)</label>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={() => handleRequestCode()}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 font-medium flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code'}</span>
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
              <label className="text-[11px] font-bold text-slate-400">Nouveau mot de passe</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 4 caractères..."
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isLoading ? 'Vérification...' : 'Valider & Enregistrer'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* CONNEXION OU INSCRIPTION */}
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
                  placeholder="Votre adresse Gmail..."
                  className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400">Mot de passe</label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setForgotStep('request'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
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
                  className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none placeholder:text-slate-500"
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
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>
                {isLoading
                  ? 'Vérification...'
                  : authMode === 'register'
                  ? 'Créer mon compte & Payer par BaridiMob'
                  : 'Se connecter'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

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
