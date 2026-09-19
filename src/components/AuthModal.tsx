import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { getAuthVault, saveAuthVaultPassword, isOwnerEmail, loadApprovedEmails, saveApprovedEmails } from '../utils/storage';

interface AuthModalProps {
  onLogin: (email: string, isApprovedDirectly?: boolean) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

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

    // ================= SÉCURITÉ INSCRIPTION =================
    if (authMode === 'register') {
      // Enregistrement du mot de passe choisi par le client
      saveAuthVaultPassword(cleanEmail, password);
      
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password })
        });
      } catch {}

      setIsLoading(false);
      // Direction BaridiMob pour payer
      onLogin(cleanEmail, false);
      return;
    }

    // ================= SÉCURITÉ CONNEXION STRICTE =================
    if (authMode === 'login') {
      // 1. Vérification Propriétaire
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
      let serverVerified = false;
      let serverApproved = false;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password })
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          serverVerified = true;
          serverApproved = Boolean(data.approved);
        } else if (res.status === 401) {
          // MOT DE PASSE FAUX DÉTECTÉ PAR LE SERVEUR
          setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre saisie.');
          setIsLoading(false);
          return;
        }
      } catch {}

      // 3. Vérification du mot de passe en local si le serveur est indisponible
      if (!serverVerified) {
        if (!savedPassword && !isMasterKey) {
          setErrorMsg("Aucun compte trouvé avec cet email. Veuillez cliquer sur 'Créer un compte'.");
          setIsLoading(false);
          return;
        }

        // MOT DE PASSE FAUX : BLOCAGE STRICT
        if (savedPassword && savedPassword !== password && !isMasterKey) {
          setErrorMsg('Mot de passe incorrect. Veuillez vérifier votre saisie.');
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
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white">
            ⚡
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {authMode === 'register' ? 'Créer votre compte' : 'Connexion à votre Espace'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs">
            {authMode === 'register'
              ? 'Choisissez un mot de passe sécurisé pour votre Planner.'
              : 'Connectez-vous avec votre email et votre mot de passe.'}
          </p>
        </div>

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
            <label className="text-[11px] font-bold text-slate-400">Votre mot de passe</label>
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
            className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{authMode === 'register' ? 'Créer mon compte & Payer' : 'Se connecter'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

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
