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

// Helper: send payment request email to Admin Gmail
async function sendNewClientPaymentNotificationToAdmin(clientEmail: string, originUrl: string, note?: string): Promise<{ delivered: boolean; error?: string }> {
  const { user, pass, from, isConfigured } = getSmtpConfig();
  if (!isConfigured) {
    console.log(`[AURA DEMO] Nouvelle demande de paiement pour ${clientEmail}`);
    return { delivered: false, error: 'SMTP_NOT_CONFIGURED' };
  }

  const quickApproveUrl = `${originUrl}/api/admin/quick-approve?email=${encodeURIComponent(clientEmail)}&key=${ADMIN_SECRET_KEY}`;
  const adminPortalUrl = `${originUrl}/#validation-clients?key=${ADMIN_SECRET_KEY}`;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    await transporter.sendMail({
      from,
      to: ADMIN_EMAIL,
      subject: `🔔 Nouvelle demande d'inscription et paiement : ${clientEmail}`,
      text: `Bonjour,\n\nUne nouvelle demande d'inscription & paiement vient d'être enregistrée sur AURA Master Planner !\n\nClient : ${clientEmail}\nDate : ${new Date().toLocaleString('fr-FR')}\nMode : BaridiMob (RIP: 00799999002934604547)\n${note ? `Note : ${note}\n` : ''}\nLien de validation immédiate en 1 clic : ${quickApproveUrl}\n\nAccéder au portail d'administration : ${adminPortalUrl}\n\nL'équipe AURA`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0e17; color: #f8fafc; padding: 32px 24px; border-radius: 16px; max-width: 520px; margin: 0 auto; border: 1px solid #1c2235;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #ec4899); color: white; width: 48px; height: 48px; line-height: 48px; font-size: 24px; border-radius: 14px; text-align: center;">💳</div>
            <h1 style="color: #ffffff; font-size: 19px; font-weight: 800; margin: 12px 0 2px;">Nouvelle Demande de Paiement</h1>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">AURA Master Planner - Notification Administrateur</p>
          </div>
          <div style="background-color: #141926; border: 1px solid #22293d; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Client en attente de validation :</p>
            <p style="margin: 0 0 14px; font-size: 17px; font-weight: 800; color: #38bdf8;">${clientEmail}</p>
            <p style="margin: 0 0 6px; font-size: 12px; color: #cbd5e1;"><strong>Mode de paiement :</strong> BaridiMob (RIP 00799999002934604547)</p>
            <p style="margin: 0 0 6px; font-size: 12px; color: #cbd5e1;"><strong>Date & Heure :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            ${note ? `<div style="margin-top: 10px; padding: 10px; background: #1c2336; border-radius: 8px; font-size: 12px; color: #fcd34d;"><strong>Message du client :</strong> ${note}</div>` : ''}
          </div>
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${quickApproveUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 0 25px rgba(16,185,129,0.4);">
              ✅ Valider ce client directement (1 Clic)
            </a>
          </div>
          <p style="text-align: center; margin: 0; font-size: 11.5px; color: #64748b;">
            Ou connectez-vous sur votre <a href="${adminPortalUrl}" style="color: #818cf8; text-decoration: underline;">Espace Privé de Gestion</a>.
          </p>
        </div>
      `
    });

    console.log(`[AURA PAYMENT ALERT] Notification envoyée à l'admin ${ADMIN_EMAIL} pour le client ${clientEmail}`);
    return { delivered: true };
  } catch (err: any) {
    console.error('Erreur notification paiement admin:', err);
    return { delivered: false, error: err?.message };
  }
}

// Helper: send client approval email to Client Gmail
async function sendClientApprovedNotification(clientEmail: string, originUrl: string): Promise<{ delivered: boolean; error?: string }> {
  const { user, pass, from, isConfigured } = getSmtpConfig();
  if (!isConfigured) return { delivered: false, error: 'SMTP_NOT_CONFIGURED' };

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    await transporter.sendMail({
      from,
      to: clientEmail,
      subject: `🎉 Votre compte AURA Master Planner est validé !`,
      text: `Bonjour,\n\nExcellente nouvelle ! Votre paiement a été vérifié et votre compte AURA Master Planner (${clientEmail}) est validé avec succès par l'administrateur.\n\nVous bénéficiez maintenant d'un accès illimité à l'ensemble du planner.\n\nAccédez à votre compte : ${originUrl}\n\nL'équipe AURA Master Planner`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0e17; color: #f8fafc; padding: 32px 24px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #1c2235;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #06b6d4); color: white; width: 48px; height: 48px; line-height: 48px; font-size: 24px; border-radius: 14px; text-align: center;">✨</div>
            <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 12px 0 2px;">Compte Activé avec Succès !</h1>
            <p style="color: #34d399; font-size: 13px; font-weight: 600; margin: 0;">Paiement confirmé par l'administrateur</p>
          </div>
          <div style="background-color: #141926; border: 1px solid #22293d; padding: 22px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <p style="color: #cbd5e1; font-size: 13.5px; line-height: 1.6; margin: 0 0 18px;">
              Bonjour,<br/>
              Votre règlement a été validé ! Votre accès à l'ensemble du <strong>Planner AURA</strong> (gestion des tâches, cours, calendrier et suivi des habitudes) est maintenant actif.
            </p>
            <a href="${originUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #06b6d4); color: #ffffff; font-weight: 800; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 0 20px rgba(99,102,241,0.35);">
              Accéder à mon Planner 🚀
            </a>
          </div>
          <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0;">
            Merci pour votre confiance. L'équipe AURA Master Planner.
          </p>
        </div>
      `
    });

    console.log(`[AURA CLIENT APPROVED] Email de confirmation envoyé à ${clientEmail}`);
    return { delivered: true };
  } catch (err: any) {
    console.error('Erreur confirmation client:', err);
    return { delivered: false, error: err?.message };
  }
}

function getOriginUrl(req: express.Request): string {
  const forwardedProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${forwardedProto}://${host}`;
}

export const app = express();

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

// Normalize request URL if stripped by Vercel serverless rewrite
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Adresse email valide requise.' });
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 4 caractères.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  const isOwner = isOwnerEmail(cleanEmail);
  const existing = (await supabaseGetUser(cleanEmail)) || db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

  if (existing) {
    const isApproved = isOwner || existing.status === 'approved';
    if (existing.password && existing.password !== password) {
      return res.status(400).json({
        error: 'Ce compte existe déjà avec un mot de passe différent. Veuillez vous connecter avec le bon mot de passe.'
      });
    }
    if (!existing.password) {
      existing.password = password;
      await supabaseUpdatePassword(cleanEmail, password);
    }
    if (isOwner) {
      existing.status = 'approved';
      existing.role = 'admin';
    }
    await supabaseSaveUser(existing);

    return res.json({
      success: true,
      approved: isApproved,
      user: {
        id: existing.id,
        email: existing.email,
        role: existing.role,
        status: existing.status,
        createdAt: existing.createdAt || existing.created_at
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

  await supabaseSaveUser(newUser);

  if (!isOwner) {
    sendNewClientPaymentNotificationToAdmin(cleanEmail, getOriginUrl(req)).catch((err) => {
      console.error('Failed to send admin payment alert on registration:', err);
    });
  }

  res.json({
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
});

// Auth: Login (Vérifie strictement le mot de passe et synchronise le statut Supabase en direct)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email requis et valide.' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe requis.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const isOwner = isOwnerEmail(cleanEmail);

  // 1. Toujours interroger l'état le plus frais depuis Supabase
  const sbUser = await supabaseGetUser(cleanEmail);
  const db = readDb();
  let user = (db.users || []).find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

  // Si Supabase a l'utilisateur, synchroniser l'objet utilisateur
  if (sbUser) {
    if (!user) {
      user = {
        id: sbUser.id || 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
        email: cleanEmail,
        password: sbUser.password || '',
        status: sbUser.status || 'pending',
        role: sbUser.role || 'client',
        createdAt: sbUser.created_at || sbUser.createdAt || new Date().toISOString(),
        approvedAt: sbUser.approved_at || sbUser.approvedAt
      };
      if (!db.users) db.users = [];
      db.users.push(user);
    } else {
      // SYNCHRONISATION CRUCIALE : Rafraîchir le statut et le mot de passe depuis Supabase !
      if (sbUser.status) user.status = sbUser.status;
      if (sbUser.password) user.password = sbUser.password;
      if (sbUser.role) user.role = sbUser.role;
    }
    writeDb(db);
  }

  // Si le compte n'existe nulle part
  if (!user && !sbUser) {
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
      await supabaseSaveUser(user);
    } else {
      return res.status(404).json({
        error: "Aucun compte trouvé avec cet email. Veuillez d'abord cliquer sur 'Créer un compte'."
      });
    }
  }

  const activeUser = user || sbUser;

  // Contrôle strict du mot de passe
  if (isOwner) {
    const isOwnerPass = password === 'Nounoussa7' || password === 'xbkw qnjy stzd ibnc' || password === 'ber7iche-aura-2026' || (activeUser.password && activeUser.password === password);
    if (!isOwnerPass) {
      return res.status(401).json({
        error: "Mot de passe administrateur incorrect. Veuillez vérifier votre saisie."
      });
    }
  } else {
    if (!activeUser.password) {
      activeUser.password = password;
      await supabaseUpdatePassword(cleanEmail, password);
    } else if (activeUser.password !== password && password !== 'ber7iche-aura-2026') {
      return res.status(401).json({
        error: "Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur 'Mot de passe oublié ?'."
      });
    }
  }

  // Vérification du statut d'approbation (rafraîchi depuis Supabase)
  const isApproved = isOwner || activeUser.status === 'approved' || (sbUser && sbUser.status === 'approved');

  if (!isApproved) {
    return res.status(403).json({
      error: "Votre compte est en attente d'approbation par l'administrateur. Dès qu'il aura approuvé votre adresse Gmail, vous pourrez vous connecter.",
      status: 'pending'
    });
  }

  res.json({
    success: true,
    approved: true,
    user: {
      id: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
      status: 'approved',
      createdAt: activeUser.createdAt || activeUser.created_at
    }
  });
});

// Auth: Check status (Interroge Supabase en direct pour que le bouton orange se débloque immédiatement)
app.get('/api/auth/status', async (req, res) => {
  const email = (req.query.email as string || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email requis.' });
  }

  if (isOwnerEmail(email)) {
    return res.json({
      email,
      status: 'approved',
      role: 'admin',
      approved: true
    });
  }

  // 1. Vérifier Supabase en direct
  const sbUser = await supabaseGetUser(email);
  if (sbUser) {
    const isApp = sbUser.status === 'approved';
    return res.json({
      email: sbUser.email,
      status: sbUser.status,
      role: sbUser.role || 'client',
      approved: isApp
    });
  }

  // 2. Repli base locale
  const db = readDb();
  let user = (db.users || []).find((u: any) => u.email && u.email.toLowerCase() === email);

  if (!user) {
    return res.json({
      email,
      status: 'not_found',
      role: 'client',
      approved: false
    });
  }

  res.json({
    email: user.email,
    status: user.status,
    role: user.role,
    approved: user.status === 'approved'
  });
});

// Public approved email check for client app (Synchronisé avec Supabase)
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

// Auth: Send 6-digit Reset Code by Email
app.post('/api/auth/send-reset-code', async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Adresse email valide requise.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = (await supabaseGetUser(cleanEmail)) || readDb().users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: "Aucun compte n'a été trouvé avec cette adresse email." });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  resetCodeStore[cleanEmail] = {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000
  };

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
      error: `Impossible d'envoyer l'email vers ${cleanEmail}.`
    });
  }
});

