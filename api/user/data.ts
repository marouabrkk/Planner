import { supabaseGetUserData, supabaseSaveUserData } from '../../server-db.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const key = (req.query?.email as string) || (req.query?.userId as string);
    if (!key) return res.status(400).json({ error: 'email ou userId requis.' });
    const cleanKey = key.trim().toLowerCase();
    const data = await supabaseGetUserData(cleanKey);
    return res.json({ data });
  }

  if (req.method === 'POST') {
    const { email, userId, data } = req.body || {};
    const key = email || userId;
    if (!key || !data) return res.status(400).json({ error: 'email ou userId et data requis.' });
    const cleanKey = key.trim().toLowerCase();
    await supabaseSaveUserData(cleanKey, data);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
