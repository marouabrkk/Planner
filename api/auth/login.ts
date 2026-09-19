import { isOwnerEmail } from '../../server-db.ts';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tflqmnmdhkxihlywekqs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { email, password } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email requis et valide.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const isOwner = isOwnerEmail(cleanEmail);

  try {
    // 1. Recherche directe dans la base Supabase
    let user: any = null;
    if (SUPABASE_KEY) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}&select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          user = data[0];
        }
      }
    }

    // 2. Si propriétaire (admin)
    if (isOwner) {
      return res.json({
        success: true,
        approved: true,
        user: { id: 'admin_owner', email: cleanEmail, role: 'admin', status: 'approved' }
      });
    }

    // 3. Si le client n'existe pas encore
    if (!user) {
      return res.status(404).json({
        error: "Aucun compte trouvé avec cet email. Veuillez cliquer sur 'Créer un compte' pour vous inscrire."
      });
    }

    // 4. Vérification du statut d'approbation
    const isApproved = user.status === 'approved';

    // 5. Connexion réussie (Planner si approuvé, écran BaridiMob si en attente)
    return res.json({
      success: true,
      approved: isApproved,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at
      }
    });

  } catch (err: any) {
    return res.status(500).json({ error: "Erreur serveur de vérification." });
  }
}