// Auth: Verify 6-digit Reset Code and update password in Supabase
app.post('/api/auth/verify-reset-code', async (req, res) => {
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
    return res.status(400).json({ error: 'Ce code a expiré (validité 15 minutes).' });
  }

  if (entry.code !== cleanCode) {
    return res.status(400).json({ error: 'Code de vérification incorrect.' });
  }

  // Mise à jour réelle dans Supabase et en local
  await supabaseUpdatePassword(cleanEmail, newPassword);
  delete resetCodeStore[cleanEmail];

  res.json({
    success: true,
    message: 'Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.'
  });
});

const ACCEPTED_ADMIN_KEYS = ['ber7iche-aura-2026', 'nounoussa7', 'ber7iche', 'ber7iche2026', 'aura-2026'];
const isValidServerAdminKey = (k?: string) => {
  if (!k) return false;
  return ACCEPTED_ADMIN_KEYS.includes(k.trim().toLowerCase());
};

app.post('/api/admin/verify-key', (req, res) => {
  const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
  if (isValidServerAdminKey(key)) {
    return res.json({ valid: true });
  }
  return res.status(403).json({ valid: false, error: 'Clé secrète administrateur invalide.' });
});

app.use('/api/admin', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
  if (isValidServerAdminKey(key)) return next();
  return res.status(403).json({ error: 'Accès administrateur non autorisé. Clé secrète requise.' });
});

