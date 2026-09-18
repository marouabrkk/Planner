import { readDb, writeDb } from '../server-db.ts';

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'ber7iche-aura-2026';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = readDb();

  if (req.method === 'GET') {
    return res.json({
      paymentSettings: db.paymentSettings || {
        baridiMob: '00799999002934604547',
        ccp: '',
        contact: '@maroua144 (Telegram)'
      }
    });
  }

  if (req.method === 'POST') {
    const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
    if (key !== ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Accès administrateur non autorisé. Clé secrète requise.' });
    }

    const { baridiMob, ccp, contact } = req.body || {};
    db.paymentSettings = {
      baridiMob: typeof baridiMob === 'string' ? baridiMob : db.paymentSettings.baridiMob,
      ccp: typeof ccp === 'string' ? ccp : db.paymentSettings.ccp,
      contact: typeof contact === 'string' ? contact : db.paymentSettings.contact
    };
    writeDb(db);
    return res.json({ success: true, paymentSettings: db.paymentSettings });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
