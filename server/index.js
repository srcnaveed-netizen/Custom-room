require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const db = require('./db');
const SqliteSessionStore = require('./session-store');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

app.use(session({
  store: new SqliteSessionStore(),
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    sameSite: 'lax',
  }
}));

// ---------- Uploads ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, db.uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  }
});
app.use('/uploads', express.static(db.uploadsDir));

// ---------- Middleware ----------
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'auth_required', message: 'Login required' });
  next();
}

function requireOwner(req, res, next) {
  if (!req.session.isOwner) return res.status(403).json({ error: 'owner_required', message: 'Owner access required' });
  next();
}

function currentUser(req) {
  if (!req.session.userId) return null;
  const row = db.prepare('SELECT id, email, created_date FROM users WHERE id = ?').get(req.session.userId);
  if (!row) return null;
  return { id: row.id, email: row.email, role: 'user', created_date: row.created_date };
}

// ================= AUTH =================

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and PIN are required.' });
  if (String(password).length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'An account with that email already exists.' });

  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(String(password), 10);
  db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, email.toLowerCase().trim(), hash);

  req.session.userId = id;
  res.json({ id, email: email.toLowerCase().trim(), role: 'user' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase().trim());
  if (!row || !bcrypt.compareSync(String(password || ''), row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or PIN.' });
  }
  req.session.userId = row.id;
  res.json({ id: row.id, email: row.email, role: 'user' });
});

app.post('/api/auth/logout', (req, res) => {
  delete req.session.userId;
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'auth_required' });
  res.json(user);
});

// Password reset — no SMTP configured out of the box, so this generates a token and
// logs the reset link to the server console. Response is always generic (doesn't leak
// whether an email exists), matching standard practice.
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body || {};
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get((email || '').toLowerCase().trim());
  if (row) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 30; // 30 min
    db.prepare('INSERT INTO reset_tokens (token, user_id, expires) VALUES (?, ?, ?)').run(token, row.id, expires);
    const base = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    console.log(`[password reset] ${email} -> ${base}/reset-password?token=${token}`);
  }
  res.json({ success: true });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { resetToken, newPassword } = req.body || {};
  if (!resetToken || !newPassword) return res.status(400).json({ error: 'Missing token or new PIN.' });
  const row = db.prepare('SELECT * FROM reset_tokens WHERE token = ?').get(resetToken);
  if (!row || row.expires < Date.now()) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });

  const hash = bcrypt.hashSync(String(newPassword), 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id);
  db.prepare('DELETE FROM reset_tokens WHERE token = ?').run(resetToken);
  res.json({ success: true });
});

// ================= OWNER (PIN-based, fully separate from player accounts) =================

function getOwnerPin() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'owner_pin'").get();
  if (row) return row.value;
  return process.env.OWNER_PIN || null;
}

app.post('/api/owner/login', (req, res) => {
  const { pin } = req.body || {};
  const ownerPin = getOwnerPin();
  if (!ownerPin) return res.status(500).json({ error: 'OWNER_PIN is not configured on the server.' });
  if (!pin || String(pin) !== String(ownerPin)) return res.status(401).json({ error: 'Incorrect PIN.' });
  req.session.isOwner = true;
  res.json({ success: true });
});

app.post('/api/owner/logout', (req, res) => {
  delete req.session.isOwner;
  res.json({ success: true });
});

app.get('/api/owner/status', (req, res) => {
  res.json({ isOwner: !!req.session.isOwner });
});

app.post('/api/owner/change-pin', requireOwner, (req, res) => {
  const { currentPin, newPin } = req.body || {};
  const ownerPin = getOwnerPin();
  if (!currentPin || String(currentPin) !== String(ownerPin)) {
    return res.status(401).json({ error: 'Current PIN is incorrect.' });
  }
  if (!newPin || String(newPin).length < 4) {
    return res.status(400).json({ error: 'New PIN must be at least 4 characters.' });
  }
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('owner_pin', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(newPin));
  res.json({ success: true });
});

// ================= ROOMS =================

function roomRowToEntity(row, { includeCredentials }) {
  const entity = {
    id: row.id,
    title: row.title,
    photo: row.photo || '',
    date_time: row.date_time,
    mode: row.mode,
    uc_per_kill: row.uc_per_kill,
    max_players: row.max_players,
    status: row.status,
    reveal_details: !!row.reveal_details,
    sort_order: row.sort_order,
    created_date: row.created_date,
  };
  if (includeCredentials) {
    entity.room_id = row.room_id || '';
    entity.room_password = row.room_password || '';
  }
  return entity;
}

