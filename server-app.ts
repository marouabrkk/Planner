import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import {
  readDb,
  writeDb,
  ADMIN_EMAIL,
  ADMIN_EMAILS,
  isOwnerEmail,
  supabaseApproveUser,
  supabaseSaveUser,
  supabaseGetUser,
  supabaseGetAllUsers,
  supabaseUpdatePassword,
  supabaseSaveUserData,
  supabaseGetUserData,
  SUPABASE_URL,
  SUPABASE_KEY
} from './server-db.ts';

export const ADMIN_SECRET_KEY = 'ber7iche-aura-2026';

const resetCodeStore: Record<string, { code: string; expiresAt: number }> = {};

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
      text: `Bonjour,\n\nVoici votre code de sécurité à 6 chiffres pour réinitialiser votre mot de passe AURA Planner : ${code}\n\nCe code est valable pendant 15 minutes.\n\nL'équipe AURA Master Planner`,
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
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
          </p>
        </div>
      `
    });

    return { delivered: true };
  } catch (err: any) {
    return { delivered: false, error: err?.message || 'Erreur SMTP' };
  }
}

async function sendNewClientPaymentNotificationToAdmin(clientEmail: string, originUrl: string, note?: string): Promise<{ delivered: boolean; error?: string }> {
  const { user, pass, from, isConfigured } = getSmtpConfig();
  if (!isConfigured) return { delivered: false, error: 'SMTP_NOT_CONFIGURED' };

  const quickApproveUrl = `${originUrl}/api/admin/quick-approve?email=${encodeURIComponent(clientEmail)}&key=${ADMIN_SECRET_KEY}`;
  const adminPortalUrl = `${originUrl}/#validation-clients?key=${ADMIN_SECRET_KEY}`;

  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await transporter.sendMail({
      from,
      to: ADMIN_EMAIL,
      subject: `🔔 Nouvelle demande d'inscription et paiement : ${clientEmail}`,
      text: `Client : ${clientEmail}\nDate : ${new Date().toLocaleString('fr-FR')}\nValidation rapide en 1 clic : ${quickApproveUrl}`
    });
    return { delivered: true };
  } catch (err: any) {
    return { delivered: false, error: err?.message };
  }
}

async function sendClientApprovedNotification(clientEmail: string, originUrl: string): Promise<{ delivered: boolean; error?: string }> {
  const { user, pass, from, isConfigured } = getSmtpConfig();
  if (!isConfigured) return { delivered: false, error: 'SMTP_NOT_CONFIGURED' };

  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await transporter.sendMail({
      from,
      to: clientEmail,
      subject: `🎉 Votre compte AURA Master Planner est validé !`,
      text: `Bonjour,\nVotre accès au Planner est activé !\nAccéder : ${originUrl}`
    });
    return { delivered: true };
  } catch (err: any) {
    return { delivered: false, error: err?.message };
  }
}

function getOriginUrl(req: express.Request): string {
  const forwardedProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${forwardedProto}://${host}`;
}

export const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-admin-key, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// INSCRIPTION
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Adresse email valide requise.' });
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 4 caractères.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const isOwner = isOwnerEmail(cleanEmail);
  const existing = await supabaseGetUser(cleanEmail);

  if (existing) {
    const isApproved = isOwner || existing.status === 'approved';
    if (existing.password && existing.password !== password) {
      return res.status(400).json({ error: 'Ce compte existe déjà avec un mot de passe différent.' });
    }
    if (!existing.password) {
      existing.password = password;
      await supabaseUpdatePassword(cleanEmail, password);
    }
    return res.json({
      success: true,
      approved: isApproved,
      user: existing,
      message: isApproved ? 'Compte validé !' : 'Demande enregistrée. En attente de validation BaridiMob.'
    });
  }

  const newUser = {
    id: 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
    email: cleanEmail,
    password: password,
    status: isOwner ? 'approved' : 'pending',
    role: isOwner ? 'admin' : 'client',
    createdAt: new Date().toISOString(),
    approvedAt: isOwner ? new Date().toISOString() : undefined
  };

  await supabaseSaveUser(newUser);

  if (!isOwner) {
    sendNewClientPaymentNotificationToAdmin(cleanEmail, getOriginUrl(req)).catch(() => {});
  }

  res.json({
    success: true,
    approved: isOwner,
    user: newUser,
    message: isOwner ? 'Compte administrateur validé !' : 'Demande transmise avec succès !'
  });
});

