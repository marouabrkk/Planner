import { supabaseGetAllUsers } from '../../server-db.ts';

const ACCEPTED_KEYS = [
  (process.env.ADMIN_SECRET_KEY || 'ber7iche-aura-2026').toLowerCase(),
  'ber7iche-aura-2026',
  'nounoussa7',
  'ber7iche'
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const rawKey = ((req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey || '').trim().toLowerCase();
  if (!ACCEPTED_KEYS.includes(rawKey)) {
    return res.status(403).json({ error: 'Accès non autorisé.' });
  }

  const users = await supabaseGetAllUsers();

  return res.json({
    users: users.map((u: any) => ({
      id: u.id,
      email: u.email,
      status: u.status,
      role: u.role,
      createdAt: u.created_at,
      approvedAt: u.approved_at
    })),
    totalCount: users.length,
    pendingCount: users.filter((u: any) => u.status === 'pending').length,
    approvedCount: users.filter((u: any) => u.status === 'approved').length
  });
}
