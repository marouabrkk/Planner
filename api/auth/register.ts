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

  const isOwner = isOwnerEmail(cleanEmail);

  if (existing) {
    const isApproved = isOwner || existing.status === 'approved';
    if (existing.password && existing.password !== password) {
      return res.status(400).json({
        error: 'Ce compte existe déjà avec un mot de passe différent. Veuillez vous connecter avec le bon mot de passe.'
      });
    }
    if (!existing.password) {
      existing.password = password;
    }
    if (isOwner) {
      existing.status = 'approved';
      existing.role = 'admin';
    }
    writeDb(db);

    return res.json({
      success: true,
      approved: isApproved,
      user: {
        id: existing.id,
        email: existing.email,
        role: existing.role,
        status: existing.status,
        createdAt: existing.createdAt
      },
      message: isApproved
        ? 'Compte validé ! Vous pouvez vous connecter.'
        : "Votre compte est en attente d'approbation par l'administrateur. Dès qu'il aura validé votre adresse Gmail, vous pourrez vous connecter."
    });
  }

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
    success: true,
    approved: isOwner,
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt
    },
    message: isOwner
      ? 'Compte administrateur validé !'
      : "Votre demande a été transmise avec succès à l'administrateur. Dès qu'il aura validé votre adresse Gmail, vous pourrez vous connecter avec ce mot de passe."
  });
}
