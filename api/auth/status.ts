import { readDb, isOwnerEmail } from '../../server-db.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const email = (req.query.email as string || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email requis.' });
  }

  const db = readDb();
  let user = db.users.find((u: any) => u.email.toLowerCase() === email);

  if (isOwnerEmail(email)) {
    return res.json({
      email,
      status: 'approved',
      role: 'admin',
      approved: true
    });
  }

  if (!user) {
    return res.json({
      email,
      status: 'not_found',
      role: 'client',
      approved: false
    });
  }

  return res.json({
    email: user.email,
    status: user.status,
    role: user.role,
    approved: user.status === 'approved' || user.role === 'admin'
  });
}