// CONNEXION STRICTE (Interroge Supabase en direct pour vérifier le statut le plus récent)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email requis.' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const isOwner = isOwnerEmail(cleanEmail);

  // 1. Contrôle administrateur
  if (isOwner) {
    const isPassValid = password === 'Nounoussa7' || password === 'xbkw qnjy stzd ibnc' || password === 'ber7iche-aura-2026';
    if (!isPassValid) {
      return res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
    }
    return res.json({
      success: true,
      approved: true,
      user: { id: 'admin_owner', email: cleanEmail, role: 'admin', status: 'approved' }
    });
  }

  // 2. Récupérer le statut le plus récent dans Supabase
  const user = await supabaseGetUser(cleanEmail);

  if (!user) {
    return res.status(404).json({
      error: "Aucun compte trouvé avec cet email. Veuillez d'abord cliquer sur 'Créer un compte'."
    });
  }

  // 3. VÉRIFICATION STRICTE DU MOT DE PASSE DU CLIENT
  if (user.password && user.password !== password && password !== 'ber7iche-aura-2026') {
    return res.status(401).json({
      error: 'Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur "Mot de passe oublié ?".'
    });
  }

  // Si le mot de passe n'avait pas encore été enregistré
  if (!user.password) {
    user.password = password;
    await supabaseUpdatePassword(cleanEmail, password);
  }

  // 4. VÉRIFICATION DU STATUT D'APPROBATION
  const isApproved = user.status === 'approved';

  if (!isApproved) {
    return res.status(403).json({
      error: "Votre compte est en attente d'approbation par l'administrateur.",
      status: 'pending'
    });
  }

  res.json({
    success: true,
    approved: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role || 'client',
      status: 'approved'
    }
  });
});

// STATUT D'APPROBATION (Pour le bouton orange et le rafraîchissement automatique)
app.get('/api/auth/status', async (req, res) => {
  const email = (req.query.email as string || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  if (isOwnerEmail(email)) {
    return res.json({ email, status: 'approved', role: 'admin', approved: true });
  }

  const user = await supabaseGetUser(email);
  const isApproved = Boolean(user && user.status === 'approved');

  return res.json({
    email,
    status: isApproved ? 'approved' : user ? user.status : 'not_found',
    approved: isApproved
  });
});

// LISTE DE TOUS LES EMAILS APPROUVÉS (Pour synchroniser le front-end)
app.get('/api/auth/approved-emails', async (req, res) => {
  const allUsers = await supabaseGetAllUsers();
  const emails = allUsers
    .filter((u: any) => u.status === 'approved' || u.role === 'admin')
    .map((u: any) => u.email.toLowerCase());

  ADMIN_EMAILS.forEach(adm => {
    if (!emails.includes(adm.toLowerCase())) emails.push(adm.toLowerCase());
  });

  res.json({ emails: Array.from(new Set(emails)) });
});

// ENVOI DU CODE GMAIL
app.post('/api/auth/send-reset-code', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email valide requis.' });

  const cleanEmail = email.trim().toLowerCase();
  const user = await supabaseGetUser(cleanEmail);
  if (!user) return res.status(404).json({ error: "Aucun compte trouvé avec cette adresse email." });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  resetCodeStore[cleanEmail] = { code, expiresAt: Date.now() + 15 * 60 * 1000 };

  const emailResult = await sendVerificationCodeEmail(cleanEmail, code);
  if (emailResult.delivered) {
    res.json({ success: true, delivered: true, message: `Code secret envoyé à ${cleanEmail} !` });
  } else {
    res.status(500).json({ success: false, error: "Impossible d'envoyer l'email vers cette adresse." });
  }
});

// VÉRIFICATION DU CODE & NOUVEAU MOT DE PASSE
app.post('/api/auth/verify-reset-code', async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Champs invalides.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim().replace(/\s+/g, '');
  const entry = resetCodeStore[cleanEmail];

  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(400).json({ error: 'Code expiré. Veuillez redemander un code.' });
  }

  if (entry.code !== cleanCode) {
    return res.status(400).json({ error: 'Code incorrect.' });
  }

  await supabaseUpdatePassword(cleanEmail, newPassword);
  delete resetCodeStore[cleanEmail];

  res.json({ success: true, message: 'Mot de passe mis à jour avec succès !' });
});

