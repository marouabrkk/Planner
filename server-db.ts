import fs from 'fs';
import path from 'path';

export interface StoredUser {
  id: string;
  email: string;
  password?: string;
  status: 'approved' | 'pending';
  role: 'admin' | 'client';
  createdAt: string;
  approvedAt?: string;
}

export interface PaymentConfig {
  baridiMob: string;
  ccp: string;
  contact: string;
}

export interface SmtpConfig {
  user: string;
  pass: string;
  fromName?: string;
  service?: string;
  updatedAt?: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  paymentSettings: PaymentConfig;
  smtpSettings?: SmtpConfig;
  userData: Record<string, any>;
}

export const ADMIN_EMAIL = 'ber7iche@gmail.com';
export const ADMIN_EMAILS = [
  'ber7iche@gmail.com',
  'maroua144@gmail.com'
];

// Liste des comptes clients pré-approuvés
export const PRE_APPROVED_CLIENTS = [
  'hakimaberkiche@gmail.com',
  'marouaberkiche77@gmail.com'
];

export function isOwnerEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean);
}

const isVercel = Boolean(process.env.VERCEL);
const DB_FILE = isVercel ? path.join('/tmp', 'database.json') : path.join(process.cwd(), 'database.json');

const DEFAULT_DB: DatabaseSchema = {
  users: [
    {
      id: 'admin_owner',
      email: ADMIN_EMAIL,
      password: 'Nounoussa7',
      status: 'approved',
      role: 'admin',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    },
    {
      id: 'admin_maroua',
      email: 'maroua144@gmail.com',
      password: 'Nounoussa7',
      status: 'approved',
      role: 'admin',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    },
    {
      id: 'u_hakima',
      email: 'hakimaberkiche@gmail.com',
      status: 'approved',
      role: 'client',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    }
  ],
  paymentSettings: {
    baridiMob: '00799999002934604547',
    ccp: '',
    contact: '@maroua144 (Telegram)'
  },
  smtpSettings: {
    user: 'ber7iche@gmail.com',
    pass: 'xbkwqnjystzdibnc',
    fromName: 'AURA Master Planner',
    service: 'gmail',
    updatedAt: new Date().toISOString()
  },
  userData: {}
};

export function readDb(): DatabaseSchema {
  try {
    let parsed: DatabaseSchema;
    if (!fs.existsSync(DB_FILE)) {
      writeDb(DEFAULT_DB);
      parsed = DEFAULT_DB;
    } else {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      parsed = JSON.parse(data);
    }

    // S'assurer que les administrateurs sont toujours présents et approuvés
    ADMIN_EMAILS.forEach((adm) => {
      const existing = parsed.users.find(u => u.email.toLowerCase() === adm.toLowerCase());
      if (!existing) {
        parsed.users.push({
          id: 'admin_' + Buffer.from(adm).toString('base64').replace(/=/g, ''),
          email: adm,
          status: 'approved',
          role: 'admin',
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString()
        });
      } else {
        existing.status = 'approved';
        existing.role = 'admin';
      }
    });

    // S'assurer que les clients pré-approuvés sont bien approuvés
    PRE_APPROVED_CLIENTS.forEach((client) => {
      const existing = parsed.users.find(u => u.email.toLowerCase() === client.toLowerCase());
      if (!existing) {
        parsed.users.push({
          id: 'u_' + Buffer.from(client).toString('base64').replace(/=/g, ''),
          email: client,
          status: 'approved',
          role: 'client',
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString()
        });
      } else {
        existing.status = 'approved';
      }
    });

    return parsed;
  } catch (err) {
    console.error('Error reading database:', err);
    return DEFAULT_DB;
  }
}

export function writeDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database:', err);
  }
}
