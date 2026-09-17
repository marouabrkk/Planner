import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { readDb, writeDb, ADMIN_EMAIL } from './server-db.ts';

export const ADMIN_SECRET_KEY = 'ber7iche-aura-2026';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà.' });
    }

    const isOwner = cleanEmail === ADMIN_EMAIL.toLowerCase();
    const newUser = {
      id: 'u_' + Buffer.from(cleanEmail).toString('base64').replace(/=/g, ''),
      email: cleanEmail,
      password: password, // In prod you would hash with bcrypt
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

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    // Auto-create or ensure owner if ADMIN_EMAIL
    if (!user && cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      user = {
        id: 'admin_owner',
        email: ADMIN_EMAIL,
        password: password,
        status: 'approved',
        role: 'admin',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      };
      db.users.push(user);
      writeDb(db);
    }

    if (!user) {
      return res.status(404).json({ error: 'Aucun compte trouvé avec cet email. Veuillez créer un compte.' });
    }

    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Mot de passe incorrect.' });
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

  // Auth: Check status
  app.get('/api/auth/status', (req, res) => {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email requis.' });
    }

    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === email);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
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