app.get('/api/rooms', (req, res) => {
  const rows = db.prepare('SELECT * FROM rooms ORDER BY created_date DESC').all();
  // Room list doesn't need credentials — those are only fetched on the room detail page
  res.json(rows.map((r) => roomRowToEntity(r, { includeCredentials: req.session.isOwner === true })));
});

app.get('/api/rooms/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Room not found.' });

  let includeCredentials = req.session.isOwner === true;
  if (!includeCredentials && row.status === 'Live' && row.reveal_details && req.session.userId) {
    const mySignup = db.prepare('SELECT id FROM signups WHERE room_id = ? AND created_by_id = ?').get(row.id, req.session.userId);
    if (mySignup) includeCredentials = true;
  }
  res.json(roomRowToEntity(row, { includeCredentials }));
});

app.post('/api/rooms', requireOwner, (req, res) => {
  const b = req.body || {};
  const ucPerKill = b.uc_per_kill !== undefined ? b.uc_per_kill : b.prize_pool;
  if (!b.title || !b.date_time || !b.mode || ucPerKill == null || !b.max_players) {
    return res.status(400).json({ error: 'Missing required room fields.' });
  }
  const id = crypto.randomUUID();
  const maxSort = db.prepare('SELECT MAX(sort_order) as m FROM rooms').get().m;
  db.prepare(`
    INSERT INTO rooms (id, title, photo, date_time, mode, uc_per_kill, max_players, status, room_id, room_password, reveal_details, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, b.title, b.photo || '', b.date_time, b.mode, Number(ucPerKill), Number(b.max_players),
    b.status || 'Open', b.room_id || '', b.room_password || '', b.reveal_details ? 1 : 0,
    (maxSort == null ? 0 : maxSort + 1)
  );
  const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  res.json(roomRowToEntity(row, { includeCredentials: true }));
});

app.put('/api/rooms/:id', requireOwner, (req, res) => {
  const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Room not found.' });
  const b = req.body || {};
  const bodyUcPerKill = b.uc_per_kill !== undefined ? b.uc_per_kill : b.prize_pool;
  const merged = {
    title: b.title !== undefined ? b.title : row.title,
    photo: b.photo !== undefined ? b.photo : row.photo,
    date_time: b.date_time !== undefined ? b.date_time : row.date_time,
    mode: b.mode !== undefined ? b.mode : row.mode,
    uc_per_kill: bodyUcPerKill !== undefined ? Number(bodyUcPerKill) : row.uc_per_kill,
    max_players: b.max_players !== undefined ? Number(b.max_players) : row.max_players,
    status: b.status !== undefined ? b.status : row.status,
    room_id: b.room_id !== undefined ? b.room_id : row.room_id,
    room_password: b.room_password !== undefined ? b.room_password : row.room_password,
    reveal_details: b.reveal_details !== undefined ? (b.reveal_details ? 1 : 0) : row.reveal_details,
  };
  db.prepare(`
    UPDATE rooms SET title=?, photo=?, date_time=?, mode=?, uc_per_kill=?, max_players=?, status=?, room_id=?, room_password=?, reveal_details=?
    WHERE id=?
  `).run(
    merged.title, merged.photo, merged.date_time, merged.mode, merged.uc_per_kill, merged.max_players,
    merged.status, merged.room_id, merged.room_password, merged.reveal_details, req.params.id
  );
  const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  res.json(roomRowToEntity(updated, { includeCredentials: true }));
});

app.delete('/api/rooms/:id', requireOwner, (req, res) => {
  db.prepare('DELETE FROM signups WHERE room_id = ?').run(req.params.id);
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/rooms/bulk-update', requireOwner, (req, res) => {
  const updates = Array.isArray(req.body) ? req.body : (req.body?.updates || []);
  const stmt = db.prepare('UPDATE rooms SET sort_order = ? WHERE id = ?');
  for (const u of updates) {
    if (u && u.id != null && u.sort_order != null) stmt.run(Number(u.sort_order), u.id);
  }
  res.json({ success: true });
});

// ================= SIGNUPS =================

function signupRowFull(row) {
  return {
    id: row.id,
    room_id: row.room_id,
    pubg_ign: row.pubg_ign,
    pubg_uid: row.pubg_uid,
    discord_tag: row.discord_tag || '',
    squad_name: row.squad_name || '',
    rank: row.rank || 'none',
    kills: row.kills ?? 0,
    uc_amount: row.uc_amount ?? 0,
    payout_status: row.payout_status || 'Pending',
    created_by_id: row.created_by_id,
    created_date: row.created_date,
  };
}

// Redacted shape for visitors who aren't the Owner and aren't the signup's own creator —
// enough for public room-count / "am I signed up" checks, without exposing other
// players' PUBG UID, Discord tag, rank, or UC payout info.
function signupRowRedacted(row) {
  return {
    id: row.id,
    room_id: row.room_id,
    created_by_id: row.created_by_id,
    created_date: row.created_date,
  };
}

app.get('/api/signups', (req, res) => {
  const { room_id } = req.query;
  let rows = db.prepare('SELECT * FROM signups ORDER BY created_date DESC').all();
  if (room_id) rows = rows.filter((r) => r.room_id === room_id);

  if (req.session.isOwner) {
    return res.json(rows.map(signupRowFull));
  }

  const myId = req.session.userId || null;
  res.json(rows.map((r) => (myId && r.created_by_id === myId ? signupRowFull(r) : signupRowRedacted(r))));
});

app.post('/api/signups', requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.room_id || !b.pubg_ign || !b.pubg_uid) {
    return res.status(400).json({ error: 'room_id, pubg_ign, and pubg_uid are required.' });
  }
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(b.room_id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  const already = db.prepare('SELECT id FROM signups WHERE room_id = ? AND created_by_id = ?').get(b.room_id, req.session.userId);
  if (already) return res.status(400).json({ error: 'You already signed up for this room.' });

  const count = db.prepare('SELECT COUNT(*) as c FROM signups WHERE room_id = ?').get(b.room_id).c;
  if (count >= room.max_players) return res.status(400).json({ error: 'This room is full.' });

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO signups (id, room_id, pubg_ign, pubg_uid, discord_tag, squad_name, created_by_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, b.room_id, b.pubg_ign.trim(), b.pubg_uid.trim(), (b.discord_tag || '').trim(), (b.squad_name || '').trim(), req.session.userId);

  const row = db.prepare('SELECT * FROM signups WHERE id = ?').get(id);
  res.json(signupRowFull(row));
});

app.put('/api/signups/:id', requireOwner, (req, res) => {
  const row = db.prepare('SELECT * FROM signups WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Signup not found.' });

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(row.room_id);
  if (!room || room.status !== 'Completed') {
    return res.status(400).json({ error: 'Results can only be entered once the room is marked Completed.' });
  }

  const b = req.body || {};
  const kills = b.kills !== undefined ? Number(b.kills) : row.kills;
  const merged = {
    rank: b.rank !== undefined ? b.rank : row.rank,
    kills,
    // UC is always derived from kills × the room's UC-per-kill rate — never trusted from the client
    uc_amount: kills * (room.uc_per_kill || 0),
    payout_status: b.payout_status !== undefined ? b.payout_status : row.payout_status,
  };
  db.prepare('UPDATE signups SET rank=?, kills=?, uc_amount=?, payout_status=? WHERE id=?')
    .run(merged.rank, merged.kills, merged.uc_amount, merged.payout_status, req.params.id);
  const updated = db.prepare('SELECT * FROM signups WHERE id = ?').get(req.params.id);
  res.json(signupRowFull(updated));
});

app.delete('/api/signups/:id', requireOwner, (req, res) => {
  db.prepare('DELETE FROM signups WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/signups', requireOwner, (req, res) => {
  const { room_id } = req.query;
  if (!room_id) return res.status(400).json({ error: 'room_id query param required.' });
  db.prepare('DELETE FROM signups WHERE room_id = ?').run(room_id);
  res.json({ success: true });
});

// ================= UPLOAD =================

app.post('/api/upload', requireOwner, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });
    res.json({ file_url: `/uploads/${req.file.filename}` });
  });
});

// ================= STATIC FRONTEND (production) =================

if (isProd) {
  const distDir = path.join(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`PUBG Custom Room Manager backend running on port ${PORT}`);
  if (!process.env.OWNER_PIN) {
    console.warn('[warn] OWNER_PIN is not set — the Owner panel will be inaccessible until it is set.');
  }
});
