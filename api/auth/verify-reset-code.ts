import crypto from 'crypto';

const RESET_SECRET = process.env.RESET_SECRET || 'aura-reset-secure-salt-2026-ber7iche';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, code, newPassword, resetToken } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Adresse email valide requise.' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code de vérification à 6 chiffres requis.' });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 4 caractères.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim().replace(/\s+/g, '');

  // If resetToken is provided, verify against cryptographic signature
  if (resetToken && typeof resetToken === 'string' && resetToken.includes(':')) {
    const [expiresAtStr, signature] = resetToken.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (!expiresAt || Date.now() > expiresAt) {
      return res.status(400).json({ error: 'Ce code a expiré (validité 15 minutes). Veuillez redemander un code.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', RESET_SECRET)
      .update(`${cleanEmail}:${cleanCode}:${expiresAt}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Code de sécurité incorrect. Veuillez vérifier le code reçu dans votre boîte Gmail.' });
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.'
  });
}
