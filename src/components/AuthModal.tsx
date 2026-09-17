import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, ArrowRight, CheckCircle2, KeyRound, ArrowLeft, Send, RefreshCw, Sparkles, ExternalLink, Copy, Check } from 'lucide-react';
import { getAuthVault, saveAuthVaultPassword, isOwnerEmail } from '../utils/storage';

interface AuthModalProps {
  onLogin: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [isEmailDelivered, setIsEmailDelivered] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Timer cooldown for resend button
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Request 6-digit code by email
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
    let serverDelivered = false;
    let serverCode: string | null = null;
    let serverHandled = false;

    try {
      const res = await fetch('/api/auth/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          serverHandled = true;
          serverDelivered = Boolean(data.delivered);
          serverCode = data.previewCode || null;
        }
      }
    } catch {
      // Backend not available (Vercel static / offline)
    }

    if (serverHandled && serverDelivered) {
      setForgotStep('verify');
      setResendCooldown(30);
      setIsEmailDelivered(true);
      setPreviewCode(null);
      setSuccessMsg(`Code secret envoyé avec succès dans votre boîte Gmail (${cleanEmail}) !`);
      setIsLoading(false);
      return;
    }

    // Static / Offline fallback: generate code directly so user is never blocked on Vercel
    const demoCode = serverCode || Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const raw = localStorage.getItem('aura_reset_codes') || '{}';
      const store = JSON.parse(raw);
      store[cleanEmail.toLowerCase()] = demoCode;
      localStorage.setItem('aura_reset_codes', JSON.stringify(store));
    } catch {
      // ignore
    }

    setForgotStep('verify');
    setResendCooldown(30);
    setIsEmailDelivered(false);
    setPreviewCode(demoCode);
    setSuccessMsg(`Code de sécurité généré pour ${cleanEmail} !`);
    setIsLoading(false);
  };

  // Verify 6-digit code and save new password
  const handleVerifyCodeAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    const cleanCode = resetCode.trim().replace(/\s+/g, '');

    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Veuillez entrer le code de sécurité à 6 chiffres.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg('Le nouveau mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    setIsLoading(true);
    let serverUpdated = false;

    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          newPassword: password
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          serverUpdated = true;
        }
      }
    } catch {
      // server unreachable
    }

    // Check local store if server didn't handle it
    let localValid = false;
    try {
      const raw = localStorage.getItem('aura_reset_codes') || '{}';
      const store = JSON.parse(raw);
      if (store[cleanEmail.toLowerCase()] === cleanCode) {
        localValid = true;
        delete store[cleanEmail.toLowerCase()];
        localStorage.setItem('aura_reset_codes', JSON.stringify(store));
      }
    } catch {
      // ignore
    }

    if (serverUpdated || localValid) {
      saveAuthVaultPassword(cleanEmail, password);
      setSuccessMsg('Mot de passe mis à jour avec succès ! Connexion en cours...');
      setTimeout(() => onLogin(cleanEmail), 1000);
      return;
    }

    setErrorMsg('Code de vérification incorrect ou expiré. Veuillez vérifier les 6 chiffres.');
    setIsLoading(false);
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
      setErrorMsg('Veuillez renseigner un mot de passe (au moins 4 caractères).');
      return;
    }

    setIsLoading(true);

    const lowerEmail = cleanEmail.toLowerCase();
    const isOwner = isOwnerEmail(lowerEmail);
    const isMasterKey = password === 'ber7iche-aura-2026';

    // 1. First attempt server verification
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
        if (data.user || data.token || data.message || data.success) {
          saveAuthVaultPassword(lowerEmail, password);
          onLogin(lowerEmail);
          return;
        }
      }

      // If server returned a recognized JSON error (wrong password, account not found, etc.)
      if (!res.ok && isJson && res.status !== 404 && res.status !== 405) {
        const data = await res.json().catch(() => ({}));
        if (data.error && !isMasterKey) {
          setErrorMsg(data.error);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Server unreachable (Vercel static / offline)
    }

    // 2. Strict Vault / Local fallback verification
    try {
      const vault = getAuthVault();
      const savedPass = vault[lowerEmail];

      if (authMode === 'login') {
        // Master key bypass for site administrator
        if (isMasterKey) {
          saveAuthVaultPassword(lowerEmail, password);
          onLogin(lowerEmail);
          return;
        }

        // Verify owner accounts with their exact authorized passwords
        if (lowerEmail === 'ber7iche@gmail.com' || lowerEmail === 'maroua144@gmail.com') {
          const isOwnerPassValid = password === 'Nounoussa7' || (savedPass && password === savedPass);
          if (!isOwnerPassValid) {
            setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre mot de passe ou cliquer sur "Mot de passe oublié ?".');
            setIsLoading(false);
            return;
          }
          saveAuthVaultPassword(lowerEmail, password);
          onLogin(lowerEmail);
          return;
        }

        if (lowerEmail === 'marouaberkiche77@gmail.com') {
          const isOwnerPassValid = password === 'maroua2026' || password === 'Nounoussa7' || (savedPass && password === savedPass);
          if (!isOwnerPassValid) {
            setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre mot de passe ou cliquer sur "Mot de passe oublié ?".');
            setIsLoading(false);
            return;
          }
          saveAuthVaultPassword(lowerEmail, password);
          onLogin(lowerEmail);
          return;
        }

        // For all other client accounts:
        if (!savedPass) {
          setErrorMsg("Aucun compte trouvé avec cet email. Veuillez d'abord cliquer sur 'Créer votre compte'.");
          setIsLoading(false);
          return;
        }

        if (savedPass !== password) {
          setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre mot de passe ou cliquer sur "Mot de passe oublié ?".');
          setIsLoading(false);
          return;
        }

        saveAuthVaultPassword(lowerEmail, password);
        onLogin(lowerEmail);
      } else {
        // Register mode: check if already exists with another password
        if (savedPass && savedPass !== password && !isMasterKey) {
          setErrorMsg('Un compte existe déjà avec cette adresse email. Veuillez vous connecter avec votre mot de passe.');
          setIsLoading(false);
          return;
        }
        saveAuthVaultPassword(lowerEmail, password);
        onLogin(lowerEmail);
      }
    } catch {
      setErrorMsg('Erreur de connexion. Veuillez vérifier votre saisie.');
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
                ? `Entrez le code à 6 chiffres envoyé à ${email || 'votre email'} ainsi que votre nouveau mot de passe.`
                : 'Recevez un code de sécurité à 6 chiffres sur votre boîte de réception Gmail.'
              : authMode === 'register'
              ? 'Créez votre compte pour enregistrer vos données en toute sécurité.'
              : 'Connectez-vous pour retrouver vos tâches, cours et habitudes.'}
          </p>
        </div>

        {/* Auth Mode Tabs (hide if in forgot mode) */}
        {authMode !== 'forgot' ? (
          <div className="flex bg-[#171c2c] border border-[#22293d] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
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
              onClick={() => {
                setAuthMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
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
            onClick={() => {
              setAuthMode('login');
              setForgotStep('request');
              setErrorMsg('');
              setSuccessMsg('');
              setPreviewCode(null);
            }}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold self-start cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la connexion</span>
          </button>
        )}

        {/* ======================================================== */}
        {/* CASE 1: FORGOT PASSWORD - STEP 1 (DEMANDE DU CODE EMAIL) */}
        {/* ======================================================== */}
        {authMode === 'forgot' && forgotStep === 'request' && (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400">Votre adresse Gmail ou Email</label>
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
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{isLoading ? 'Envoi en cours...' : 'Envoyer mon code secret par email'}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* CASE 2: FORGOT PASSWORD - STEP 2 (CODE & NOUVEAU MOT DE PASSE) */}
        {/* ======================================================== */}
        {authMode === 'forgot' && forgotStep === 'verify' && (
          <form onSubmit={handleVerifyCodeAndReset} className="flex flex-col gap-3.5">
            {/* Target email badge */}
            <div className="flex items-center justify-between bg-[#171c2c] border border-[#22293d] px-3 py-2 rounded-xl text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-200 font-medium truncate">{email}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setForgotStep('request');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold shrink-0 ml-2 cursor-pointer"
              >
                Modifier
              </button>
            </div>

            {/* Direct Gmail shortcut button */}
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500/15 via-indigo-500/15 to-cyan-500/15 hover:from-red-500/25 hover:to-cyan-500/25 border border-cyan-500/30 text-cyan-300 py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Mail className="w-4 h-4 text-red-400 shrink-0" />
              <span>Ouvrir Gmail (Boîte de réception)</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-cyan-400 shrink-0" />
            </a>

            {/* Preview code helper (visible when external SMTP is not yet configured) */}
            {previewCode && (
              <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl flex flex-col gap-2 text-xs text-amber-200">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Code direct (secours immédiat) :</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black tracking-wider text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-500/40 text-sm">
                      {previewCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => setResetCode(previewCode)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-0.5 rounded text-[11px] cursor-pointer transition-colors shadow-sm"
                      title="Insérer automatiquement ce code"
                    >
                      Insérer
                    </button>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-relaxed border-t border-amber-500/20 pt-1.5">
                  ℹ️ L'envoi automatique par Gmail nécessite la configuration de votre mot de passe d'application Google dans l'espace admin. Ce code s'affiche donc ici pour vous débloquer immédiatement sans attendre !
                </p>
              </div>
            )}

            {/* 6-Digit Code Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400">Code secret reçu (6 chiffres)</label>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={() => handleRequestCode()}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 font-medium flex items-center gap-1 cursor-pointer transition-colors"
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
                className="w-full bg-[#171c2c] border border-indigo-500/60 focus:border-cyan-400 text-cyan-300 text-center text-lg font-mono font-bold tracking-[8px] py-2.5 rounded-xl outline-none transition-all placeholder:text-slate-600 placeholder:tracking-normal"
              />
            </div>

            {/* New Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-400">Nouveau mot de passe</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre nouveau mot de passe (min. 4 car.)..."
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
              className="w-full mt-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{isLoading ? 'Vérification...' : 'Valider le code & Enregistrer'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* CASE 3: STANDARD LOGIN OR REGISTER                       */}
        {/* ======================================================== */}
        {authMode !== 'forgot' && (
          <form onSubmit={handleStandardSubmit} className="flex flex-col gap-3">
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
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400">Mot de passe</label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setForgotStep('request');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
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
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>
                {isLoading
                  ? 'Vérification...'
                  : authMode === 'register'
                  ? 'Créer mon compte'
                  : 'Se connecter'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Telegram Direct Support Helper */}
        {authMode === 'forgot' && (
          <div className="bg-[#171c2c] border border-[#22293d] p-3 rounded-xl flex flex-col gap-2">
            <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Une difficulté pour vous reconnecter ?
            </span>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Vous pouvez contacter directement la propriétaire sur Telegram pour réinitialiser votre accès en 1 minute.
            </p>
            <a
              href={`https://t.me/maroua144?text=${encodeURIComponent(
                `Bonjour, j'ai oublié mon mot de passe pour mon compte AURA Planner (${email || 'mon email'}). Pouvez-vous m'aider ?`
              )}`}
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
            <span>Espace protégé AURA Master Planner</span>
          </div>
        </div>
      </div>
    </div>
  );
};

