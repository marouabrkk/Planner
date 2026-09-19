import { SUPABASE_URL, SUPABASE_KEY } from '../../server-db.ts';

const ACCEPTED_KEYS = [
  (process.env.ADMIN_SECRET_KEY || 'ber7iche-aura-2026').toLowerCase(),
  'ber7iche-aura-2026',
  'nounoussa7',
  'ber7iche'
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const rawKey = ((req.headers?.['x-admin-key'] as string) || (req.query?.key as string) || '').trim().toLowerCase();
  if (!ACCEPTED_KEYS.includes(rawKey)) {
    return res.status(403).json({ error: 'Accès non autorisé.' });
  }

  const result: any = {
    url: SUPABASE_URL,
    configured: Boolean(SUPABASE_KEY),
    keyType: SUPABASE_KEY.startsWith('ey') ? 'jwt_token' : SUPABASE_KEY.startsWith('sb_secret') ? 'new_secret_key' : 'other',
    tableAccessible: false,
    rlsStatus: 'unknown',
    message: ''
  };

  try {
    // 1. Tester la requête REST vers la table users
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    result.httpStatus = checkRes.status;

    if (checkRes.ok) {
      result.tableAccessible = true;
      result.rlsStatus = 'active_and_authorized';
      result.message = 'Connexion Supabase réussie ! Les règles RLS autorisent les opérations du serveur.';
    } else if (checkRes.status === 401) {
      result.tableAccessible = false;
      result.rlsStatus = 'auth_failed';
      result.message = "La clé API Supabase fournie n'est pas reconnue par l'API REST. Veuillez vous assurer d'utiliser la clé 'service_role' (JWT commençant par eyJhbGci...) dans Supabase Dashboard > Project Settings > API.";
    } else if (checkRes.status === 403) {
      result.tableAccessible = false;
      result.rlsStatus = 'rls_blocked';
      result.message = "La table 'users' a RLS activé mais aucune politique n'autorise cette clé. Veuillez exécuter le script supabase-schema-rls.sql dans l'éditeur SQL de Supabase.";
    } else if (checkRes.status === 404) {
      result.tableAccessible = false;
      result.rlsStatus = 'table_missing';
      result.message = "La table 'users' n'existe pas encore dans Supabase. Exécutez le script supabase-schema-rls.sql dans l'éditeur SQL de Supabase pour la créer.";
    } else {
      const text = await checkRes.text();
      result.message = `Réponse Supabase (${checkRes.status}) : ${text}`;
    }
  } catch (err: any) {
    result.error = err.message;
    result.message = `Erreur réseau lors de la connexion à Supabase : ${err.message}`;
  }

  return res.json(result);
}
