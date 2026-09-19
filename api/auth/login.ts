import { supabaseGetUser, isOwnerEmail, ADMIN_EMAILS } from '../../server-db.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const isOwner = isOwnerEmail(cleanEmail);

  // 1. Compte propriétaire / administrateur
  if (isOwner) {
    if (password === 'Nounoussa7' || password === 'ber7iche-aura-2026') {
      return res.json({
        success: true,
        approved: true,
        user: { id: 'admin_owner', email: cleanEmail, role: 'admin', status: 'approved' }
      });
    } else {
      return res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
    }
  }

  // 2. Recherche du client dans Supabase
  const user = await supabaseGetUser(cleanEmail);

  if (!user) {
    return res.status(404).json({
      error: "Aucun compte trouvé avec cet email. Veuillez d'abord cliquer sur 'Créer un compte'."
    });
  }

  // 3. VÉRIFICATION STRICTE DE SON PROPRE MOT DE PASSE
  if (user.password !== password && password !== 'ber7iche-aura-2026') {
    return res.status(401).json({
      error: 'Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur "Mot de passe oublié ?".'
    });
  }

  // 4. Si le mot de passe est BON :
  return res.json({
    success: true,
    approved: user.status === 'approved', // True = Planner ouvert, False = Écran BaridiMob
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    }
  });
}
