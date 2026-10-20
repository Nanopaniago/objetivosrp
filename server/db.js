import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = process.env.DATA_DIR || path.resolve('data');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','seller')),
  store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
  igl INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS manager_stores (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, store_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('eur','un')),
  icon TEXT NOT NULL DEFAULT 'target',
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  target REAL NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, category_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_goals_store_period ON goals(store_id, year, month);

-- Accumulated month-to-date value reported on a given date
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  value REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import')),
  import_id INTEGER REFERENCES imports(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, category_id, date)
);
CREATE INDEX IF NOT EXISTS idx_results_store_date ON results(store_id, date);

-- A = abertura, F = fecho, L = horário livre, O = folga, V = férias
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('A','F','L','O','V')),
  start_time TEXT,
  end_time TEXT,
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_schedules_store_date ON schedules(store_id, date);

CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('results','schedule')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','committed','undone')),
  ref TEXT,
  image_path TEXT,
  parsed_json TEXT,
  backup_json TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  committed_at TEXT
);

CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  target REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const DEFAULT_CATEGORIES = [
  { slug: 'plus_master', name: 'Plus Master', unit: 'eur', icon: 'crown', sort: 1 },
  { slug: 'plus', name: 'Plus', unit: 'eur', icon: 'zap', sort: 2 },
  { slug: 'megas_total', name: 'Megas Total', unit: 'eur', icon: 'wifi', sort: 3 },
  { slug: 'dm_classicas', name: 'DM Clássicas', unit: 'eur', icon: 'box', sort: 4 },
  { slug: 'dimobilli', name: 'Dimobilli', unit: 'un', icon: 'smartphone', sort: 5 },
  { slug: 'peliculas', name: 'Películas', unit: 'un', icon: 'shield', sort: 6 },
];

export function openDb(file) {
  const target = file || path.join(DATA_DIR, 'objetivos.db');
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new DatabaseSync(target);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  // migrations
  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userCols.includes('avatar')) db.exec('ALTER TABLE users ADD COLUMN avatar INTEGER NOT NULL DEFAULT 0');
  const count = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (count === 0) {
    const ins = db.prepare('INSERT INTO categories (slug, name, unit, icon, sort) VALUES (?, ?, ?, ?, ?)');
    for (const c of DEFAULT_CATEGORIES) ins.run(c.slug, c.name, c.unit, c.icon, c.sort);
  }
  return db;
}

/** Runs fn inside a transaction; rolls back on error. */
export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** Lowercase, no accents, first word — used to match sellers by first name. */
export function firstNameKey(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)[0]
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
