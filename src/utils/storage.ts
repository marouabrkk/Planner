import confetti from 'canvas-confetti';
import { User, UserData, PaymentSettings } from '../types';

export const ADMIN_EMAIL = 'ber7iche@gmail.com';
export const ADMIN_EMAILS = [
  'ber7iche@gmail.com',
  'maroua144@gmail.com'
];

export const DEFAULT_APPROVED_EMAILS: string[] = [
  'ber7iche@gmail.com',
  'maroua144@gmail.com'
];

export const DEFAULT_AUTH_VAULT: Record<string, string> = {
  'ber7iche@gmail.com': 'Nounoussa7',
  'maroua144@gmail.com': 'Nounoussa7'
};

export function getAuthVault(): Record<string, string> {
  try {
    const raw = localStorage.getItem('aura_auth_vault');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AUTH_VAULT, ...parsed };
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_AUTH_VAULT };
}

export function saveAuthVaultPassword(email: string, pass: string): void {
  try {
    const vault = getAuthVault();
    vault[email.trim().toLowerCase()] = pass;
    localStorage.setItem('aura_auth_vault', JSON.stringify(vault));
  } catch (e) {
    console.error('Failed to save password in vault', e);
  }
}

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean);
}

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
      {
        id: 1,
        title: 'Cardiologie & Syndrome Coronaire',
        status: 'doing',
        color: '#6366f1',
        couches: { c1: true, c1Date: today, c2: true, c2Date: today, c3: false },
        qcms: [
          {
            id: 'demo_qcm_1',
            question: "Concernant l'Infarctus du Myocarde avec sus-décalage de ST (STEMI), quel est le délai maximal recommandé pour l'angioplastie primaire ?",
            options: [
              "A. Moins de 120 minutes après le premier contact médical",
              "B. Moins de 6 heures après le début de la douleur",
              "C. Moins de 24 heures si le patient est stable",
              "D. Uniquement après résultat du dosage des troponines"
            ],
            correctIndexes: [0],
            explanation: "L'angioplastie primaire doit être effectuée dans un délai de 120 minutes suivant le premier contact médical (recommandations ESC).",
            source: "Résidanat - Cardiologie",
            userSelected: [0],
            validated: true,
            isCorrect: true
          },
          {
            id: 'demo_qcm_2',
            question: "Parmi les médicaments suivants, lesquels réduisent la mortalité dans l'insuffisance cardiaque à fraction d'éjection réduite (IC-FEr) ? (Choix multiples)",
            options: [
              "A. Bêta-bloquants (ex: Bisoprolol)",
              "B. Inhibiteurs de l'ECA ou ARA II / Sacubitril-Valsartan",
              "C. Antagonistes des récepteurs des minéralocorticoïdes (ex: Spironolactone)",
              "D. Inhibiteurs des SGLT2 (Dapagliflozine/Empagliflozine)",
              "E. Inhibiteurs calciques bradycardisants isolés"
            ],
            correctIndexes: [0, 1, 2, 3],
            explanation: "Les 4 piliers majeurs de l'IC-FEr sont : Bêta-bloquant + IEC/ARNI + ARM + iSGLT2.",
            source: "Concours & Recommandations",
            userSelected: [],
            validated: false
          }
        ]
      },
      {
        id: 2,
        title: 'Neurologie & AVC Ischémique',
        status: 'doing',
        color: '#06b6d4',
        couches: { c1: true, c1Date: today, c2: false, c3: false },
        qcms: [
          {
            id: 'demo_qcm_3',
            question: "Quel est l'examen d'imagerie de référence en urgence devant une suspicion d'AVC aigu ?",
            options: [
              "A. Scanner cérébral sans injection de contraste",
              "B. IRM cérébrale en séquence de Diffusion et FLAIR",
              "C. Ponction lombaire immédiate",
              "D. Doppler transcrânien seul"
            ],
            correctIndexes: [1],
            explanation: "L'IRM cérébrale avec séquence de diffusion est l'examen de choix précoce pour visualiser l'ischémie dès les premières minutes.",
            source: "Urgences & Neurologie",
            userSelected: [],
            validated: false
          }
        ]
      },
      {
        id: 3,
        title: 'Pharmacologie & Antibiothérapie',
        status: 'done',
        color: '#10b981',
        couches: { c1: true, c1Date: today, c2: true, c2Date: today, c3: true, c3Date: today },
        qcms: [
          {
            id: 'demo_qcm_4',
            question: "Concernant la toxicité des Aminosides (ex: Gentamicine), quels sont les deux principaux effets indésirables à surveiller ?",
            options: [
              "A. Hépatotoxicité et pancréatite",
              "B. Néphrotoxicité et ototoxicité cochléovestibulaire",
              "C. Hyperkaliémie et torsades de pointes",
              "D. Fibrose pulmonaire et neuropathie périphérique"
            ],
            correctIndexes: [1],
            explanation: "Les aminosides sont caractérisés par leur néphrotoxicité tubulaire aiguë et leur ototoxicité vestibulaire et auditive souvent irréversible.",
            source: "Pharmaco Clinique",
            userSelected: [1],
            validated: true,
            isCorrect: true
          }
        ]
      }
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
        const set = new Set([
          ...DEFAULT_APPROVED_EMAILS.map(e => e.toLowerCase()),
          ...parsed.map((e: string) => (typeof e === 'string' ? e.toLowerCase() : ''))
        ]);
        set.delete('');
        return Array.from(set);
      }
    }
  } catch (e) {
    console.error('Failed to load approved emails', e);
  }
  return [...DEFAULT_APPROVED_EMAILS];
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

export interface RegisteredUserRecord {
  email: string;
  status: 'pending' | 'approved';
  createdAt: string;
}

export function savePendingRegistration(email: string): void {
  try {
    const clean = email.trim().toLowerCase();
    const raw = localStorage.getItem('aura_registered_users');
    const existing: RegisteredUserRecord[] = raw ? JSON.parse(raw) : [];
    const index = existing.findIndex(u => u.email.toLowerCase() === clean);
    if (index >= 0) {
      existing[index].status = existing[index].status || 'pending';
    } else {
      existing.push({
        email: clean,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
    localStorage.setItem('aura_registered_users', JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save pending registration', e);
  }
}

export function loadPendingRegistrations(): RegisteredUserRecord[] {
  try {
    const raw = localStorage.getItem('aura_registered_users');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load pending registrations', e);
  }
  return [];
}

export function markRegistrationApprovedLocally(email: string): void {
  try {
    const clean = email.trim().toLowerCase();
    const raw = localStorage.getItem('aura_registered_users');
    const existing: RegisteredUserRecord[] = raw ? JSON.parse(raw) : [];
    const updated = existing.map(u => u.email.toLowerCase() === clean ? { ...u, status: 'approved' as const } : u);
    if (!updated.some(u => u.email.toLowerCase() === clean)) {
      updated.push({
        email: clean,
        status: 'approved',
        createdAt: new Date().toISOString()
      });
    }
    localStorage.setItem('aura_registered_users', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update registration status', e);
  }
}
