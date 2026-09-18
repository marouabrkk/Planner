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
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  let user = db.users.find((u: any) => u.email.toLowerCase() === cleanEmail);
  const isOwner = isOwnerEmail(cleanEmail);

  // If account doesn't exist in database
  if (!user) {
    if (isOwner) {
      user = {
        id: 'admin_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
        email: cleanEmail,
        password: password,
        status: 'approved',
        role: 'admin',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      };
      db.users.push(user);
      writeDb(db);
    } else {
      return res.status(403).json({
        error: "Cette adresse Gmail n'est pas autorisée. Veuillez demander à l'administrateur d'ajouter ou d'approuver votre adresse Gmail dans l'espace privé."
      });
    }
  }

  // Check approval status
  const isApproved = isOwner || user.status === 'approved';
  if (!isApproved) {
    return res.status(403).json({
      error: "Votre compte est en attente d'approbation par l'administrateur. Dès qu'il aura approuvé votre adresse Gmail, vous pourrez vous connecter."
    });
  }

  // If user account was created without password, set it now
  if (!user.password) {
    user.password = password;
    writeDb(db);
  } else if (user.password !== password) {
    return res.status(401).json({
      error: "Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur 'Mot de passe oublié ?'."
    });
  }

  if (isOwner) {
    user.role = 'admin';
    user.status = 'approved';
    writeDb(db);
  }

  return res.json({
    success: true,
    approved: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    }
  });
}
