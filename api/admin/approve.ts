const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'ber7iche-aura-2026';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tflqmnmdhkxihlywekqs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
  if (key !== ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Accès administrateur non autorisé.' });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email valide requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Mise à jour du statut dans Supabase en "approved"
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
          password: 'aura' + Math.floor(1000 + Math.random() * 9000),
          status: 'approved',
          role: 'client',
          approved_at: new Date().toISOString()
        })
      });
    }

    return res.json({
      success: true,
      message: `Client ${cleanEmail} approuvé définitivement avec succès !`
    });

  } catch (err: any) {
    return res.status(500).json({ error: "Erreur lors de l'approbation." });
  }
}
