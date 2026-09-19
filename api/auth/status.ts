import { supabaseGetUser, isOwnerEmail } from '../../server-db.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const email = (req.query.email as string || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  if (isOwnerEmail(email)) {
    return res.json({ email, status: 'approved', role: 'admin', approved: true });
  }

  const user = await supabaseGetUser(email);
  const isApproved = user && user.status === 'approved';

  return res.json({
    email,
    status: isApproved ? 'approved' : 'pending',
    approved: Boolean(isApproved)
  });
}
