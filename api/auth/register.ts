import { readDb, writeDb, isOwnerEmail } from '../../server-db.ts';

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
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 4 caractères.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  const existing = db.users.find((u: any) => u.email.toLowerCase() === cleanEmail);

  if (existing) {
    if (existing.password && existing.password !== password) {
      return res.status(400).json({
        error: 'Ce compte existe déjà avec un mot de passe différent. Veuillez vous connecter avec le bon mot de passe.'
      });
    }
    if (!existing.password) {
      existing.password = password;
      writeDb(db);
    }
    return res.json({
      user: {
        id: existing.id,
        email: existing.email,
        role: existing.role,
        status: existing.status,
        createdAt: existing.createdAt
      }
    });
  }

  const isOwner = isOwnerEmail(cleanEmail);
  const newUser = {
    id: 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
    email: cleanEmail,
    password: password,
    status: (isOwner ? 'approved' : 'pending') as 'approved' | 'pending',
    role: (isOwner ? 'admin' : 'client') as 'admin' | 'client',
    createdAt: new Date().toISOString(),
    approvedAt: isOwner ? new Date().toISOString() : undefined
  };

  db.users.push(newUser);
  writeDb(db);

  return res.json({
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt
    },
    message: isOwner ? 'Compte administrateur validé' : 'Compte créé ! Demande de validation transmise.'
  });
}