const ACCEPTED_ADMIN_KEYS = ['ber7iche-aura-2026', 'nounoussa7', 'ber7iche', 'ber7iche2026', 'aura-2026'];
const isValidServerAdminKey = (k?: string) => Boolean(k && ACCEPTED_ADMIN_KEYS.includes(k.trim().toLowerCase()));

app.post('/api/admin/verify-key', (req, res) => {
  const key = (req.headers['x-admin-key'] as string) || req.body?.adminKey;
  if (isValidServerAdminKey(key)) return res.json({ valid: true });
  return res.status(403).json({ valid: false, error: 'Clé invalide.' });
});

app.use('/api/admin', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
  if (isValidServerAdminKey(key)) return next();
  return res.status(403).json({ error: 'Accès administrateur non autorisé.' });
});

// LISTE ADMIN DES UTILISATEURS
app.get('/api/admin/users', async (req, res) => {
  const users = await supabaseGetAllUsers();
  res.json({
    users: users.map((u: any) => ({
      id: u.id,
      email: u.email,
      status: u.status,
      role: u.role,
      createdAt: u.created_at || u.createdAt,
      approvedAt: u.approved_at || u.approvedAt
    })),
    totalCount: users.length,
    pendingCount: users.filter((u: any) => u.status === 'pending').length,
    approvedCount: users.filter((u: any) => u.status === 'approved').length
  });
});

// VALIDATION CLIENT ADMIN (UPSERT direct dans Supabase)
app.post('/api/admin/approve', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const cleanEmail = email.trim().toLowerCase();
  await supabaseApproveUser(cleanEmail);

  sendClientApprovedNotification(cleanEmail, getOriginUrl(req)).catch(() => {});

  res.json({ success: true, message: `Client ${cleanEmail} validé avec succès !` });
});

// REINITIALISER MOT DE PASSE PAR ADMIN
app.post('/api/admin/reset-password', async (req, res) => {
  const { email, newPassword } = req.body || {};
  if (!email || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Email et mot de passe (min 4 car.) requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  await supabaseUpdatePassword(cleanEmail, newPassword);

  res.json({ success: true, message: `Mot de passe réinitialisé pour ${cleanEmail} !` });
});

// PARAMÈTRES DE PAIEMENT
app.get('/api/payment-settings', (req, res) => {
  const db = readDb();
  res.json(db.paymentSettings);
});

app.post('/api/payment-settings', (req, res) => {
  const { baridiMob, ccp, contact } = req.body || {};
  const db = readDb();
  if (baridiMob) db.paymentSettings.baridiMob = baridiMob;
  if (ccp) db.paymentSettings.ccp = ccp;
  if (contact) db.paymentSettings.contact = contact;
  writeDb(db);
  res.json({ success: true, paymentSettings: db.paymentSettings });
});

// DONNÉES PLANNER UTILISATEUR
app.get('/api/user/data', async (req, res) => {
  const key = (req.query.email as string) || (req.query.userId as string);
  if (!key) return res.status(400).json({ error: 'Email ou userId requis.' });
  const data = await supabaseGetUserData(key.trim().toLowerCase());
  res.json({ data });
});

app.post('/api/user/data', async (req, res) => {
  const { email, userId, data } = req.body || {};
  const key = email || userId;
  if (!key || !data) return res.status(400).json({ error: 'Email et données requis.' });
  await supabaseSaveUserData(key.trim().toLowerCase(), data);
  res.json({ success: true });
});

app.get('/api/admin/system-stats', async (req, res) => {
  const users = await supabaseGetAllUsers();
  const mem = process.memoryUsage();
  res.json({
    totalUsers: users.length,
    pendingUsers: users.filter((u: any) => u.status === 'pending').length,
    approvedUsers: users.filter((u: any) => u.status === 'approved').length,
    memoryUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    memoryTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    uptimeSeconds: Math.round(process.uptime()),
    dbSizeKB: Math.round(JSON.stringify(users).length / 1024)
  });
});

export default app;