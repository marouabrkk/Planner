import { supabaseApproveUser } from '../../server-db.ts';

const ACCEPTED_KEYS = [
  (process.env.ADMIN_SECRET_KEY || 'ber7iche-aura-2026').toLowerCase(),
  'ber7iche-aura-2026',
  'nounoussa7',
  'ber7iche'
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const rawKey = ((req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey || '').trim().toLowerCase();
  if (!ACCEPTED_KEYS.includes(rawKey)) {
    return res.status(403).json({ error: 'Accès administrateur non autorisé.' });
  }

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const cleanEmail = email.trim().toLowerCase();
  await supabaseApproveUser(cleanEmail);

  return res.json({
    success: true,
    message: `Client ${cleanEmail} validé avec succès pour toujours !`
  });
}
