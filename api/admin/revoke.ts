import { readDb, writeDb, ADMIN_EMAILS } from '../../server-db.ts';

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'ber7iche-aura-2026';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
  if (key !== ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Accès administrateur non autorisé. Clé secrète requise.' });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(cleanEmail)) {
    return res.status(400).json({ error: 'Impossible de révoquer un compte administrateur principal.' });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === cleanEmail);
  if (user) {
    user.status = 'pending';
    writeDb(db);
  }

  return res.json({ success: true, message: `Accès révoqué pour ${cleanEmail}` });
}
