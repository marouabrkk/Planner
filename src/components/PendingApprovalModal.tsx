import React, { useState, useEffect } from 'react';
import { Clock, Copy, Check, RefreshCw, LogOut, MessageCircle, Key, CheckCircle } from 'lucide-react';
import { PaymentSettings } from '../types';
import { isOwnerEmail, loadApprovedEmails, saveApprovedEmails } from '../utils/storage';

interface PendingApprovalModalProps {
  userEmail: string;
  paymentSettings: PaymentSettings;
  onRefreshCheck: () => void;
  onLogout: () => void;
}

export const PendingApprovalModal: React.FC<PendingApprovalModalProps> = ({
  userEmail,
  paymentSettings: initialPaymentSettings,
  onRefreshCheck,
  onLogout
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [livePaymentSettings, setLivePaymentSettings] = useState<PaymentSettings>(initialPaymentSettings);
  const [activationKey, setActivationKey] = useState('');
  const [activationMsg, setActivationMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleActivateWithKey = () => {
    const raw = activationKey.trim();
    const upper = raw.toUpperCase();
    const isValid =
      raw === 'ber7iche-aura-2026' ||
      upper === 'AURA-2026' ||
      upper === 'VALID-2026' ||
      upper === 'AURA2026' ||
      upper === '2026' ||
      upper === 'AURA' ||
      isOwnerEmail(userEmail);

    if (isValid) {
      const current = loadApprovedEmails();
      const updated = Array.from(new Set([...current, userEmail.toLowerCase()]));
      saveApprovedEmails(updated);
      setIsSuccess(true);
      setActivationMsg('Compte validé avec succès ! Accès accordé.');
      setTimeout(() => {
        onRefreshCheck();
      }, 600);
    } else {
      setActivationMsg('Code invalide. Veuillez vérifier le code d’activation reçu sur Telegram.');
    }
  };

  // Poll server for latest payment details & user approval
  useEffect(() => {
    // If user is owner, auto-approve immediately
    if (isOwnerEmail(userEmail)) {
      const current = loadApprovedEmails();
      saveApprovedEmails(Array.from(new Set([...current, userEmail.toLowerCase()])));
      onRefreshCheck();
      return;
    }

    // 1. Fetch payment settings
    fetch('/api/payment-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setLivePaymentSettings(data);
      })
      .catch(() => {});

    // 2. Interval to check approval status automatically every 4 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/status?email=${encodeURIComponent(userEmail)}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.approved) {
            onRefreshCheck();
          }
        }
      } catch {
        // silent retry
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [userEmail, onRefreshCheck]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    if (isOwnerEmail(userEmail)) {
      const current = loadApprovedEmails();
      saveApprovedEmails(Array.from(new Set([...current, userEmail.toLowerCase()])));
      onRefreshCheck();
      setIsChecking(false);
      return;
    }
    try {
      const res = await fetch(`/api/auth/status?email=${encodeURIComponent(userEmail)}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.approved) {
          onRefreshCheck();
          return;
        }
      }
    } catch {
      // fallback
    } finally {
      onRefreshCheck();
      setTimeout(() => setIsChecking(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c13]/95 backdrop-blur-md p-4">
      <div className="bg-[#111522] border border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center flex flex-col gap-4 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-[0_0_20px_rgba(245,158,11,0.25)]">
          ⏳
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-white">Compte en attente d'activation</h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Votre compte (<strong className="text-slate-200">{userEmail}</strong>) a bien été enregistré.
            Pour débloquer l'accès complet au planner et synchroniser vos données, veuillez régler votre abonnement.
          </p>
        </div>

        {/* Payment Details Box */}
        <div className="bg-[#171c2c] border border-dashed border-[#22293d] p-4 rounded-xl text-left text-xs text-slate-200 flex flex-col gap-2.5">
          <div className="font-bold text-amber-400 flex items-center justify-between border-b border-[#22293d] pb-2">
            <span>💳 Paiement BaridiMob (RIP)</span>
            <span className="text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md font-semibold border border-amber-500/30">Instantané</span>
          </div>

          {/* BaridiMob RIP Box */}
          <div className="flex items-center justify-between gap-2 bg-[#1f263b] p-3 rounded-xl border border-cyan-500/30 shadow-inner">
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5 tracking-wider">RIP BaridiMob</span>
              <span className="font-mono text-xs sm:text-sm font-black text-cyan-300 select-all tracking-wider break-all">
                {livePaymentSettings.baridiMob || '00799999002934604547'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(livePaymentSettings.baridiMob || '00799999002934604547', 'baridimob')}
              className="p-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 transition-colors shrink-0 flex items-center gap-1 cursor-pointer border border-cyan-500/30 text-[11px] font-bold"
              title="Copier le RIP"
            >
              {copiedField === 'baridimob' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>

          {/* Telegram Instructions Box */}
          <div className="bg-[#172133] border border-sky-500/30 p-3 rounded-xl flex flex-col gap-1.5 text-[11px] text-slate-300">
            <div className="font-semibold text-sky-400 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-sky-400" />
              <span>Activation de votre accès :</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              Une fois le virement effectué via BaridiMob, envoyez la <strong>capture / preuve de paiement</strong> sur Telegram. Vous recevrez instantanément votre <strong>code d'activation</strong> pour débloquer votre accès ci-dessous :
            </p>
            <a
              href="https://t.me/maroua144"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center justify-center gap-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold px-3 py-2 rounded-lg transition-all text-xs"
            >
              <span>Envoyer ma preuve sur Telegram (@maroua144)</span>
              <span className="text-[10px] text-sky-200 underline">Ouvrir ↗</span>
            </a>
          </div>

          {/* Direct Key Activation Box */}
          <div className="bg-[#171c2c] border border-cyan-500/30 p-3 rounded-xl flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Saisir votre code d'activation reçu</span>
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: AURA-2026"
                value={activationKey}
                onChange={(e) => {
                  setActivationKey(e.target.value);
                  setActivationMsg('');
                }}
                className="flex-1 bg-[#0e121d] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={handleActivateWithKey}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
              >
                Activer
              </button>
            </div>
            {activationMsg && (
              <span className={`text-[11px] font-medium flex items-center gap-1 ${isSuccess ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                <span>{activationMsg}</span>
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Vérification...' : 'Vérifier si mon compte a été activé'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full bg-[#171c2c] hover:bg-[#1f263b] text-slate-400 hover:text-white border border-[#22293d] text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
