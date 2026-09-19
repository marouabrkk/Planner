import fs from 'fs';
import path from 'path';

export const ADMIN_EMAIL = 'ber7iche@gmail.com';
export const ADMIN_EMAILS = ['ber7iche@gmail.com', 'maroua144@gmail.com'];

export function isOwnerEmail(email: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// 1. CONNEXION SUPABASE
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tflqmnmdhkxihlywekqs.supabase.co';
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_secret_rN0ms_ZMSU-L0OXTE4mAUQ_sBMnhAa9';

function getSupabaseHeaders(upsert = false) {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
  if (upsert) {
    headers['Prefer'] = 'resolution=merge-duplicates';
  }
  return headers;
}

// 2. BASE LOCALE (FALLBACK)
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

// 3. RÉCUPÉRER UN CLIENT (SUPABASE + LOCAL)
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
    }
  } catch (err) {
    console.error('Erreur Supabase lecture:', err);
  }

  const db = readDb();
  const localUser = (db.users || []).find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);
  return localUser || null;
}

// 4. SAUVEGARDER UN CLIENT DANS LES 4 COLONNES RÉELLES (id, email, password, status)
export async function supabaseSaveUser(user: { id?: string; email: string; password?: string; status?: string; role?: string }) {
  const cleanEmail = user.email.trim().toLowerCase();
  const safeId = user.id || 'u_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const userPassword = user.password || 'aura2026';
  const userStatus = user.status || (isOwnerEmail(cleanEmail) ? 'approved' : 'pending');

  const db = readDb();
  if (!db.users) db.users = [];
  const existingIdx = db.users.findIndex((u: any) => u.email && u.email.toLowerCase() === cleanEmail);
  const updatedUser = {
    id: safeId,
    email: cleanEmail,
    password: userPassword,
    status: userStatus,
    role: isOwnerEmail(cleanEmail) ? 'admin' : 'client'
  };

  if (existingIdx >= 0) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...updatedUser };
  } else {
    db.users.push(updatedUser);
  }
  writeDb(db);

  try {
    // Vérifier si le client existe déjà dans Supabase
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}&select=id`, {
      headers: getSupabaseHeaders()
    });
    const checkData = checkRes.ok ? await checkRes.json() : [];

    if (Array.isArray(checkData) && checkData.length > 0) {
      // Met à jour seulement password et status (colonnes qui existent)
      await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
        method: 'PATCH',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({
          password: userPassword,
          status: userStatus
        })
      });
    } else {
      // Insère uniquement les 4 colonnes réelles : id, email, password, status
      await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({
          id: safeId,
          email: cleanEmail,
          password: userPassword,
          status: userStatus
        })
      });
    }
  } catch (err) {
    console.error('Erreur sauvegarde Supabase:', err);
  }

  return updatedUser;
}

// 5. VALIDER UN CLIENT DANS SUPABASE (FONCTIONNE À TOUS LES COUPS)
export async function supabaseApproveUser(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const safeId = 'u_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

  // A. Mise à jour locale
  const db = readDb();
  if (!db.users) db.users = [];
  const existing = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);
  if (existing) {
    existing.status = 'approved';
  } else {
    db.users.push({
      id: safeId,
      email: cleanEmail,
      password: 'password123',
      status: 'approved',
      role: isOwnerEmail(cleanEmail) ? 'admin' : 'client'
    });
  }
  writeDb(db);

  // B. Enregistrement direct dans Supabase
  try {
    // Vérifier si l'utilisateur existe déjà
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}&select=id`, {
      headers: getSupabaseHeaders()
    });
    const checkData = checkRes.ok ? await checkRes.json() : [];

    if (Array.isArray(checkData) && checkData.length > 0) {
      // Existe déjà -> on le passe en approved
      await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
        method: 'PATCH',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({
          status: 'approved'
        })
      });
    } else {
      // N'existe pas encore -> on l'insère directement dans les 4 colonnes
      await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({
          id: safeId,
          email: cleanEmail,
          password: existing?.password || 'password123',
          status: 'approved'
        })
      });
    }
  } catch (err) {
    console.error('Erreur approbation Supabase:', err);
  }
}

// 6. LISTE DE TOUS LES CLIENTS POUR LA CONSOLE ADMIN
export async function supabaseGetAllUsers() {
  const db = readDb();
  const localUsers: any[] = db.users || [];
  const map = new Map<string, any>();

  localUsers.forEach(u => {
    if (u.email) map.set(u.email.toLowerCase(), u);
  });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*`, {
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

// 7. METTRE À JOUR LE MOT DE PASSE (MOT DE PASSE OUBLIÉ)
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

// 8. DONNÉES DU PLANNER (TÂCHES, COURS, HABITUDES)
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
        data: userData
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