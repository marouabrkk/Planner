import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { readDb, writeDb, ADMIN_EMAIL, ADMIN_EMAILS, isOwnerEmail } from './server-db.ts';

export const ADMIN_SECRET_KEY = 'ber7iche-aura-2026';

// Verification codes store: email -> { code, expiresAt }
const resetCodeStore: Record<string, { code: string; expiresAt: number }> = {};

// Helper: retrieve current SMTP configuration
function getSmtpConfig() {
  const db = readDb();
  const user = process.env.SMTP_USER || db.smtpSettings?.user || '';
  const pass = (process.env.SMTP_PASS || db.smtpSettings?.pass || '').replace(/\s+/g, '');
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const fromName = db.smtpSettings?.fromName || 'AURA Master Planner';
  const from = process.env.EMAIL_FROM || `"${fromName}" <${user || 'contact@auraplanner.com'}>`;
  const isConfigured = Boolean(user && pass);

  return { user, pass, host, port, from, fromName, isConfigured };
}

// Helper: send verification email
async function sendVerificationCodeEmail(targetEmail: string, code: string): Promise<{ delivered: boolean; error?: string }> {
  const { user, pass, from, isConfigured } = getSmtpConfig();

  if (!isConfigured) {
    console.log(`[AURA EMAIL DEMO] Code de vérification pour ${targetEmail} : ${code}`);
    return { delivered: false, error: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    await transporter.sendMail({
      from,
      to: targetEmail,
      subject: `Votre code de sécurité AURA Planner : ${code}`,
      text: `Bonjour,\n\nVoici votre code de sécurité à 6 chiffres pour réinitialiser votre mot de passe AURA Planner : ${code}\n\nCe code est valable pendant 15 minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.\n\nL'équipe AURA Master Planner`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0e17; color: #f8fafc; padding: 32px 20px; border-radius: 16px; max-width: 480px; margin: 0 auto; border: 1px solid #1c2235;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #06b6d4); color: white; width: 44px; height: 44px; line-height: 44px; font-size: 22px; border-radius: 12px;">⚡</div>
            <h1 style="color: #ffffff; font-size: 18px; font-weight: 800; margin: 12px 0 2px;">AURA Master Planner</h1>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Récupération de mot de passe</p>
          </div>
          <div style="background-color: #141926; border: 1px solid #22293d; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <p style="color: #cbd5e1; font-size: 13px; margin: 0 0 14px;">Votre code de vérification à 6 chiffres est :</p>
            <div style="display: inline-block; background: #0b0e17; border: 1.5px dashed #6366f1; padding: 10px 24px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #38bdf8; border-radius: 10px; margin: 4px 0 14px;">
              ${code}
            </div>
            <p style="color: #94a3b8; font-size: 11.5px; margin: 0;">⏱️ Ce code expire dans <strong>15 minutes</strong>.</p>
          </div>
          <p style="color: #64748b; font-size: 11px; line-height: 1.5; margin: 0; text-align: center;">
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
          </p>
        </div>
      `
    });

    console.log(`[AURA EMAIL] Code ${code} envoyé avec succès à ${targetEmail} via Gmail SMTP !`);
    return { delivered: true };
  } catch (err: any) {
    console.error('Erreur lors de l’envoi de l’email Gmail:', err);
    return { delivered: false, error: err?.message || 'Erreur d’envoi Gmail' };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS and Preflight headers for seamless cross-origin and iframe requests
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-admin-key, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Adresse email valide requise.' });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 4 caractères.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);

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

    res.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  });

  // Auth: Login (Verifies password strictly)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Email requis et valide.' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Mot de passe requis.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    const isOwner = isOwnerEmail(cleanEmail);

    // If user does not exist in login mode
    if (!user) {
      return res.status(404).json({
        error: "Aucun compte trouvé avec cet email. Veuillez d'abord cliquer sur 'Créer un compte'."
      });
    }

    // STRICT PASSWORD VERIFICATION:
    if (user.password && user.password !== password) {
      return res.status(401).json({
        error: 'Mot de passe incorrect. Veuillez vérifier votre mot de passe.'
      });
    }

    // If user account was created without password, set it now
    if (!user.password) {
      user.password = password;
      writeDb(db);
    }

    // Ensure owner role/status is always approved
    if (isOwner) {
      user.role = 'admin';
      user.status = 'approved';
      writeDb(db);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  });

  // Auth: Send 6-digit Reset Code by Email
  app.post('/api/auth/send-reset-code', async (req, res) => {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Adresse email valide requise.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: "Aucun compte n'a été trouvé avec cette adresse email." });
    }

    // Generate random 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Valid for 15 minutes
    resetCodeStore[cleanEmail] = {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000
    };

    console.log(`[AURA CODE] Code pour ${cleanEmail} généré : ${code}`);

    // Try sending email via nodemailer
    const emailResult = await sendVerificationCodeEmail(cleanEmail, code);

    if (emailResult.delivered) {
      res.json({
        success: true,
        delivered: true,
        message: `Code secret envoyé à ${cleanEmail} ! Vérifiez votre boîte de réception Gmail.`
      });
    } else {
      res.status(500).json({
        success: false,
        delivered: false,
        error: `Impossible d'envoyer l'email vers ${cleanEmail}. Veuillez vérifier votre adresse.`
      });
    }
  });

  // Auth: Verify 6-digit Reset Code and update password
  app.post('/api/auth/verify-reset-code', (req, res) => {
    const { email, code, newPassword } = req.body || {};
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
    const entry = resetCodeStore[cleanEmail];

    if (!entry) {
      return res.status(400).json({ error: "Aucun code en attente. Veuillez cliquer sur 'Renvoyer un code'." });
    }

    if (Date.now() > entry.expiresAt) {
      delete resetCodeStore[cleanEmail];
      return res.status(400).json({ error: 'Ce code a expiré (validité 15 minutes). Veuillez en demander un nouveau.' });
    }

    if (entry.code !== cleanCode) {
      return res.status(400).json({ error: 'Code de vérification incorrect. Veuillez vérifier les 6 chiffres.' });
    }

    // Code is valid! Update password
    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(404).json({ error: 'Compte introuvable.' });
    }

    user.password = newPassword;
    writeDb(db);
    delete resetCodeStore[cleanEmail];

    res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.'
    });
  });

  // Auth: Reset / Forgot Password (Client self-service fallback)
  app.post('/api/auth/reset-password', (req, res) => {
    const { email, newPassword } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Adresse email valide requise.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 4 caractères.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: "Aucun compte n'a été trouvé avec cette adresse email." });
    }

    user.password = newPassword;
    writeDb(db);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.'
    });
  });

  // Auth: Check status
  app.get('/api/auth/status', (req, res) => {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email requis.' });
    }

    const db = readDb();
    let user = db.users.find(u => u.email.toLowerCase() === email);

    // If owner checking status
    if (isOwnerEmail(email)) {
      return res.json({
        email,
        status: 'approved',
        role: 'admin',
        approved: true
      });
    }

    if (!user) {
      // Auto-register pending client
      user = {
        id: 'u_' + Buffer.from(email).toString('base64').replace(/=/g, ''),
        email: email,
        status: 'pending',
        role: 'client',
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      writeDb(db);
    }

    res.json({
      email: user.email,
      status: user.status,
      role: user.role,
      approved: user.status === 'approved' || user.role === 'admin'
    });
  });

  // Public approved email check for client app
  app.get('/api/auth/approved-emails', (req, res) => {
    const db = readDb();
    const emails = db.users
      .filter((u) => u.status === 'approved' || u.role === 'admin')
      .map((u) => u.email.toLowerCase());
    
    // Ensure all ADMIN_EMAILS are always included
    ADMIN_EMAILS.forEach(adm => {
      if (!emails.includes(adm.toLowerCase())) emails.push(adm.toLowerCase());
    });

    res.json({ emails });
  });

  // Admin key verification
  app.post('/api/admin/verify-key', (req, res) => {
    const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
    if (key === ADMIN_SECRET_KEY) {
      return res.json({ valid: true });
    }
    return res.status(403).json({ valid: false, error: 'Clé secrète administrateur invalide.' });
  });

  // Admin middleware: Protect all /api/admin endpoints
  app.use('/api/admin', (req, res, next) => {
    if (req.method === 'OPTIONS') {
      return next();
    }
    const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
    if (key === ADMIN_SECRET_KEY) {
      return next();
    }
    return res.status(403).json({ error: 'Accès administrateur non autorisé. Clé secrète requise.' });
  });

  // Admin: List all clients
  app.get('/api/admin/users', (req, res) => {
    const db = readDb();
    const usersSummary = db.users.map(u => ({
      id: u.id,
      email: u.email,
      status: u.status,
      role: u.role,
      createdAt: u.createdAt,
      approvedAt: u.approvedAt
    }));
    res.json({
      users: usersSummary,
      totalCount: usersSummary.length,
      pendingCount: usersSummary.filter(u => u.status === 'pending').length,
      approvedCount: usersSummary.filter(u => u.status === 'approved').length
    });
  });

  // Admin: Approve client
  app.post('/api/admin/approve', (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requis.' });

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // If user wasn't registered yet, create approved account directly
      const newUser = {
        id: 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
        email: cleanEmail,
        status: 'approved' as 'approved' | 'pending',
        role: (cleanEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'client') as 'admin' | 'client',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      };
      db.users.push(newUser);
      writeDb(db);
      return res.json({ success: true, message: `Compte ${cleanEmail} créé et approuvé !`, user: newUser });
    }

    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
    writeDb(db);

    res.json({ success: true, message: `Compte ${cleanEmail} validé avec succès !`, user });
  });

  // Admin: Revoke client
  app.post('/api/admin/revoke', (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requis.' });

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'Impossible de suspendre le propriétaire principal.' });
    }

    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    user.status = 'pending';
    writeDb(db);

    res.json({ success: true, message: `Accès révoqué pour ${cleanEmail}.` });
  });

  // Admin: Delete client
  app.post('/api/admin/delete-user', (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requis.' });

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'Impossible de supprimer le compte propriétaire.' });
    }

    const db = readDb();
    db.users = db.users.filter(u => u.email.toLowerCase() !== cleanEmail);
    delete db.userData[cleanEmail];
    writeDb(db);

    res.json({ success: true, message: `Utilisateur ${cleanEmail} supprimé avec succès.` });
  });

  // Admin: Reset client password
  app.post('/api/admin/reset-password', (req, res) => {
    const { email, newPassword } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requis.' });
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 4 caractères.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    user.password = newPassword;
    writeDb(db);

    res.json({
      success: true,
      message: `Mot de passe pour ${cleanEmail} réinitialisé avec succès : ${newPassword}`
    });
  });

  // Admin: Get SMTP configuration status
  app.get('/api/admin/smtp-settings', (req, res) => {
    const db = readDb();
    const config = getSmtpConfig();
    res.json({
      user: config.user || '',
      isConfigured: config.isConfigured,
      hasPassword: Boolean(config.pass),
      fromName: config.fromName,
      updatedAt: db.smtpSettings?.updatedAt
    });
  });

  // Admin: Save Gmail SMTP configuration
  app.post('/api/admin/smtp-settings', (req, res) => {
    const { user, pass, fromName } = req.body || {};
    if (!user || typeof user !== 'string' || !user.includes('@')) {
      return res.status(400).json({ error: 'Adresse Gmail valide requise (ex: ber7iche@gmail.com).' });
    }

    const db = readDb();
    const currentPass = (process.env.SMTP_PASS || db.smtpSettings?.pass || '').replace(/\s+/g, '');
    const cleanPass = (typeof pass === 'string' && pass.trim()) ? pass.trim().replace(/\s+/g, '') : currentPass;

    if (!cleanPass) {
      return res.status(400).json({
        error: "Mot de passe d'application Google (16 lettres) requis. Consultez le guide ci-dessous pour l'obtenir en 1 minute."
      });
    }

    db.smtpSettings = {
      user: user.trim().toLowerCase(),
      pass: cleanPass,
      fromName: (fromName && typeof fromName === 'string' && fromName.trim()) ? fromName.trim() : 'AURA Master Planner',
      service: 'gmail',
      updatedAt: new Date().toISOString()
    };
    writeDb(db);

    res.json({
      success: true,
      message: 'Configuration Gmail enregistrée avec succès !',
      isConfigured: true,
      user: db.smtpSettings.user
    });
  });

  // Admin: Test Gmail SMTP dispatch
  app.post('/api/admin/test-email', async (req, res) => {
    const { targetEmail } = req.body || {};
    const recipient = (targetEmail || ADMIN_EMAIL).trim().toLowerCase();
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await sendVerificationCodeEmail(recipient, testCode);

    if (result.delivered) {
      return res.json({
        success: true,
        message: `Email de test avec le code (${testCode}) envoyé avec succès à ${recipient} ! Vérifiez votre boîte de réception Gmail.`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error === 'SMTP_NOT_CONFIGURED'
          ? "Gmail SMTP n'est pas encore configuré. Renseignez votre adresse Gmail et votre mot de passe d'application."
          : `Échec de l'envoi Gmail : ${result.error}. Vérifiez que la validation en 2 étapes est activée sur votre compte Google et utilisez un Mot de passe d'application à 16 lettres.`
      });
    }
  });

  // Payment Settings (GET and POST)
  app.get('/api/payment-settings', (req, res) => {
    const db = readDb();
    res.json(db.paymentSettings);
  });

  app.post('/api/payment-settings', (req, res) => {
    const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
    if (key !== ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Action non autorisée. Clé secrète requise.' });
    }
    const { baridiMob, ccp, contact } = req.body || {};
    const db = readDb();
    if (baridiMob) db.paymentSettings.baridiMob = baridiMob;
    if (ccp) db.paymentSettings.ccp = ccp;
    if (contact) db.paymentSettings.contact = contact;
    writeDb(db);
    res.json({ success: true, paymentSettings: db.paymentSettings });
  });

  // User Planner Data (GET and POST)
  app.get('/api/user/data', (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId requis.' });
    const db = readDb();
    const data = db.userData[userId] || null;
    res.json({ data });
  });

  app.post('/api/user/data', (req, res) => {
    const { userId, data } = req.body || {};
    if (!userId || !data) return res.status(400).json({ error: 'userId et data requis.' });
    const db = readDb();
    db.userData[userId] = data;
    writeDb(db);
    res.json({ success: true });
  });

  // System Capacity and Stats
  app.get('/api/admin/system-stats', (req, res) => {
    const db = readDb();
    const mem = process.memoryUsage();
    res.json({
      totalUsers: db.users.length,
      pendingUsers: db.users.filter(u => u.status === 'pending').length,
      approvedUsers: db.users.filter(u => u.status === 'approved').length,
      memoryUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      memoryTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
      dbSizeKB: Math.round(JSON.stringify(db).length / 1024)
    });
  });

  // Vite middleware in dev, Static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
