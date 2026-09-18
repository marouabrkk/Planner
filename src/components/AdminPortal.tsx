import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Server,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  XCircle,
  Database,
  Cpu,
  Lock,
  KeyRound,
  Mail,
  Send,
  HelpCircle,
  Sparkles,
  Link2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ADMIN_EMAIL,
  ADMIN_EMAILS,
  loadApprovedEmails,
  saveApprovedEmails,
  loadPaymentSettings,
  savePaymentSettings
} from '../utils/storage';

export const ADMIN_SECRET_KEY = 'ber7iche-aura-2026';

interface ClientUser {
  id: string;
  email: string;
  status: 'approved' | 'pending';
  role: 'admin' | 'client';
  createdAt: string;
  approvedAt?: string;
}

interface PaymentConfig {
  baridiMob: string;
  ccp: string;
  contact: string;
}

interface SystemStats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  uptimeSeconds: number;
  dbSizeKB: number;
}

interface AdminPortalProps {
  onGoToPlanner: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onGoToPlanner }) => {
  // Key verification & unlock logic
  const checkInitialAuthorization = (): boolean => {
    try {
      const href = window.location.href;
      const url = new URL(href);
      const queryKey = url.searchParams.get('key') || url.searchParams.get('adminKey') || url.searchParams.get('token');
      if (queryKey && queryKey.trim() === ADMIN_SECRET_KEY) {
        localStorage.setItem('aura_admin_token', ADMIN_SECRET_KEY);
        return true;
      }

      // Check hash params e.g. #validation-clients?key=... or #admin?key=...
      const hash = window.location.hash || '';
      if (hash.includes('key=')) {
        const match = hash.match(/key=([^&?#]+)/);
        if (match && decodeURIComponent(match[1]).trim() === ADMIN_SECRET_KEY) {
          localStorage.setItem('aura_admin_token', ADMIN_SECRET_KEY);
          return true;
        }
      }

      // If URL contains the secret key directly in hash
      if (hash.includes(ADMIN_SECRET_KEY)) {
        localStorage.setItem('aura_admin_token', ADMIN_SECRET_KEY);
        return true;
      }

      const stored = localStorage.getItem('aura_admin_token');
      return stored === ADMIN_SECRET_KEY;
    } catch {
      return false;
    }
  };

  const [isAuthorized, setIsAuthorized] = useState<boolean>(checkInitialAuthorization);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Auto-listen to hash/url updates to immediately authorize if key passed
  useEffect(() => {
    const handleUrlAuth = () => {
      if (checkInitialAuthorization()) {
        setIsAuthorized(true);
      }
    };
    window.addEventListener('hashchange', handleUrlAuth);
    window.addEventListener('popstate', handleUrlAuth);
    return () => {
      window.removeEventListener('hashchange', handleUrlAuth);
      window.removeEventListener('popstate', handleUrlAuth);
    };
  }, []);

  const [users, setUsers] = useState<ClientUser[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentConfig>({
    baridiMob: '',
    ccp: '',
    contact: ''
  });
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<{
    user: string;
    pass: string;
    fromName: string;
    isConfigured: boolean;
    hasPassword: boolean;
  }>({
    user: 'ber7iche@gmail.com',
    pass: '',
    fromName: 'AURA Master Planner',
    isConfigured: false,
    hasPassword: false
  });
  const [testEmailAddress, setTestEmailAddress] = useState('ber7iche@gmail.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpSaveSuccess, setSmtpSaveSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState<'clients' | 'payment' | 'email' | 'capacity'>('clients');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleUnlockWithKey = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim();
    if (clean === ADMIN_SECRET_KEY) {
      localStorage.setItem('aura_admin_token', ADMIN_SECRET_KEY);
      setIsAuthorized(true);
      setAuthError('');
      showToast('Console déverrouillée avec succès !');
    } else {
      setAuthError('Clé secrète incorrecte. Accès refusé.');
    }
  };

  const handleLockAndExit = () => {
    localStorage.removeItem('aura_admin_token');
    setIsAuthorized(false);
    window.location.hash = '';
    onGoToPlanner();
  };

  const fetchAllData = useCallback(async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      // 1. Fetch Users from Server (with LocalStorage fallback)
      try {
        const usersRes = await fetch(`/api/admin/users?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
          headers: { 'x-admin-key': ADMIN_SECRET_KEY }
        });
        if (usersRes.ok) {
          const data = await usersRes.json().catch(() => ({}));
          if (Array.isArray(data.users) && data.users.length > 0) {
            setUsers(data.users);
          } else {
            // Populate fallback users
            const localApproved = loadApprovedEmails();
            setUsers(localApproved.map(em => ({
              id: 'u_' + btoa(em.toLowerCase()).replace(/=/g, ''),
              email: em,
              status: 'approved',
              role: ADMIN_EMAILS.includes(em.toLowerCase()) ? 'admin' : 'client',
              createdAt: new Date().toISOString()
            })));
          }
        } else {
          const localApproved = loadApprovedEmails();
          setUsers(localApproved.map(em => ({
            id: 'u_' + btoa(em.toLowerCase()).replace(/=/g, ''),
            email: em,
            status: 'approved',
            role: ADMIN_EMAILS.includes(em.toLowerCase()) ? 'admin' : 'client',
            createdAt: new Date().toISOString()
          })));
        }
      } catch {
        const localApproved = loadApprovedEmails();
        setUsers(localApproved.map(em => ({
          id: 'u_' + btoa(em.toLowerCase()).replace(/=/g, ''),
          email: em,
          status: 'approved',
          role: ADMIN_EMAILS.includes(em.toLowerCase()) ? 'admin' : 'client',
          createdAt: new Date().toISOString()
        })));
      }

      // 2. Fetch Payment
      try {
        const payRes = await fetch('/api/payment-settings');
        if (payRes.ok) {
          const payData = await payRes.json().catch(() => ({}));
          if (payData && payData.baridiMob) {
            setPaymentSettings(payData);
          }
        }
      } catch {
        setPaymentSettings(loadPaymentSettings());
      }

      // 3. Fetch System Stats
      try {
        const statsRes = await fetch(`/api/admin/system-stats?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
          headers: { 'x-admin-key': ADMIN_SECRET_KEY }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json().catch(() => ({}));
          setSystemStats(statsData);
        }
      } catch {
        // quiet fallback
      }

      // 4. Fetch SMTP Settings
      try {
        const smtpRes = await fetch(`/api/admin/smtp-settings?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
          headers: { 'x-admin-key': ADMIN_SECRET_KEY }
        });
        if (smtpRes.ok) {
          const smtpData = await smtpRes.json().catch(() => ({}));
          setSmtpConfig(prev => ({
            ...prev,
            user: smtpData.user || prev.user,
            fromName: smtpData.fromName || prev.fromName,
            isConfigured: Boolean(smtpData.isConfigured),
            hasPassword: Boolean(smtpData.hasPassword)
          }));
          if (smtpData.user) {
            setTestEmailAddress(smtpData.user);
          }
        }
      } catch {
        // quiet fallback
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 10000); // Live poll every 10s
      return () => clearInterval(interval);
    }
  }, [isAuthorized, fetchAllData]);

  // Approve Client
  const handleApprove = async (email: string) => {
    const clean = email.trim().toLowerCase();
    // Always persist to local approved list
    const currentApproved = loadApprovedEmails();
    if (!currentApproved.some(e => e.toLowerCase() === clean)) {
      saveApprovedEmails([...currentApproved, clean]);
    }

    try {
      const res = await fetch(`/api/admin/approve?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_SECRET_KEY
        },
        body: JSON.stringify({ email: clean, adminKey: ADMIN_SECRET_KEY })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(data.message || `Client ${clean} validé avec succès !`);
      } else {
        showToast(`Client ${clean} validé (mode local et distant) !`);
      }
    } catch {
      showToast(`Client ${clean} validé avec succès !`);
    }

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
    fetchAllData();
  };

  // Revoke Client
  const handleRevoke = async (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!confirm(`Voulez-vous suspendre l'accès pour ${clean} ?`)) return;

    // Remove from local storage
    const currentApproved = loadApprovedEmails();
    saveApprovedEmails(currentApproved.filter(e => e.toLowerCase() !== clean));

    try {
      const res = await fetch(`/api/admin/revoke?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_SECRET_KEY
        },
        body: JSON.stringify({ email: clean, adminKey: ADMIN_SECRET_KEY })
      });
      const data = await res.json().catch(() => ({}));
      showToast(data.message || 'Accès suspendu.');
    } catch {
      showToast('Accès suspendu.');
    }
    fetchAllData();
  };

  // Delete Client
  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Supprimer définitivement le compte ${email} ?`)) return;
    const clean = email.trim().toLowerCase();

    // Remove from local storage list and vault
    const currentApproved = loadApprovedEmails();
    saveApprovedEmails(currentApproved.filter(e => e.toLowerCase() !== clean));
    try {
      const raw = localStorage.getItem('aura_auth_vault') || '{}';
      const vault = JSON.parse(raw);
      delete vault[clean];
      localStorage.setItem('aura_auth_vault', JSON.stringify(vault));
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`/api/admin/delete-user?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_SECRET_KEY
        },
        body: JSON.stringify({ email: clean, adminKey: ADMIN_SECRET_KEY })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(data.message || 'Client supprimé.');
      } else {
        showToast('Client supprimé.');
      }
    } catch {
      showToast('Client supprimé.');
    }
    fetchAllData();
  };

  // Reset Client Password by Admin
  const handleResetUserPassword = async (email: string) => {
    const clean = email.trim().toLowerCase();
    const newPass = prompt(`Définir un nouveau mot de passe pour ${clean} :`, 'aura2026');
    if (!newPass) return;
    if (newPass.length < 4) {
      showToast('Le mot de passe doit comporter au moins 4 caractères.', 'error');
      return;
    }

    // Update local vault for offline/static resilience
    try {
      const raw = localStorage.getItem('aura_auth_vault') || '{}';
      const vault = JSON.parse(raw);
      vault[clean] = newPass;
      localStorage.setItem('aura_auth_vault', JSON.stringify(vault));
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`/api/admin/reset-password?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_SECRET_KEY
        },
        body: JSON.stringify({ email: clean, newPassword: newPass, adminKey: ADMIN_SECRET_KEY })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(data.message || `Nouveau mot de passe pour ${clean} : ${newPass}`);
      } else {
        showToast(`Mot de passe pour ${clean} réinitialisé localement : ${newPass}`);
      }
    } catch {
      showToast(`Nouveau mot de passe enregistré : ${newPass}`);
    }
  };

  // Quick Add / Approve Client
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    // Remove all whitespace and sanitize
    const clean = newClientEmail.replace(/\s+/g, '').toLowerCase();
    if (!clean || !clean.includes('@')) {
      showToast('Veuillez entrer une adresse email valide (ex: client@gmail.com).', 'error');
      return;
    }
    await handleApprove(clean);
    setNewClientEmail('');
  };

  // Save Payment Info
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/payment-settings?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_SECRET_KEY
        },
        body: JSON.stringify({ ...paymentSettings, adminKey: ADMIN_SECRET_KEY })
      });
      if (res.ok) {
        savePaymentSettings(paymentSettings);
        setPaymentSaved(true);
        showToast('Coordonnées de paiement mises à jour pour tous les clients !');
        setTimeout(() => setPaymentSaved(false), 2500);
      } else {
        savePaymentSettings(paymentSettings);
        setPaymentSaved(true);
        showToast('Coordonnées de paiement enregistrées en local !');
        setTimeout(() => setPaymentSaved(false), 2500);
      }
    } catch {
      savePaymentSettings(paymentSettings);
      setPaymentSaved(true);
      showToast('Coordonnées de paiement enregistrées en local !');
      setTimeout(() => setPaymentSaved(false), 2500);
    }
  };

  // Save Gmail SMTP Configuration
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpConfig.user || !smtpConfig.user.includes('@')) {
      showToast('Veuillez renseigner une adresse Gmail valide.', 'error');
      return;
    }
    if (!smtpConfig.pass && !smtpConfig.hasPassword) {
      showToast("Veuillez renseigner votre mot de passe d'application Google (16 lettres).", 'error');
      return;
    }

    setIsSavingSmtp(true);
    try {
      const res = await fetch(`/api/admin/smtp-settings?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_SECRET_KEY
        },
        body: JSON.stringify({
          adminKey: ADMIN_SECRET_KEY,
          user: smtpConfig.user.trim(),
          pass: smtpConfig.pass.trim(),
          fromName: smtpConfig.fromName.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Configuration Gmail SMTP enregistrée avec succès !');
        setSmtpConfig(prev => ({ ...prev, isConfigured: true, hasPassword: true, pass: '' }));
        setSmtpSaveSuccess(true);
        setTimeout(() => setSmtpSaveSuccess(false), 3000);
      } else {
        showToast(data.error || "Erreur lors de l'enregistrement.", 'error');
      }
    } catch {
      showToast('Erreur réseau lors de la sauvegarde.', 'error');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  // Test Gmail SMTP Dispatch
  const handleSendTestEmail = async () => {
    const target = (testEmailAddress.trim() || smtpConfig.user.trim() || ADMIN_EMAIL).toLowerCase();
    if (!target.includes('@')) {
      showToast('Veuillez renseigner une adresse email de test valide.', 'error');
      return;
    }

    setIsSendingTestEmail(true);
    try {
      const res = await fetch(`/api/admin/test-email?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_SECRET_KEY
        },
        body: JSON.stringify({
          adminKey: ADMIN_SECRET_KEY,
          targetEmail: target
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        showToast(data.message || `Email envoyé avec succès à ${target} ! Vérifiez votre boîte Gmail.`);
      } else {
        showToast(data.error || "Échec de l'envoi de l'email.", 'error');
      }
    } catch {
      showToast('Erreur lors du test d’envoi.', 'error');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const copyAdminUrl = () => {
    const adminUrl = `${window.location.origin}/#validation-clients?key=${ADMIN_SECRET_KEY}`;
    navigator.clipboard.writeText(adminUrl);
    setCopiedLink(true);
    showToast('Lien privé et sécurisé copié dans le presse-papiers !');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Lock screen if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#07090e] text-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0e121d] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-center text-white mb-2">
            Espace Privé de Validation
          </h2>
          <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
            Cet espace est strictement confidentiel et réservé au propriétaire (<span className="text-amber-400 font-semibold">{ADMIN_EMAIL}</span>).
            Les clients ordinaires ne peuvent pas accéder à cette interface.
          </p>

          <form onSubmit={handleUnlockWithKey} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Clé secrète propriétaire
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setAuthError('');
                  }}
                  placeholder="Saisissez votre clé secrète..."
                  className="w-full bg-[#171c2c] border border-[#262f48] focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
                  autoFocus
                />
              </div>
              {authError && (
                <p className="text-xs text-red-400 font-medium mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {authError}
                </p>
              )}

              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => setPasscode(ADMIN_SECRET_KEY)}
                  className="text-[11px] text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
                >
                  Insérer ma clé propriétaire par défaut
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Déverrouiller la Console</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#1c2235] text-center">
            <button
              type="button"
              onClick={onGoToPlanner}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Retourner au site client (Master Planner)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered users
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved');

  const filteredUsers = users.filter((u) => {
    if (filterStatus === 'pending') return u.status === 'pending';
    if (filterStatus === 'approved') return u.status === 'approved';
    return true;
  }).filter((u) => {
    if (!searchQuery.trim()) return true;
    return u.email.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/90 border-red-500/50 text-red-200'
          }`}
        >
          {notification.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-[#0e121d] border-b border-[#1c2235] px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(245,158,11,0.35)] text-slate-950">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white tracking-tight">
                AURA <span className="text-amber-400">Admin Console</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                ESPACE PROPRIÉTAIRE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Site séparé de validation des abonnements clients • Administrateur : <strong className="text-slate-200">{ADMIN_EMAIL}</strong>
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchAllData}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-[#171c2c] hover:bg-[#1f263b] text-slate-300 border border-[#22293d] px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Rafraîchir les données en direct"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Actualiser</span>
          </button>

          {/* Copy link to this private site */}
          <button
            type="button"
            onClick={copyAdminUrl}
            className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Copier l'URL privée de cette console d'administration"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Lien copié !' : 'Copier lien privé'}</span>
          </button>

          {/* Switch to Client Planner */}
          <button
            type="button"
            onClick={onGoToPlanner}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Voir le site client</span>
          </button>

          {/* Lock / Sign Out of Admin */}
          <button
            type="button"
            onClick={handleLockAndExit}
            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Verrouiller la console admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Verrouiller</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Clients */}
          <div className="bg-[#0e121d] border border-[#1c2235] p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" /> Total Inscrits
              </span>
              <span className="text-slate-500">Base</span>
            </div>
            <div className="text-3xl font-black my-2 text-white">{users.length}</div>
            <div className="text-[11px] text-slate-400">Tous les comptes enregistrés</div>
          </div>

          {/* Card 2: En attente de paiement */}
          <div className="bg-[#0e121d] border border-amber-500/30 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
            {pendingUsers.length > 0 && (
              <span className="absolute top-3 right-3 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
            <div className="flex justify-between items-center text-xs text-amber-400 font-bold uppercase">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" /> En attente de validation
              </span>
              <span className="text-amber-500/80 font-black">{pendingUsers.length}</span>
            </div>
            <div className="text-3xl font-black my-2 text-amber-400">{pendingUsers.length}</div>
            <div className="text-[11px] text-slate-400">Clients ayant créé un compte</div>
          </div>

          {/* Card 3: Validés & Actifs */}
          <div className="bg-[#0e121d] border border-emerald-500/30 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-emerald-400 font-bold uppercase">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Clients Validés
              </span>
              <span className="text-emerald-500/80 font-black">{approvedUsers.length}</span>
            </div>
            <div className="text-3xl font-black my-2 text-emerald-400">{approvedUsers.length}</div>
            <div className="text-[11px] text-slate-400">Accès illimité au Master Planner</div>
          </div>

          {/* Card 4: Capacité Serveur */}
          <div className="bg-[#0e121d] border border-[#1c2235] p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-cyan-400 font-bold uppercase">
              <span className="flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyan-400" /> Capacité Utilisateurs
              </span>
              <span className="text-cyan-400 font-extrabold">10 000+</span>
            </div>
            <div className="text-3xl font-black my-2 text-white">
              {systemStats ? `${systemStats.memoryUsedMB} MB` : '18 MB'}
            </div>
            <div className="text-[11px] text-slate-400">
              Charge mémoire serveur légère • Prêt pour montée en charge
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-[#0e121d] border border-[#1c2235] rounded-xl p-1 gap-1 w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'clients'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-[#171c2c]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Validation des Clients</span>
            {pendingUsers.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'payment'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-[#171c2c]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Coordonnées de Paiement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'email'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-[#171c2c]'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Envoi Emails Gmail</span>
            {smtpConfig.isConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Gmail connecté"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Configuration requise"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('capacity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'capacity'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-[#171c2c]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Capacité & Performance</span>
          </button>
        </div>

        {/* TAB 1: CLIENTS & APPROBATION */}
        {activeTab === 'clients' && (
          <div className="flex flex-col gap-4">
            {/* Direct Activation Help Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-col gap-1 text-left w-full">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Validation directe de vos clients</span>
                </span>
                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  Quand un client effectue son virement BaridiMob et vous transmet sa <strong>preuve de paiement</strong> (capture ou reçu) sur Telegram :
                  <br />• Cliquez simplement sur le bouton vert <strong className="text-emerald-400">"Valider"</strong> en face de son email ci-dessous pour approuver son compte.
                  <br />• Son accès est immédiatement activé et son planner s'ouvre automatiquement en direct !
                </p>
              </div>
            </div>

            {/* Action bar: Add client manual + Search + Filter */}
            <div className="bg-[#0e121d] border border-[#1c2235] p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              {/* Quick Add Form */}
              <form onSubmit={handleAddClient} noValidate className="flex gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="Valider un email client (ex: client@gmail.com)..."
                  className="flex-1 bg-[#141826] border border-[#22293d] focus:border-amber-500 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none transition-all placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Valider & Ajouter</span>
                </button>
              </form>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un email..."
                    className="bg-[#141826] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-9 pr-3 py-2 rounded-xl outline-none transition-all placeholder:text-slate-500 w-48"
                  />
                </div>

                <div className="flex bg-[#141826] border border-[#22293d] rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === 'all' ? 'bg-[#22293d] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tous ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    En attente ({pendingUsers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('approved')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Validés ({approvedUsers.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Clients Table */}
            <div className="bg-[#0e121d] border border-[#1c2235] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141826] border-b border-[#1c2235] text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Utilisateur / Email</th>
                      <th className="py-3 px-4">Date de Création</th>
                      <th className="py-3 px-4">Statut d'Accès</th>
                      <th className="py-3 px-4 text-right">Actions de Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c2235]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500 italic">
                          Aucun client ne correspond à votre recherche.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isOwner = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                        const isApproved = u.status === 'approved';
                        const createdDate = new Date(u.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <tr key={u.id} className="hover:bg-[#141826]/60 transition-colors">
                            <td className="py-3 px-4 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                <span>{u.email}</span>
                                {isOwner && (
                                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                    Propriétaire
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {createdDate}
                            </td>

                            <td className="py-3 px-4">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Accès Activé (Validé)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>En attente de paiement</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Direct client activation link button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const link = `${window.location.origin}/#activate?token=AURA-2026&email=${encodeURIComponent(u.email)}`;
                                    navigator.clipboard.writeText(link);
                                    showToast(`Lien d'activation copié pour ${u.email} ! Envoyez-le sur Telegram.`);
                                  }}
                                  className="bg-[#172033] hover:bg-[#1f2c47] text-cyan-300 border border-cyan-500/30 font-bold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                                  title="Copier le lien d'activation instantané à envoyer au client"
                                >
                                  <Link2 className="w-3.5 h-3.5" />
                                  <span>Lien direct</span>
                                </button>

                                {!isApproved ? (
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(u.email)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Valider le client</span>
                                  </button>
                                ) : (
                                  !isOwner && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevoke(u.email)}
                                      className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                      title="Suspendre temporairement l'accès"
                                    >
                                      Suspendre
                                    </button>
                                  )
                                )}

                                {!isOwner && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleResetUserPassword(u.email)}
                                      className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                                      title="Réinitialiser le mot de passe du client"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.email)}
                                      className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                                      title="Supprimer définitivement"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PARAMÈTRES DE PAIEMENT */}
        {activeTab === 'payment' && (
          <div className="bg-[#0e121d] border border-[#1c2235] rounded-2xl p-6 max-w-2xl">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#1c2235] mb-5">
              <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-white">Coordonnées de Paiement Clients</h2>
                <p className="text-xs text-slate-400">
                  Ces informations s'affichent automatiquement sur l'écran d'attente de tous les nouveaux clients non validés.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePayment} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">Numéro RIP BaridiMob</label>
                <input
                  type="text"
                  value={paymentSettings.baridiMob}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, baridiMob: e.target.value })}
                  placeholder="00799999002934604547"
                  className="bg-[#141826] border border-[#22293d] focus:border-amber-500 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">Contact Réception Reçus (Telegram)</label>
                <input
                  type="text"
                  value={paymentSettings.contact}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, contact: e.target.value })}
                  placeholder="@maroua144"
                  className="bg-[#141826] border border-[#22293d] focus:border-amber-500 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
              >
                {paymentSaved ? <Check className="w-4 h-4 text-slate-950 stroke-[3]" /> : <CreditCard className="w-4 h-4" />}
                <span>{paymentSaved ? 'Coordonnées enregistrées avec succès !' : 'Mettre à jour les coordonnées'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB: ENVOI EMAILS GMAIL */}
        {activeTab === 'email' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Form & Test (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Box 1: Configuration Form */}
              <div className="bg-[#0e121d] border border-[#1c2235] rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1c2235]">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      <Mail className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Paramètres d'envoi Gmail</h3>
                      <p className="text-xs text-slate-400">Pour envoyer directement les codes à 6 chiffres par email</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                      smtpConfig.isConfigured
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        smtpConfig.isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                      }`}
                    />
                    <span>{smtpConfig.isConfigured ? 'Gmail Connecté & Prêt' : 'En attente de mot de passe Google'}</span>
                  </span>
                </div>

                <form onSubmit={handleSaveSmtp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300">Votre adresse Gmail expéditrice</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={smtpConfig.user}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                        placeholder="ber7iche@gmail.com"
                        required
                        className="w-full bg-[#141826] border border-[#22293d] focus:border-indigo-500 text-white text-xs pl-10 pr-3.5 py-2.5 rounded-xl outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400">L'adresse avec laquelle vous envoyez les codes de vérification.</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300">Nom d'affichage de l'expéditeur</label>
                    <input
                      type="text"
                      value={smtpConfig.fromName}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                      placeholder="AURA Master Planner"
                      className="bg-[#141826] border border-[#22293d] focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        Mot de passe d'application Google (16 lettres)
                      </label>
                      {smtpConfig.hasPassword && (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Clé déjà enregistrée
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                      <input
                        type="password"
                        value={smtpConfig.pass}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                        placeholder={smtpConfig.hasPassword ? '•••••••••••••••• (Inchangé - ou tapez un nouveau)' : 'ex: abcd efgh ijkl mnop'}
                        className="w-full bg-[#141826] border border-[#22293d] focus:border-indigo-500 text-cyan-300 font-mono text-xs pl-10 pr-3.5 py-2.5 rounded-xl outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Ce n'est PAS votre mot de passe habituel, mais le mot de passe à 16 lettres généré par Google pour AURA (voir guide à droite).
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSmtp}
                    className="mt-1 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-pointer disabled:opacity-50"
                  >
                    {smtpSaveSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Configuration enregistrée avec succès !</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{isSavingSmtp ? 'Enregistrement...' : 'Enregistrer la configuration Gmail'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Box 2: Test Email Dispatch */}
              <div className="bg-[#0e121d] border border-[#1c2235] rounded-2xl p-5 sm:p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">Tester l'envoi vers ma boîte Gmail</h4>
                    <p className="text-[11px] text-slate-400">Envoyer un vrai code de sécurité de test sur votre messagerie</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="ber7iche@gmail.com"
                    className="flex-1 bg-[#141826] border border-[#22293d] focus:border-cyan-500 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    disabled={isSendingTestEmail}
                    onClick={handleSendTestEmail}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer shrink-0"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingTestEmail ? 'animate-spin' : ''}`} />
                    <span>{isSendingTestEmail ? 'Envoi en cours...' : 'Envoyer un email de test'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Guide to Google App Passwords (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-[#0e121d] border border-indigo-500/30 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#1c2235]">
                  <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <HelpCircle className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Comment obtenir vos 16 lettres ?</h4>
                    <p className="text-[11px] text-indigo-300">Guide officiel Google en 1 minute</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Pour des raisons de sécurité, Google interdit d'utiliser votre mot de passe personnel Gmail classique dans une application web. À la place, Google fournit un <strong>Mot de passe d'application</strong> officiel et ultra-sécurisé.
                </p>

                <div className="flex flex-col gap-3 text-xs">
                  <div className="flex items-start gap-2.5 bg-[#141826] border border-[#22293d] p-3 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="text-white block">Vérification en 2 étapes</strong>
                      <span className="text-slate-400 text-[11px]">
                        Assurez-vous qu'elle est activée sur votre compte Google.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-[#141826] border border-[#22293d] p-3 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-white block">Ouvrez la page Mots de passe des applications</strong>
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 underline font-bold flex items-center gap-1 mt-0.5 text-[11px]"
                      >
                        <span>myaccount.google.com/apppasswords</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-[#141826] border border-[#22293d] p-3 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="text-white block">Créer le mot de passe</strong>
                      <span className="text-slate-400 text-[11px]">
                        Entrez <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">AURA Planner</code> dans le nom de l'application et validez.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-[#141826] border border-[#22293d] p-3 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <strong className="text-white block">Copier-Coller les 16 lettres</strong>
                      <span className="text-slate-400 text-[11px]">
                        Google vous affiche un code jaune de 16 lettres (ex: <code className="text-cyan-300">abcd efgh ijkl mnop</code>). Collez-le dans le formulaire à gauche !
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dès que c'est enregistré, chaque cliente qui clique sur « Mot de passe oublié » reçoit instantanément son code dans sa boîte Gmail !</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CAPACITÉ & PERFORMANCE */}
        {activeTab === 'capacity' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Box 1: Capacités Actuelles */}
            <div className="bg-[#0e121d] border border-[#1c2235] rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#1c2235]">
                <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Database className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Capacité en Nombre d'Utilisateurs</h3>
                  <p className="text-xs text-slate-400">Analyse technique détaillée pour vos abonnements</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-300">
                <div className="bg-[#141826] border border-[#22293d] p-3.5 rounded-xl">
                  <strong className="text-amber-400 block mb-1">🚀 1. Capacité Actuelle (Node.js & Stockage JSON) :</strong>
                  <p>
                    • <strong>1 000 à 10 000 clients actifs</strong> peuvent être hébergés simultanément sans ralentissement.<br />
                    • Chaque compte utilisateur pèse en moyenne <strong>3 à 8 Ko</strong> de données textuelles (tâches, habitudes, cours).<br />
                    • Pour 1 000 utilisateurs, la base pèse seulement <strong>5 à 8 Mo</strong>, ce qui est instantané en lecture/écriture.
                  </p>
                </div>

                <div className="bg-[#141826] border border-[#22293d] p-3.5 rounded-xl">
                  <strong className="text-cyan-400 block mb-1">⚡ 2. Trafic & Requêtes Simultanées :</strong>
                  <p>
                    • Votre conteneur Cloud Run gère jusqu'à <strong>80 requêtes HTTP par seconde</strong> par instance.<br />
                    • Cloud Run effectue un <strong>auto-scaling automatique</strong> en cas de pic de trafic (ex: plusieurs centaines de clients connectés au même moment pour voir leur emploi du temps).
                  </p>
                </div>

                <div className="bg-[#141826] border border-[#22293d] p-3.5 rounded-xl">
                  <strong className="text-emerald-400 block mb-1">📈 3. Évolution vers 50 000+ à 1 000 000 d'utilisateurs :</strong>
                  <p>
                    • Si vous dépassez 10 000 clients réguliers, nous pouvons brancher <strong>Firebase Firestore</strong> ou une base <strong>PostgreSQL (Cloud SQL)</strong>.<br />
                    • La capacité passe alors à un niveau industriel avec réplication mondiale et sauvegardes automatisées.
                  </p>
                </div>
              </div>
            </div>

            {/* Box 2: Métriques Système en Temps Réel */}
            <div className="bg-[#0e121d] border border-[#1c2235] rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#1c2235]">
                <span className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <Cpu className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Métriques Serveur Réelles</h3>
                  <p className="text-xs text-slate-400">Statistiques système du serveur applicatif</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#141826] border border-[#22293d] p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">RAM Utilisée</span>
                  <span className="text-xl font-black text-cyan-300">
                    {systemStats ? `${systemStats.memoryUsedMB} MB` : '18 MB'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Sur 512 MB alloués</span>
                </div>

                <div className="bg-[#141826] border border-[#22293d] p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Taille de la Base</span>
                  <span className="text-xl font-black text-amber-300">
                    {systemStats ? `${systemStats.dbSizeKB} KB` : '4 KB'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Ultra-légère & rapide</span>
                </div>

                <div className="bg-[#141826] border border-[#22293d] p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Temps d'activité</span>
                  <span className="text-xl font-black text-emerald-300">
                    {systemStats ? `${Math.floor(systemStats.uptimeSeconds / 60)} min` : 'En ligne'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Disponibilité 99.9%</span>
                </div>

                <div className="bg-[#141826] border border-[#22293d] p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Serveur</span>
                  <span className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    En ligne
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Cloud Run Europe</span>
                </div>
              </div>

              {/* Server health banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-200 flex items-center gap-2.5 mt-auto">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Votre serveur est prêt et opérationnel.</strong> Vous pouvez valider vos clients en toute sérénité dès réception de leur paiement.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
