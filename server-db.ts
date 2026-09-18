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

const isVercel = Boolean(process.env.VERCEL);
const DB_FILE = isVercel ? path.join('/tmp', 'database.json') : path.join(process.cwd(), 'database.json');
export const ADMIN_EMAIL = 'ber7iche@gmail.com';
export const ADMIN_EMAILS = [
  'ber7iche@gmail.com',
  'maroua144@gmail.com',
  'marouaberkiche77@gmail.com',
  'berkichemaroua@gmail.com'
];

export function isOwnerEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean);
}

const DEFAULT_DB: DatabaseSchema = {
  users: [
    {
      id: 'admin_owner',
      email: ADMIN_EMAIL,
      status: 'approved',
      role: 'admin',
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
    if (!fs.existsSync(DB_FILE)) {
      const rootDbFile = path.join(process.cwd(), 'database.json');
      if (isVercel && fs.existsSync(rootDbFile)) {
        try {
          const rootData = fs.readFileSync(rootDbFile, 'utf-8');
          const parsed = JSON.parse(rootData);
          writeDb(parsed);
          return parsed;
        } catch {
          // fallback
        }
      }
      writeDb(DEFAULT_DB);
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed: DatabaseSchema = JSON.parse(data);

    // Ensure admins are always present and approved
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
