import { supabaseGetAllUsers, ADMIN_EMAILS } from '../../server-db.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const allUsers = await supabaseGetAllUsers();
  const emails = allUsers
    .filter((u: any) => u.status === 'approved' || u.role === 'admin')
    .map((u: any) => u.email.toLowerCase());

  ADMIN_EMAILS.forEach(adm => {
    if (!emails.includes(adm.toLowerCase())) {
      emails.push(adm.toLowerCase());
    }
  });

  return res.json({ emails: Array.from(new Set(emails)) });
}
