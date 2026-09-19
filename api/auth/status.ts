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
  const user = db.users.find((u: any) => u.email.toLowerCase() === email);

  // Si le compte est validé dans la console admin
  const isApproved = isOwnerEmail(email) || (user && user.status === 'approved');

  return res.json({
    email,
    status: isApproved ? 'approved' : 'pending',
    approved: Boolean(isApproved)
  });
}
