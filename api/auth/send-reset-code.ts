import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Adresse email valide requise.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const user = process.env.SMTP_USER || 'ber7iche@gmail.com';
  const pass = (process.env.SMTP_PASS || 'xbkwqnjystzdibnc').replace(/\s+/g, '');
  const fromName = 'AURA Master Planner';

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to: cleanEmail,
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
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
          </p>
        </div>
      `
    });

    console.log(`[AURA EMAIL VERCEL] Code ${code} envoyé avec succès à ${cleanEmail}`);
    return res.status(200).json({
      success: true,
      delivered: true,
      code,
      message: `Code secret envoyé avec succès à ${cleanEmail} ! Vérifiez votre boîte de réception Gmail.`
    });
  } catch (err: any) {
    console.error('Vercel SMTP error:', err);
    return res.status(200).json({
      success: true,
      delivered: false,
      previewCode: code,
      code,
      error: err?.message,
      message: `Code de sécurité généré pour ${cleanEmail} !`
    });
  }
}
