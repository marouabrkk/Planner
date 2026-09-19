import fs from 'fs';
import path from 'path';

export const ADMIN_EMAIL = 'ber7iche@gmail.com';
export const ADMIN_EMAILS = ['ber7iche@gmail.com', 'maroua144@gmail.com'];

export function isOwnerEmail(email: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// CONNEXION SUPABASE OFFICIELLE AVEC VOTRE CLÉ
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tflqmnmdhkxihlywekqs.supabase.co';
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_rN0ms_ZMSU-L0OXTE4mAUQ_sBMnhAa9';

// Récupérer un utilisateur dans Supabase
export async function supabaseGetUser(email: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      return data && data.length > 0 ? data[0] : null;
    }
  } catch (err) {
    console.error('Erreur Supabase:', err);
  }
  return null;
}

// Créer ou enregistrer un client dans Supabase avec SON PROPRE mot de passe
export async function supabaseSaveUser(user: { id: string; email: string; password?: string; status: string; role: string }) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: user.id,
        email: user.email.toLowerCase(),
        password: user.password || '',
        status: user.status,
        role: user.role,
        created_at: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error('Erreur sauvegarde Supabase:', err);
  }
}

// Valider un client dans Supabase
export async function supabaseApproveUser(email: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase())}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error('Erreur approbation Supabase:', err);
  }
}

// Récupérer tous les utilisateurs pour votre Console Admin
export async function supabaseGetAllUsers() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Erreur liste Supabase:', err);
  }
  return [];
}

// Réinitialiser le mot de passe dans Supabase
export async function supabaseUpdatePassword(email: string, newPass: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase())}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: newPass
      })
    });
  } catch (err) {
    console.error('Erreur MAJ mot de passe Supabase:', err);
  }
}

// Système de secours local
const isVercel = Boolean(process.env.VERCEL);
const DB_FILE = isVercel ? path.join('/tmp', 'database.json') : path.join(process.cwd(), 'database.json');

export function readDb(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch {}
  return { users: [], paymentSettings: { baridiMob: '00799999002934604547', ccp: '', contact: '@maroua144 (Telegram)' }, userData: {} };
}

export function writeDb(data: any): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}
