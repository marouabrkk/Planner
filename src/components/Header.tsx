import React from 'react';
import { Sparkles, Calendar, BarChart3, Target, LogOut, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { ADMIN_EMAIL } from '../utils/storage';

interface HeaderProps {
  currentUser: User | null;
  selectedMonth: number;
  selectedYear: number;
  activeTab: 'focus' | 'week' | 'month';
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onTabChange: (tab: 'focus' | 'week' | 'month') => void;
  onLogout: () => void;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  selectedMonth,
  selectedYear,
  activeTab,
  onMonthChange,
  onYearChange,
  onTabChange,
  onLogout
}) => {
  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#22293d]">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] text-white">
          ⚡
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              AURA <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Master Planner</span>
            </h1>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Connecté : <strong className="text-slate-200">{currentUser?.email || 'Invité'}</strong></span>
          </div>
        </div>
      </div>

      {/* Controls & Nav */}
      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        {/* Date Selectors */}
        <div className="flex items-center gap-1.5 bg-[#111522] border border-[#22293d] rounded-xl p-1 shadow-sm">
          <select
            aria-label="Sélectionner le mois"
            value={selectedMonth}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="bg-transparent text-slate-200 text-xs font-semibold px-2 py-1.5 rounded-lg outline-none cursor-pointer hover:text-white"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx} className="bg-[#111522] text-white">
                {m}
              </option>
            ))}
          </select>
          <span className="text-slate-600">/</span>
          <select
            aria-label="Sélectionner l'année"
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="bg-transparent text-slate-200 text-xs font-semibold px-2 py-1.5 rounded-lg outline-none cursor-pointer hover:text-white"
          >
            {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
              <option key={y} value={y} className="bg-[#111522] text-white">
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* View Tabs */}
        <div className="flex bg-[#111522] border border-[#22293d] rounded-xl p-1 gap-1 shadow-sm">
          <button
            type="button"
            onClick={() => onTabChange('focus')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'focus'
                ? 'bg-indigo-600 text-white shadow-[0_0_14px_rgba(99,102,241,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#171c2c]'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Focus (3 Colonnes)</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'week'
                ? 'bg-indigo-600 text-white shadow-[0_0_14px_rgba(99,102,241,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#171c2c]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Semaine & Diagramme</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'month'
                ? 'bg-indigo-600 text-white shadow-[0_0_14px_rgba(99,102,241,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#171c2c]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Vue Mois</span>
          </button>
        </div>

        {/* Admin Portal Shortcut if logged in as admin email */}
        {currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#validation-clients?key=ber7iche-aura-2026';
            }}
            className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer"
            title="Accéder à l'espace privé de validation"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Espace Privé</span>
          </button>
        )}

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          title="Se déconnecter"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </header>
  );
};
