import React, { useState, useEffect } from 'react';
import { Clock, Copy, Check, RefreshCw, LogOut, MessageCircle, CheckCircle } from 'lucide-react';
import { PaymentSettings } from '../types';
import { isOwnerEmail, loadApprovedEmails, saveApprovedEmails, triggerCelebration } from '../utils/storage';

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
  const [isSuccess, setIsSuccess] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Poll server for latest payment details & user approval status
  useEffect(() => {
    if (isOwnerEmail(userEmail)) {
      const current = loadApprovedEmails();
      saveApprovedEmails(Array.from(new Set([...current, userEmail.toLowerCase()])));
      onRefreshCheck();
      return;
    }

    // 1. Fetch live payment settings
    fetch('/api/payment-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setLivePaymentSettings(data);
      })
      .catch(() => {});

    // 2. Poll server every 3s to see if admin approved this account in Admin portal
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/status?email=${encodeURIComponent(userEmail)}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.approved) {
            setIsSuccess(true);
            triggerCelebration();
            clearInterval(interval);
            setTimeout(() => {
              onRefreshCheck();
            }, 600);
          }
        }
      } catch {
        // silent retry
      }
    }, 3000);

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
          setIsSuccess(true);
          triggerCelebration();
          setTimeout(() => {
            onRefreshCheck();
          }, 500);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c13]/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#111522] border border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-center flex flex-col gap-4 shadow-[0_0_60px_rgba(245,158,11,0.2)] my-auto relative">
        {/* Glow decorative effects */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Heading */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-[0_0_20px_rgba(245,158,11,0.25)]">
          {isSuccess ? '🎉' : '⏳'}
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>Compte créé — En attente de validation</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            {isSuccess ? 'Accès Validé !' : 'Activez votre accès au Planner'}
          </h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-md mx-auto">
            Votre compte (<strong className="text-cyan-300">{userEmail}</strong>) a été enregistré.
            Pour activer votre accès, veuillez effectuer le paiement par BaridiMob puis envoyer votre preuve de paiement sur Telegram. L'administrateur validera immédiatement votre compte.
          </p>
        </div>

        {/* Payment Details Box */}
        <div className="bg-[#171c2c] border border-dashed border-[#22293d] p-4 rounded-xl text-left text-xs text-slate-200 flex flex-col gap-3">
          <div className="font-bold text-amber-400 flex items-center justify-between border-b border-[#22293d] pb-2">
            <span>💳 Coordonnées BaridiMob (Algérie Poste)</span>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-md font-semibold border border-emerald-500/30">Instantané</span>
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

          {/* Telegram Instructions Box - Proof of payment */}
          <div className="bg-[#172133] border border-sky-500/30 p-3.5 rounded-xl flex flex-col gap-2 text-slate-300">
            <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
              <MessageCircle className="w-4 h-4 text-sky-400" />
              <span>Envoi de la preuve de paiement</span>
            </div>
            <p className="leading-relaxed text-slate-300 text-xs">
              Une fois votre virement effectué, envoyez directement votre <strong>capture d’écran ou reçu de virement</strong> sur Telegram. L'administrateur validera immédiatement votre compte.
            </p>
            <a
              href="https://t.me/maroua144"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all text-xs shadow-[0_0_15px_rgba(14,165,233,0.3)]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Envoyer ma preuve de paiement sur Telegram (@maroua144)</span>
              <span className="text-[11px]">↗</span>
            </a>
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
            <span>{isChecking ? 'Vérification en cours...' : 'Vérifier si mon compte a été activé'}</span>
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
