import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, ArrowRight, CheckCircle2, KeyRound, ArrowLeft, Send, RefreshCw, Sparkles, ExternalLink, Copy, Check } from 'lucide-react';
import { getAuthVault, saveAuthVaultPassword, isOwnerEmail, loadApprovedEmails, saveApprovedEmails, DEFAULT_APPROVED_EMAILS, savePendingRegistration } from '../utils/storage';

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

  // Détection automatique d'un email pré-rempli ou lien d'activation
  React.useEffect(() => {
    try {
      const urlStr = window.location.href;
      if (urlStr.includes('activate') || urlStr.includes('email=') || urlStr.includes('token=AURA-2026')) {
        const match = urlStr.match(/email=([^&?#]+)/);
        if (match && match[1]) {
          const extractedEmail = decodeURIComponent(match[1]).trim().toLowerCase();
          if (extractedEmail.includes('@')) {
            setEmail(extractedEmail);
            setSuccessMsg('🎉 Votre compte a été validé ! Entrez votre mot de passe pour ouvrir votre Planner.');
            setAuthMode('login');
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Request 6-digit code strictly sent by email to Gmail
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
        setIsEmailDelivered(true);
        if (data.resetToken) {
          setResetToken(data.resetToken);
        }
        setSuccessMsg(`Code de sécurité envoyé à ${cleanEmail} ! Consultez votre boîte de réception Gmail (et vérifiez vos spams).`);
        setIsLoading(false);
        return;
      } else if (data.error) {
        setErrorMsg(data.error);
        setIsLoading(false);
        return;
      }
    } catch {
      // Backend error
    }

    setErrorMsg("Impossible d'envoyer l'email pour le moment. Veuillez vérifier votre connexion ou votre adresse Gmail.");
    setIsLoading(false);
  };

  // Verify 6-digit code received in Gmail and save new password
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
            currentApproved.some(e => e.toLowerCase() === cleanEmail.toLowerCase()) ||
            DEFAULT_APPROVED_EMAILS.some(e => e.toLowerCase() === cleanEmail.toLowerCase());
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
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error) {
          setErrorMsg(data.error);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Server error
    }

    setErrorMsg('Code de vérification incorrect ou expiré. Veuillez vérifier le code reçu dans Gmail.');
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

    const currentApproved = loadApprovedEmails();
    const isPreApproved =
      isOwner ||
      currentApproved.some(e => e.toLowerCase() === lowerEmail);

    // 1. Server-Authoritative verification
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

        if (approved) {
          saveAuthVaultPassword(lowerEmail, password);
          saveApprovedEmails(Array.from(new Set([...currentApproved, lowerEmail])));
          onLogin(lowerEmail, true);
          return;
        }

        // If not approved yet: Immediately redirect to BaridiMob payment & pending approval screen!
        if (authMode === 'register') {
          saveAuthVaultPassword(lowerEmail, password);
          savePendingRegistration(lowerEmail);
          setIsLoading(false);
          onLogin(lowerEmail, false);
          return;
        } else {
          // If logging in and status is pending, show payment screen
          if (data.user?.status === 'pending' || data.status === 'pending') {
            saveAuthVaultPassword(lowerEmail, password);
            savePendingRegistration(lowerEmail);
            setIsLoading(false);
            onLogin(lowerEmail, false);
            return;
          }
          setErrorMsg(
            data.message ||
            "Votre compte est en attente d'approbation par l'administrateur. Dès qu'il aura approuvé votre adresse Gmail, vous pourrez vous connecter."
          );
          setIsLoading(false);
          return;
        }
      }

      // If server returned a recognized JSON error (not authorized, wrong password, etc.)
      if (!res.ok && isJson) {
        const data = await res.json().catch(() => ({}));
        if (data.error && !isMasterKey) {
          // STRICT SECURITY CHECK: If password is wrong or unauthorized, REJECT IMMEDIATELY! NEVER LOG IN!
          if (res.status === 401 || data.error.toLowerCase().includes('mot de passe') || data.error.toLowerCase().includes('incorrect')) {
            setErrorMsg(data.error || 'Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur "Mot de passe oublié ?".');
            setIsLoading(false);
            return;
          }

          // If account doesn't exist yet in login mode
          if (res.status === 404) {
            setErrorMsg(data.error || "Aucun compte trouvé avec cet email. Veuillez d'abord cliquer sur 'Créer un compte'.");
            setIsLoading(false);
            return;
          }

          // If error is about pending approval or account already existing in pending
          if (data.error.includes('attente') || data.status === 'pending' || (authMode === 'register' && data.error.includes('existe déjà'))) {
            saveAuthVaultPassword(lowerEmail, password);
            savePendingRegistration(lowerEmail);
            setIsLoading(false);
            onLogin(lowerEmail, false);
            return;
          }

          setErrorMsg(data.error);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Server unreachable (static fallback / offline mode)
    }

    // 2. Strict Vault / Local fallback verification (ONLY for owners or already approved clients)
    try {
      const vault = getAuthVault();
      const savedPass = vault[lowerEmail];

      // Master key bypass for site administrator
      if (isMasterKey) {
        saveAuthVaultPassword(lowerEmail, password);
        saveApprovedEmails(Array.from(new Set([...currentApproved, lowerEmail])));
        onLogin(lowerEmail, true);
        return;
      }

      // Verify owner accounts with their authorized passwords
      if (isOwner) {
        const isOwnerPassValid = password === 'Nounoussa7' || password === 'xbkw qnjy stzd ibnc' || (savedPass && password === savedPass);
        if (!isOwnerPassValid) {
          setErrorMsg('Mot de passe administrateur incorrect. Veuillez vérifier votre saisie.');
          setIsLoading(false);
          return;
        }
        saveAuthVaultPassword(lowerEmail, password);
        saveApprovedEmails(Array.from(new Set([...currentApproved, lowerEmail])));
        onLogin(lowerEmail, true);
        return;
      }

      // STRICT CLIENT PASSWORD VERIFICATION:
      // If client has a saved password, it MUST match exactly!
      if (savedPass && password !== savedPass) {
        setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur "Mot de passe oublié ?".');
        setIsLoading(false);
        return;
      }

      // For clients: If approved by admin and no password was ever recorded (first connection setup)
      // or password matches savedPass:
      if (isPreApproved) {
        if (!savedPass) {
          saveAuthVaultPassword(lowerEmail, password);
        }
        saveApprovedEmails(Array.from(new Set([...currentApproved, lowerEmail])));
        onLogin(lowerEmail, true);
        return;
      }

      // If registered offline / static fallback, take to payment screen
      if (authMode === 'register') {
        saveAuthVaultPassword(lowerEmail, password);
        savePendingRegistration(lowerEmail);
        setIsLoading(false);
        onLogin(lowerEmail, false);
        return;
      }

      // If client is NOT approved: Strictly forbid connection!
      if (authMode === 'login') {
        setErrorMsg("Cette adresse Gmail n'est pas autorisée ou n'a pas encore été approuvée par l'administrateur.");
        setIsLoading(false);
        return;
      } else {
        saveAuthVaultPassword(lowerEmail, password);
        setSuccessMsg("✅ Demande enregistrée ! L'administrateur doit d'abord approuver votre adresse Gmail dans l'espace privé avant que vous puissiez vous connecter.");
        setPassword('');
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
              setResetToken('');
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

            {/* Info notice explaining email dispatch */}
            <div className="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-xl flex items-start gap-2.5 text-xs text-indigo-200">
              <Mail className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-300 leading-relaxed m-0">
                Le code de sécurité a été envoyé directement à votre adresse Gmail. Ouvrez l'application Gmail ou cliquez sur le bouton ci-dessus pour le récupérer (pensez à vérifier vos <strong>Spams</strong>).
              </p>
            </div>

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

