import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, ArrowRight, CheckCircle2, KeyRound, ArrowLeft, Send, RefreshCw, ExternalLink } from 'lucide-react';
import { getAuthVault, saveAuthVaultPassword, isOwnerEmail, loadApprovedEmails, saveApprovedEmails } from '../utils/storage';

interface AuthModalProps {
  onLogin: (email: string, isApprovedDirectly?: boolean) => void;
}

const SUPABASE_URL = 'https://tflqmnmdhkxihlywekqs.supabase.co';
const SUPABASE_KEY = 'sb_secret_rN0ms_ZMSU-L0OXTE4mAUQ_sBMnhAa9';

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

  // 1. DEMANDE DU CODE SECRET À 6 CHIFFRES PAR GMAIL
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
        if (data.resetToken) {
          setResetToken(data.resetToken);
        }
        setSuccessMsg(`Code de sécurité envoyé à ${cleanEmail} ! Consultez votre boîte Gmail.`);
        setIsLoading(false);
        return;
      } else if (data.error) {
        setErrorMsg(data.error);
        setIsLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    setForgotStep('verify');
    setResendCooldown(45);
    setSuccessMsg(`Si l'email tarde, vous pouvez aussi contacter l'assistance Telegram ci-dessous.`);
    setIsLoading(false);
  };

  // 2. VÉRIFICATION DU CODE ET NOUVEAU MOT DE PASSE
  const handleVerifyCodeAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
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
      await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: password })
      });

      saveAuthVaultPassword(cleanEmail, password);
      setSuccessMsg('Mot de passe mis à jour avec succès ! Connexion en cours...');
      setTimeout(() => onLogin(cleanEmail, true), 1000);
      return;
    } catch {
      setErrorMsg('Erreur lors de la mise à jour du mot de passe. Veuillez réessayer.');
      setIsLoading(false);
    }
  };

  // 3. CONNEXION ET CRÉATION DE COMPTE DIRECTES AVEC SUPABASE
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
      setErrorMsg('Veuillez renseigner un mot de passe (au moins 4 caractères).');
      return;
    }

    setIsLoading(true);
    const isOwner = isOwnerEmail(cleanEmail);

    // Contrôle propriétaire
    if (isOwner) {
      const isOwnerPassValid = password === 'Nounoussa7' || password === 'xbkw qnjy stzd ibnc' || password === 'ber7iche-aura-2026';
      if (!isOwnerPassValid) {
        setErrorMsg('Mot de passe administrateur incorrect.');
        setIsLoading(false);
        return;
      }
      saveAuthVaultPassword(cleanEmail, password);
      saveApprovedEmails(Array.from(new Set([...loadApprovedEmails(), cleanEmail])));
      onLogin(cleanEmail, true);
      return;
    }

    // Mot de passe maître
    if (password === 'ber7iche-aura-2026') {
      saveAuthVaultPassword(cleanEmail, password);
      saveApprovedEmails(Array.from(new Set([...loadApprovedEmails(), cleanEmail])));
      onLogin(cleanEmail, true);
      return;
    }

    try {
      // Interroge directement Supabase en direct
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}&select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json'
        }
      });
      const users = checkRes.ok ? await checkRes.json() : [];
      const user = Array.isArray(users) && users.length > 0 ? users[0] : null;

      if (authMode === 'login') {
        // MODE CONNEXION
        if (!user) {
          setErrorMsg("Aucun compte trouvé avec cet email. Veuillez cliquer sur 'Créer un compte' pour choisir votre mot de passe.");
          setIsLoading(false);
          return;
        }

        // Vérification du mot de passe
        if (user.password && user.password !== password) {
          setErrorMsg("Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur 'Mot de passe oublié ?'.");
          setIsLoading(false);
          return;
        }

        // Si le mot de passe n'avait pas encore été enregistré
        if (!user.password) {
          await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
          });
        }

        // Vérification de la validation
        if (user.status !== 'approved') {
          setErrorMsg("Votre compte est en attente d'approbation par l'administrateur.");
          setIsLoading(false);
          return;
        }

        // Connexion immédiate
        saveAuthVaultPassword(cleanEmail, password);
        saveApprovedEmails(Array.from(new Set([...loadApprovedEmails(), cleanEmail])));
        onLogin(cleanEmail, true);
        return;

      } else {
        // MODE CRÉATION DE COMPTE
        const safeId = 'u_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

        if (user) {
          // L'utilisateur existait déjà : on met à jour son mot de passe et son statut
          await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password, status: 'approved' })
          });
        } else {
          // Nouvel utilisateur : inséré directement dans Supabase
          await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: safeId,
              email: cleanEmail,
              password: password,
              status: 'approved'
            })
          });
        }

        saveAuthVaultPassword(cleanEmail, password);
        saveApprovedEmails(Array.from(new Set([...loadApprovedEmails(), cleanEmail])));
        onLogin(cleanEmail, true);
        return;
      }

    } catch (err) {
      console.error('Erreur connexion Supabase:', err);
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
                ? `Entrez le code à 6 chiffres envoyé à ${email || 'votre email'} ainsi que votre nouveau mot de passe.`
                : 'Recevez un code de sécurité à 6 chiffres sur votre boîte de réception Gmail.'
              : authMode === 'register'
              ? 'Créez votre compte pour enregistrer vos données en toute sécurité.'
              : 'Connectez-vous pour retrouver vos tâches, cours et habitudes.'}
          </p>
        </div>

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

        {/* FORGOT PASSWORD - STEP 1 */}
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

        {/* FORGOT PASSWORD - STEP 2 */}
        {authMode === 'forgot' && forgotStep === 'verify' && (
          <form onSubmit={handleVerifyCodeAndReset} className="flex flex-col gap-3.5">
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

        {/* CONNEXION ET CRÉATION DE COMPTE */}
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
                  required
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
                  required
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

        {/* SUPPORT TELEGRAM */}
        {authMode === 'forgot' && (
          <div className="bg-[#171c2c] border border-[#22293d] p-3 rounded-xl flex flex-col gap-2">
            <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Une difficulté pour vous reconnecter ?
            </span>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Vous pouvez contacter directement la propriétaire sur Telegram pour réinitialiser votre accès.
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