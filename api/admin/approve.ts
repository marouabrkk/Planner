import { readDb, writeDb, ADMIN_EMAIL } from '../../server-db.ts';

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
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email valide requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  let user = db.users.find((u: any) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    user = {
      id: 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
      email: cleanEmail,
      status: 'approved',
      role: cleanEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'client',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
  }

  writeDb(db);

  return res.json({
    success: true,
    message: `Client ${cleanEmail} approuvé avec succès !`,
    user
  });
}
