const ADMIN_EMAILS = ['ber7iche@gmail.com', 'maroua144@gmail.com'];
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tflqmnmdhkxihlywekqs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

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

  try {
    // 1. Recherche du client dans Supabase
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
        if (data && data.length > 0) user = data[0];
      }
    }

    // 2. Compte propriétaire
    if (ADMIN_EMAILS.includes(cleanEmail)) {
      if (password === 'Nounoussa7') {
        return res.json({ success: true, approved: true, user: { email: cleanEmail, role: 'admin' } });
      }
    }

    // 3. Si le client n'existe pas
    if (!user) {
      return res.status(404).json({ error: "Aucun compte trouvé. Veuillez d'abord cliquer sur 'Créer un compte'." });
    }

    // 4. VÉRIFICATION DE SON PROPRE MOT DE PASSE
    if (user.password !== password) {
      return res.status(401).json({ error: "Mot de passe incorrect. Veuillez vérifier votre saisie." });
    }

    // 5. Si le mot de passe est BON :
    return res.json({
      success: true,
      approved: user.status === 'approved', // True = Planner ouvert, False = Écran BaridiMob
      user: { id: user.id, email: user.email, role: user.role, status: user.status }
    });

  } catch (err) {
    return res.status(500).json({ error: "Erreur de connexion." });
  }
}
