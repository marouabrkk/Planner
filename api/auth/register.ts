 const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tflqmnmdhkxihlywekqs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { email, password } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email valide requis.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Mot de passe de 4 caractères minimum requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Enregistrement du client avec SON PROPRE mot de passe dans Supabase
    if (SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
          email: cleanEmail,
          password: password, // <-- SON VRAI MOT DE PASSE EST ENREGISTRÉ ICI POUR TOUJOURS
          status: 'pending',
          role: 'client',
          created_at: new Date().toISOString()
        })
      });
    }

    return res.json({
      success: true,
      approved: false,
      message: 'Compte créé avec succès ! Veuillez effectuer le paiement par BaridiMob.'
    });

  } catch (err) {
    return res.status(500).json({ error: "Erreur lors de l'enregistrement." });
  }
}
