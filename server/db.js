const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = path.join(dataDir, 'app.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_date TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    photo TEXT,
    date_time TEXT NOT NULL,
    mode TEXT NOT NULL,
    prize_pool REAL NOT NULL DEFAULT 0,
    max_players INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    room_id TEXT,
    room_password TEXT,
    reveal_details INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_date TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS signups (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    pubg_ign TEXT NOT NULL,
    pubg_uid TEXT NOT NULL,
    discord_tag TEXT,
    squad_name TEXT,
    rank TEXT NOT NULL DEFAULT 'none',
    kills INTEGER NOT NULL DEFAULT 0,
    uc_amount REAL NOT NULL DEFAULT 0,
    payout_status TEXT NOT NULL DEFAULT 'Pending',
    created_by_id TEXT NOT NULL,
    created_date TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expires INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reset_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// --- Migration: rename prize_pool -> uc_per_kill (safe to re-run, idempotent) ---
try {
  db.exec('ALTER TABLE rooms ADD COLUMN uc_per_kill REAL NOT NULL DEFAULT 0');
  // Backfill from the old prize_pool column so existing rooms don't lose their value
  db.exec('UPDATE rooms SET uc_per_kill = prize_pool WHERE uc_per_kill = 0');
} catch (e) {
  // Column already exists — migration already applied, nothing to do
}

// --- Seed owner PIN into settings table from env var, if not already set ---
// This lets the Owner change their PIN later from the dashboard without redeploying.
const existingPin = db.prepare("SELECT value FROM settings WHERE key = 'owner_pin'").get();
if (!existingPin && process.env.OWNER_PIN) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('owner_pin', ?)").run(process.env.OWNER_PIN);
}

module.exports = db;
module.exports.uploadsDir = uploadsDir;
module.exports.dataDir = dataDir;
