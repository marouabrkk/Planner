import { supabaseSaveUser, isOwnerEmail } from '../../server-db.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { email, password } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email requis et valide.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Mot de passe de 4 caractères minimum requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const isOwner = isOwnerEmail(cleanEmail);

  const newUser = {
    id: 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
    email: cleanEmail,
    password: password, // SON VRAI MOT DE PASSE EST SAUVEGARDÉ POUR TOUJOURS
    status: isOwner ? 'approved' : 'pending',
    role: isOwner ? 'admin' : 'client'
  };

  // Enregistrement dans Supabase
  await supabaseSaveUser(newUser);

  return res.json({
    success: true,
    approved: isOwner,
    user: newUser
  });
}
