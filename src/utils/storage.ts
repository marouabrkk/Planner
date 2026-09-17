import confetti from 'canvas-confetti';
import { User, UserData, PaymentSettings } from '../types';

export const ADMIN_EMAIL = 'ber7iche@gmail.com';

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  baridiMob: '00799999002934604547',
  ccp: '',
  contact: '@maroua144 (Telegram)'
};

export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function triggerCelebration(): void {
  try {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#6366f1', '#06b6d4', '#f59e0b', '#10b981']
    });
  } catch {
    // Canvas confetti gracefully fails if canvas is not supported
  }
}

export function getInitialUserData(): UserData {
  const today = getTodayStr();
  return {
    tasks: [
      { id: 1, title: 'Bienvenue sur votre espace AURA !', done: false, date: today },
      { id: 2, title: 'Compléter votre première habitude 🔥', done: false, date: today }
    ],
    courses: [
      { id: 1, title: 'Mathématiques & Analyse', status: 'doing', color: '#6366f1' },
      { id: 2, title: 'Informatique & Algorithmique', status: 'todo', color: '#06b6d4' },
      { id: 3, title: 'Anglais & Communication', status: 'done', color: '#10b981' }
    ],
    habits: [
      { id: 1, title: "Boire 2L d'eau 💧", doneToday: false, streak: 3 },
      { id: 2, title: '30 min de lecture ou révision 📖', doneToday: false, streak: 1 },
      { id: 3, title: 'Séance de sport / Marche 🏃', doneToday: false, streak: 2 }
    ],
    monthEvents: {}
  };
}

export function loadApprovedEmails(): string[] {
  try {
    const raw = localStorage.getItem('aura_approved_list');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (!parsed.some(e => e.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
          parsed.push(ADMIN_EMAIL);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load approved emails', e);
  }
  return [ADMIN_EMAIL];
}

export function saveApprovedEmails(list: string[]): void {
  try {
    localStorage.setItem('aura_approved_list', JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save approved emails', e);
  }
}

export function loadUserData(userId: string): UserData {
  try {
    const raw = localStorage.getItem(`aura_data_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tasks: parsed.tasks || [],
        courses: parsed.courses || [],
        habits: parsed.habits || [],
        monthEvents: parsed.monthEvents || {}
      };
    }
  } catch (e) {
    console.error('Failed to parse user data', e);
  }
  return getInitialUserData();
}

export function saveUserData(userId: string, data: UserData): void {
  try {
    localStorage.setItem(`aura_data_${userId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save user data', e);
  }
}

export function loadPaymentSettings(): PaymentSettings {
  try {
    const raw = localStorage.getItem('aura_payment_settings');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return DEFAULT_PAYMENT_SETTINGS;
}

export function savePaymentSettings(settings: PaymentSettings): void {
  try {
    localStorage.setItem('aura_payment_settings', JSON.stringify(settings));
  } catch {
    // fallback
  }
}
