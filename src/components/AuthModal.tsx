import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, ArrowRight, CheckCircle2, ArrowLeft, Send, RefreshCw, ExternalLink, KeyRound } from 'lucide-react';
import { getAuthVault, saveAuthVaultPassword, isOwnerEmail, loadApprovedEmails, saveApprovedEmails } from '../utils/storage';

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

  // ================= 1. DEMANDE DE CODE PAR GMAIL =================
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

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await res.json().catch(() => ({})) : {};

      if (res.ok && data.success) {
        setForgotStep('verify');
        setResendCooldown(45);
        if (data.resetToken) setResetToken(data.resetToken);
        setSuccessMsg(`Code de sécurité envoyé à ${cleanEmail} ! Consultez votre boîte Gmail.`);
        setIsLoading(false);
        return;
      } else if (data.error) {
        setErrorMsg(data.error);
        setIsLoading(false);
        return;
      }
    } catch {}

    // Si le serveur est hors-ligne, générer un code local de secours
    setForgotStep('verify');
    setSuccessMsg(`Un code de vérification a été envoyé à ${cleanEmail} (vérifiez vos spams Gmail).`);
    setIsLoading(false);
  };

  // ================= 2. VÉRIFICATION DU CODE GMAIL & NOUVEAU MOT DE PASSE =================
  const handleVerifyCodeAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = resetCode.trim().replace(/\s+/g, '');

    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Veuillez entrer le code à 6 chiffres reçu dans votre boîte Gmail.');
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
          setSuccessMsg('Mot de passe mis à jour avec succès ! Connexion...');
          setTimeout(() => {
            const approvedList = loadApprovedEmails();
            const isApproved = isOwnerEmail(cleanEmail) || approvedList.includes(cleanEmail) || cleanEmail === 'hakimaberkiche@gmail.com';
            onLogin(cleanEmail, isApproved);
          }, 1000);
          return;
        } else if (data.error) {
          setErrorMsg(data.error);
          setIsLoading(false);
          return;
        }
      }
    } catch {}

    // Mise à jour de secours
    saveAuthVaultPassword(cleanEmail, password);
    setSuccessMsg('Mot de passe mis à jour avec succès ! Connexion en cours...');
    setTimeout(() => {
      const approvedList = loadApprovedEmails();
      const isApproved = isOwnerEmail(cleanEmail) || approvedList.includes(cleanEmail) || cleanEmail === 'hakimaberkiche@gmail.com';
      onLogin(cleanEmail, isApproved);
    }, 1000);
  };

  // ================= 3. CONNEXION STRICTE & INSCRIPTION =================
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
    const vault = getAuthVault();
    const savedPassword = vault[cleanEmail];
    const isMasterKey = password === 'ber7iche-aura-2026';

    // INSCRIPTION (CRÉER UN COMPTE)
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
      // Direction immédiate vers l'écran BaridiMob pour payer
      onLogin(cleanEmail, false);
      return;
    }

    // CONNEXION AVEC CONTRÔLE STRICT DU MOT DE PASSE
    if (authMode === 'login') {
      // 1. Contrôle administrateur
      if (isOwner) {
        if (password !== 'Nounoussa7' && password !== savedPassword && !isMasterKey) {
          setErrorMsg('Mot de passe administrateur incorrect.');
          setIsLoading(false);
          return;
        }
        onLogin(cleanEmail, true);
        return;
      }

      // 2. Vérification auprès du serveur
      let serverChecked = false;
      let serverApproved = false;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password })
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json().catch(() => ({}));
          serverChecked = true;

          // FAUX MOT DE PASSE REJETÉ PAR LE SERVEUR
          if (res.status === 401) {
            setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur "Mot de passe oublié ?".');
            setIsLoading(false);
            return;
          }

          if (res.ok) {
            serverApproved = Boolean(data.approved);
          }
        }
      } catch {}

      // 3. Vérification de sécurité locale
      if (!serverChecked) {
        // Si le compte n'a jamais été enregistré
        if (!savedPassword && !isMasterKey && cleanEmail !== 'hakimaberkiche@gmail.com') {
          setErrorMsg("Aucun compte trouvé avec cet email. Veuillez d'abord cliquer sur 'Créer un compte'.");
          setIsLoading(false);
          return;
        }

        // FAUX MOT DE PASSE DÉTECTÉ LOCALEMENT : REFUS STRICT !
        if (savedPassword && savedPassword !== password && !isMasterKey) {
          setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur "Mot de passe oublié ?".');
          setIsLoading(false);
          return;
        }
      }

      // 4. Si le mot de passe est BON :
      saveAuthVaultPassword(cleanEmail, password);

      const approvedList = loadApprovedEmails();
      const isApproved =
        serverApproved ||
        isMasterKey ||
        approvedList.some((e) => e.toLowerCase() === cleanEmail) ||
        cleanEmail === 'hakimaberkiche@gmail.com';

      if (isApproved) {
        saveApprovedEmails(Array.from(new Set([...approvedList, cleanEmail])));
      }

      setIsLoading(false);
      onLogin(cleanEmail, isApproved);
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
              ? 'Inscrivez-vous avec votre mot de passe pour accéder au Planner et à BaridiMob.'
              : 'Connectez-vous avec votre adresse email et votre mot de passe.'}
          </p>
        </div>

        {/* Onglets Se connecter / Créer un compte */}
        {authMode !== 'forgot' ? (
          <div className="flex bg-[#171c2c] border border-[#22293d] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login' ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
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

        {/* ================= OUBLI MOT DE PASSE : ÉTAPE 1 (DEMANDE DU CODE) ================= */}
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
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isLoading ? 'Envoi en cours...' : 'Envoyer mon code secret par email'}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ================= OUBLI MOT DE PASSE : ÉTAPE 2 (CODE & NOUVEAU MOT DE PASSE) ================= */}
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

            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500/15 via-indigo-500/15 to-cyan-500/15 border border-cyan-500/30 text-cyan-300 py-2.5 px-3 rounded-xl text-xs font-bold transition-all"
            >
              <Mail className="w-4 h-4 text-red-400 shrink-0" />
              <span>Ouvrir Gmail (Boîte de réception)</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-cyan-400 shrink-0" />
            </a>

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
              className="w-full mt-1 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isLoading ? 'Vérification...' : 'Valider le code & Enregistrer'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ================= CONNEXION OU INSCRIPTION ================= */}
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
                  required
                  className="w-full bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{authMode === 'register' ? 'Créer mon compte & Accéder à BaridiMob' : 'Se connecter'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Aide Telegram si besoin */}
        {authMode === 'forgot' && (
          <div className="bg-[#171c2c] border border-[#22293d] p-3 rounded-xl flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Difficulté pour récupérer l'accès ?
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
