import React, { useState, useEffect } from 'react';
import { Clock, Copy, Check, RefreshCw, LogOut, MessageCircle } from 'lucide-react';
import { PaymentSettings } from '../types';

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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Poll server for latest payment details & user approval
  useEffect(() => {
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
        if (res.ok) {
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
    try {
      const res = await fetch(`/api/auth/status?email=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
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
          <div className="font-bold text-amber-400 flex items-center gap-1.5 border-b border-[#22293d] pb-2">
            <span>💳 Coordonnées de paiement officiel</span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-[#1f263b] p-2.5 rounded-lg border border-[#22293d]">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">BaridiMob</span>
              <span className="font-mono text-xs font-semibold text-cyan-300">{livePaymentSettings.baridiMob}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(livePaymentSettings.baridiMob, 'baridimob')}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Copier le numéro"
            >
              {copiedField === 'baridimob' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 bg-[#1f263b] p-2.5 rounded-lg border border-[#22293d]">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">CCP</span>
              <span className="font-mono text-xs font-semibold text-cyan-300">{livePaymentSettings.ccp}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(livePaymentSettings.ccp, 'ccp')}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Copier le numéro CCP"
            >
              {copiedField === 'ccp' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-[11px] text-slate-300 pt-1 leading-relaxed">
            • Une fois le virement effectué, transmettez la capture du reçu avec votre email (<strong className="text-white">{userEmail}</strong>) à notre support :
            <div className="mt-1 text-amber-300 font-semibold flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{livePaymentSettings.contact}</span>
            </div>
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