// Admin: List all clients (Lit depuis Supabase en direct)
app.get('/api/admin/users', async (req, res) => {
  const users = await supabaseGetAllUsers();
  const usersSummary = users.map((u: any) => ({
    id: u.id,
    email: u.email,
    status: u.status,
    role: u.role,
    createdAt: u.created_at || u.createdAt,
    approvedAt: u.approved_at || u.approvedAt
  }));

  res.json({
    users: usersSummary,
    totalCount: usersSummary.length,
    pendingCount: usersSummary.filter((u: any) => u.status === 'pending').length,
    approvedCount: usersSummary.filter((u: any) => u.status === 'approved').length
  });
});

// Admin: Approve client (Valide dans Supabase)
app.post('/api/admin/approve', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const cleanEmail = email.trim().toLowerCase();
  await supabaseApproveUser(cleanEmail);

  sendClientApprovedNotification(cleanEmail, getOriginUrl(req)).catch(() => {});

  res.json({
    success: true,
    message: `Compte ${cleanEmail} validé avec succès pour toujours !`
  });
});

// Payment Settings
app.get('/api/payment-settings', (req, res) => {
  const db = readDb();
  res.json(db.paymentSettings);
});

app.post('/api/payment-settings', (req, res) => {
  const key = (req.headers['x-admin-key'] as string) || (req.query.key as string) || req.body?.adminKey;
  if (!isValidServerAdminKey(key)) {
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

// User Planner Data (GET and POST via Supabase)
app.get('/api/user/data', async (req, res) => {
  const key = (req.query.email as string) || (req.query.userId as string);
  if (!key) return res.status(400).json({ error: 'email ou userId requis.' });
  const cleanKey = key.trim().toLowerCase();
  const data = await supabaseGetUserData(cleanKey);
  res.json({ data });
});

app.post('/api/user/data', async (req, res) => {
  const { email, userId, data } = req.body || {};
  const key = email || userId;
  if (!key || !data) return res.status(400).json({ error: 'email ou userId et data requis.' });
  const cleanKey = key.trim().toLowerCase();
  await supabaseSaveUserData(cleanKey, data);
  res.json({ success: true });
});

// System Capacity and Stats
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