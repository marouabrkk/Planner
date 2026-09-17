import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, X, Check, CreditCard, Settings, UserCheck } from 'lucide-react';
import { PaymentSettings } from '../types';
import { ADMIN_EMAIL } from '../utils/storage';

interface AdminApprovalModalProps {
  approvedEmails: string[];
  paymentSettings: PaymentSettings;
  onClose: () => void;
  onAddEmail: (email: string) => void;
  onRemoveEmail: (email: string) => void;
  onUpdatePaymentSettings: (settings: PaymentSettings) => void;
}

export const AdminApprovalModal: React.FC<AdminApprovalModalProps> = ({
  approvedEmails,
  paymentSettings,
  onClose,
  onAddEmail,
  onRemoveEmail,
  onUpdatePaymentSettings
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'clients' | 'payment'>('clients');

  // Payment form states
  const [baridiMob, setBaridiMob] = useState(paymentSettings.baridiMob);
  const [ccp, setCcp] = useState(paymentSettings.ccp);
  const [contact, setContact] = useState(paymentSettings.contact);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      alert('Veuillez entrer une adresse email valide.');
      return;
    }
    if (approvedEmails.map((e) => e.toLowerCase()).includes(clean)) {
      alert('Ce client est déjà dans la liste des comptes approuvés.');
      return;
    }
    onAddEmail(clean);
    setNewEmail('');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePaymentSettings({
      baridiMob: baridiMob.trim(),
      ccp: ccp.trim(),
      contact: contact.trim()
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c13]/90 backdrop-blur-md p-4">
      <div className="bg-[#111522] border border-amber-500/40 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[#22293d]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-white">Administration & Validation Clients</h2>
              <p className="text-[11px] text-slate-400">Gérez les accès abonnés et vos coordonnées de paiement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#171c2c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#171c2c] border border-[#22293d] rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'clients'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Clients Approuvés ({approvedEmails.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'payment'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Coordonnées de Paiement</span>
          </button>
        </div>

        {activeTab === 'clients' ? (
          <div className="flex flex-col gap-3">
            {/* Add client form */}
            <form onSubmit={handleAddClient} className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email du client ayant payé..."
                className="flex-1 bg-[#171c2c] border border-[#22293d] focus:border-amber-500 text-white text-xs px-3 py-2 rounded-xl outline-none transition-all placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              >
                <Plus className="w-4 h-4" />
                <span>Valider</span>
              </button>
            </form>

            {/* List */}
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
              {approvedEmails.map((email) => {
                const isOwner = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                return (
                  <div
                    key={email}
                    className="bg-[#171c2c] border border-[#22293d] px-3 py-2 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-200 truncate">{email}</span>
                      {isOwner && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                          Propriétaire
                        </span>
                      )}
                    </div>

                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => onRemoveEmail(email)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                        title="Révoquer l'accès"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSavePayment} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-400">Numéro BaridiMob</label>
              <input
                type="text"
                value={baridiMob}
                onChange={(e) => setBaridiMob(e.target.value)}
                className="bg-[#171c2c] border border-[#22293d] focus:border-amber-500 text-white text-xs px-3 py-2 rounded-xl outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-400">Numéro CCP & Clé</label>
              <input
                type="text"
                value={ccp}
                onChange={(e) => setCcp(e.target.value)}
                className="bg-[#171c2c] border border-[#22293d] focus:border-amber-500 text-white text-xs px-3 py-2 rounded-xl outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-400">Contact Réception des Reçus (WhatsApp / Instagram)</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="bg-[#171c2c] border border-[#22293d] focus:border-amber-500 text-white text-xs px-3 py-2 rounded-xl outline-none"
              />
            </div>

            <button
              type="submit"
              className="mt-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)]"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-950" /> : <Settings className="w-4 h-4" />}
              <span>{savedSuccess ? 'Modifications enregistrées !' : 'Enregistrer les coordonnées'}</span>
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-[#22293d] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#171c2c] hover:bg-[#1f263b] text-slate-300 text-xs px-4 py-2 rounded-xl border border-[#22293d] transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
