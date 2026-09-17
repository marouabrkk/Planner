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

export interface DatabaseSchema {
  users: StoredUser[];
  paymentSettings: PaymentConfig;
  userData: Record<string, any>;
}

const DB_FILE = path.join(process.cwd(), 'database.json');
export const ADMIN_EMAIL = 'ber7iche@gmail.com';

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
  userData: {}
};

export function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(DEFAULT_DB);
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed: DatabaseSchema = JSON.parse(data);

    // Ensure admin is always present and approved
    if (!parsed.users.some(u => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
      parsed.users.unshift({
        id: 'admin_owner',
        email: ADMIN_EMAIL,
        status: 'approved',
        role: 'admin',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      });
      writeDb(parsed);
    }
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
