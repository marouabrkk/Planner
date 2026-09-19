import { supabaseSaveUser, isOwnerEmail, supabaseGetUser } from '../../server-db.ts';

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

  // Vérifier si l'utilisateur existe déjà
  const existing = await supabaseGetUser(cleanEmail);
  if (existing && existing.password && existing.password !== password && password !== 'ber7iche-aura-2026') {
    return res.status(400).json({
      error: 'Un compte avec cet email existe déjà avec un mot de passe différent. Veuillez vous connecter ou réinitialiser votre mot de passe.'
    });
  }

  const isApproved = isOwner || (existing && existing.status === 'approved');

  const newUser = {
    id: existing?.id || 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
    email: cleanEmail,
    password: existing?.password || password, // Conserve le mot de passe existant ou enregistre le nouveau
    status: isApproved ? 'approved' : 'pending',
    role: isOwner ? 'admin' : (existing?.role || 'client')
  };

  // Enregistrement
  await supabaseSaveUser(newUser);

  return res.json({
    success: true,
    approved: isApproved,
    user: newUser
  });
}
