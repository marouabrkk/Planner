import fs from 'fs';
import path from 'path';

export const ADMIN_EMAIL = 'ber7iche@gmail.com';
export const ADMIN_EMAILS = ['ber7iche@gmail.com', 'maroua144@gmail.com'];

export function isOwnerEmail(email: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// CONNEXION SUPABASE OFFICIELLE
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tflqmnmdhkxihlywekqs.supabase.co';
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_secret_rN0ms_ZMSU-L0OXTE4mAUQ_sBMnhAa9';

// En-têtes officiels Supabase PostgREST (Ne JAMAIS envoyer Authorization: Bearer avec une clé sb_secret_)
function getSupabaseHeaders(upsert = false) {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json'
  };
  if (upsert) {
    headers['Prefer'] = 'resolution=merge-duplicates';
  }
  return headers;
}

// Stockage local
const isVercel = Boolean(process.env.VERCEL);
const DB_FILE = isVercel ? path.join('/tmp', 'database.json') : path.join(process.cwd(), 'database.json');

export function readDb(): any {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const rootDb = path.join(process.cwd(), 'database.json');
      if (fs.existsSync(rootDb)) {
        const rootContent = fs.readFileSync(rootDb, 'utf-8');
        try {
          fs.writeFileSync(DB_FILE, rootContent, 'utf-8');
          return JSON.parse(rootContent);
        } catch {}
      }
    } else {
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

// Récupérer un utilisateur dans Supabase
export async function supabaseGetUser(email: string) {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}&select=*`, {
      headers: getSupabaseHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    } else {
      console.error('Erreur Supabase lecture:', res.status);
    }
  } catch (err) {
    console.error('Erreur connexion Supabase:', err);
  }

  // Repli base locale
  const db = readDb();
  const localUser = (db.users || []).find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);
  return localUser || null;
}

// Sauvegarder ou mettre à jour un client (UPSERT dans Supabase)
export async function supabaseSaveUser(user: { id: string; email: string; password?: string; status: string; role: string }) {
  const cleanEmail = user.email.trim().toLowerCase();

  const db = readDb();
  if (!db.users) db.users = [];
  const existingIdx = db.users.findIndex((u: any) => u.email && u.email.toLowerCase() === cleanEmail);
  const updatedUser = {
    id: user.id || 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
    email: cleanEmail,
    password: user.password || (existingIdx >= 0 ? db.users[existingIdx].password : ''),
    status: user.status || 'pending',
    role: user.role || 'client',
    createdAt: existingIdx >= 0 && db.users[existingIdx].createdAt ? db.users[existingIdx].createdAt : new Date().toISOString(),
    approvedAt: user.status === 'approved' ? new Date().toISOString() : (existingIdx >= 0 ? db.users[existingIdx].approvedAt : undefined)
  };

  if (existingIdx >= 0) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...updatedUser };
  } else {
    db.users.push(updatedUser);
  }
  writeDb(db);

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: getSupabaseHeaders(true),
      body: JSON.stringify({
        id: updatedUser.id,
        email: cleanEmail,
        password: updatedUser.password || '',
        status: updatedUser.status,
        role: updatedUser.role,
        created_at: updatedUser.createdAt,
        approved_at: updatedUser.approvedAt || null
      })
    });
  } catch (err) {
    console.error('Erreur sauvegarde Supabase:', err);
  }

  return updatedUser;
}

// Valider un client (UPSERT direct : insère ou met à jour le statut en approved)
export async function supabaseApproveUser(email: string) {
  const cleanEmail = email.trim().toLowerCase();

  const db = readDb();
  if (!db.users) db.users = [];
  const existing = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);
  if (existing) {
    existing.status = 'approved';
    existing.approvedAt = new Date().toISOString();
  } else {
    db.users.push({
      id: 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
      email: cleanEmail,
      status: 'approved',
      role: isOwnerEmail(cleanEmail) ? 'admin' : 'client',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    });
  }
  writeDb(db);

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: getSupabaseHeaders(true),
      body: JSON.stringify({
        id: 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
        email: cleanEmail,
        status: 'approved',
        role: isOwnerEmail(cleanEmail) ? 'admin' : 'client',
        approved_at: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error('Erreur approbation Supabase:', err);
  }
}

// Récupérer tous les utilisateurs
export async function supabaseGetAllUsers() {
  const db = readDb();
  const localUsers: any[] = db.users || [];
  const map = new Map<string, any>();

  localUsers.forEach(u => {
    if (u.email) map.set(u.email.toLowerCase(), u);
  });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&order=created_at.desc`, {
      headers: getSupabaseHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach(u => {
          if (u.email) {
            const existing = map.get(u.email.toLowerCase()) || {};
            map.set(u.email.toLowerCase(), { ...existing, ...u });
          }
        });
      }
    }
  } catch (err) {
    console.error('Erreur liste Supabase:', err);
  }

  return Array.from(map.values());
}

// Mettre à jour le mot de passe
export async function supabaseUpdatePassword(email: string, newPass: string) {
  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  if (!db.users) db.users = [];
  const user = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);
  if (user) {
    user.password = newPass;
    writeDb(db);
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(),
      body: JSON.stringify({ password: newPass })
    });
  } catch (err) {
    console.error('Erreur MAJ mot de passe Supabase:', err);
  }
}

export async function supabaseSaveUserData(email: string, userData: any) {
  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  if (!db.userData) db.userData = {};
  db.userData[cleanEmail] = userData;
  writeDb(db);

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: 'POST',
      headers: getSupabaseHeaders(true),
      body: JSON.stringify({
        email: cleanEmail,
        data: userData,
        updated_at: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error('Erreur sauvegarde user_data:', err);
  }
}

export async function supabaseGetUserData(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  const localData = db.userData ? db.userData[cleanEmail] : null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data?email=eq.${encodeURIComponent(cleanEmail)}&select=data`, {
      headers: getSupabaseHeaders()
    });
    if (res.ok) {
      const records = await res.json();
      if (Array.isArray(records) && records.length > 0 && records[0].data) {
        return records[0].data;
      }
    }
  } catch (err) {
    console.error('Erreur lecture user_data:', err);
  }

  return localData || null;
}