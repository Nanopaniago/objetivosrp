import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { DATA_DIR, firstNameKey, tx } from './db.js';
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth, assertView, assertManage, assertAdmin, storeIdsFor } from './auth.js';
import { loadCategories, sellerDashboard, teamDashboard, adminDashboard, todayStr } from './services.js';
import { readResultsImage, readScheduleImage } from './gemini.js';
import { prepareResults, commitResults, prepareSchedule, writeSchedule, undoImport } from './imports.js';

const bad = (msg) => new HTTPException(400, { message: msg });
const int = (v, name) => {
  const n = Number(v);
  if (!Number.isInteger(n)) throw bad(`Parâmetro inválido: ${name}.`);
  return n;
};
const str = (v, name, { min = 1, max = 120 } = {}) => {
  const s = String(v ?? '').trim();
  if (s.length < min || s.length > max) throw bad(`Campo inválido: ${name}.`);
  return s;
};
const period = (c) => {
  const t = todayStr();
  const y = c.req.query('year') ? int(c.req.query('year'), 'year') : Number(t.slice(0, 4));
  const m = c.req.query('month') ? int(c.req.query('month'), 'month') : Number(t.slice(5, 7));
  if (m < 1 || m > 12) throw bad('Mês inválido.');
  return [y, m];
};
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

const ICONS = new Set(['crown', 'zap', 'wifi', 'box', 'smartphone', 'shield', 'target', 'star', 'gift', 'tag', 'package', 'tv', 'coffee', 'headphones']);

export function createApp(db) {
  const app = new Hono();
  const auth = requireAuth(db);
  const attempts = new Map();

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: 'Erro inesperado no servidor.' }, 500);
  });

  app.get('/api/health', (c) => c.json({ ok: true }));

  // ------------------------------------------------------------------ auth
  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const username = String(body.username || '').trim();
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'local';
    const key = `${ip}|${username.toLowerCase()}`;
    const now = Date.now();
    const recent = (attempts.get(key) || []).filter((t) => now - t < 15 * 60000);
    if (recent.length >= 8) throw new HTTPException(429, { message: 'Demasiadas tentativas. Espera 15 minutos.' });
    const user = db.prepare('SELECT id, password_hash, active FROM users WHERE username = ?').get(username);
    if (!user || !user.active || !verifyPassword(body.password || '', user.password_hash)) {
      attempts.set(key, [...recent, now]);
      throw new HTTPException(401, { message: 'Utilizador ou palavra-passe errados.' });
    }
    attempts.delete(key);
    db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString());
    createSession(db, c, user.id);
    return c.json({ ok: true });
  });

  app.post('/api/auth/logout', (c) => {
    destroySession(db, c);
    return c.json({ ok: true });
  });

  app.use('/api/*', async (c, next) => {
    if (c.req.path === '/api/health' || c.req.path.startsWith('/api/auth/login') || c.req.path.startsWith('/api/auth/logout')) return next();
    return auth(c, next);
  });

  app.get('/api/me', (c) => {
    const u = c.get('user');
    const stores = u.store_ids.length
      ? db.prepare(`SELECT id, name, code FROM stores WHERE active = 1 AND id IN (${u.store_ids.map(() => '?').join(',')}) ORDER BY name`).all(...u.store_ids)
      : [];
    return c.json({ user: { id: u.id, name: u.name, firstName: u.first_name, username: u.username, role: u.role, storeId: u.store_id, igl: !!u.igl }, stores, today: todayStr() });
  });

  app.patch('/api/me/password', async (c) => {
    const u = c.get('user');
    const body = await c.req.json();
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(u.id);
    if (!verifyPassword(body.current || '', row.password_hash)) throw bad('A palavra-passe atual está errada.');
    const next = str(body.next, 'nova palavra-passe', { min: 8, max: 200 });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), u.id);
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------- stores
  app.get('/api/stores', (c) => {
    const u = c.get('user');
    const all = db.prepare('SELECT id, name, code, active FROM stores ORDER BY name').all();
    return c.json(u.role === 'admin' ? all : all.filter((s) => u.store_ids.includes(s.id)));
  });

  app.post('/api/stores', async (c) => {
    assertAdmin(c.get('user'));
    const b = await c.req.json();
    const r = db.prepare('INSERT INTO stores (name, code) VALUES (?, ?)').run(str(b.name, 'nome'), b.code ? String(b.code).trim().slice(0, 20) : null);
    return c.json({ id: Number(r.lastInsertRowid) }, 201);
  });

  app.patch('/api/stores/:id', async (c) => {
    assertAdmin(c.get('user'));
    const id = int(c.req.param('id'), 'id');
    const b = await c.req.json();
    const s = db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
    if (!s) throw new HTTPException(404, { message: 'Loja não encontrada.' });
    db.prepare('UPDATE stores SET name = ?, code = ?, active = ? WHERE id = ?').run(
      b.name !== undefined ? str(b.name, 'nome') : s.name,
      b.code !== undefined ? String(b.code || '').trim().slice(0, 20) || null : s.code,
      b.active !== undefined ? (b.active ? 1 : 0) : s.active,
      id
    );
    return c.json({ ok: true });
  });

  // ----------------------------------------------------------------- users
  const publicUser = (u) => ({ id: u.id, name: u.name, firstName: u.first_name, username: u.username, role: u.role, storeId: u.store_id, igl: !!u.igl, active: !!u.active });

  app.get('/api/users', (c) => {
    const u = c.get('user');
    const storeId = int(c.req.query('store_id'), 'store_id');
    assertManage(u, storeId);
    const rows = db
      .prepare(`SELECT DISTINCT u.* FROM users u LEFT JOIN manager_stores ms ON ms.user_id = u.id WHERE u.store_id = ? OR ms.store_id = ? ORDER BY u.role DESC, u.name`)
      .all(storeId, storeId);
    return c.json(rows.map(publicUser));
  });

  app.post('/api/users', async (c) => {
    const u = c.get('user');
    const b = await c.req.json();
    const role = ['admin', 'manager', 'seller'].includes(b.role) ? b.role : 'seller';
    const storeId = b.store_id ? int(b.store_id, 'store_id') : null;
    if (role !== 'seller') assertAdmin(u);
    else assertManage(u, storeId);
    if (role === 'seller' && !storeId) throw bad('O vendedor precisa de uma loja.');
    const name = str(b.name, 'nome');
    const username = str(b.username, 'utilizador', { min: 3, max: 40 }).toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(username)) throw bad('O utilizador só pode ter letras, números, ponto, hífen e underscore.');
    const password = str(b.password, 'palavra-passe', { min: 8, max: 200 });
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw bad('Esse utilizador já existe.');
    const id = tx(db, () => {
      const r = db
        .prepare('INSERT INTO users (name, first_name, username, password_hash, role, store_id, igl) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(name, name.split(/\s+/)[0], username, hashPassword(password), role, storeId, b.igl ? 1 : 0);
      const newId = Number(r.lastInsertRowid);
      if (role === 'manager') for (const sid of [storeId, ...(b.store_ids || [])].filter(Boolean)) db.prepare('INSERT OR IGNORE INTO manager_stores (user_id, store_id) VALUES (?, ?)').run(newId, int(sid, 'store_ids'));
      return newId;
    });
    return c.json({ id }, 201);
  });

  app.patch('/api/users/:id', async (c) => {
    const u = c.get('user');
    const id = int(c.req.param('id'), 'id');
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) throw new HTTPException(404, { message: 'Utilizador não encontrado.' });
    if (target.role !== 'seller' || u.role !== 'admin') {
      if (target.role !== 'seller') assertAdmin(u);
      else assertManage(u, target.store_id);
    }
    const b = await c.req.json();
    const name = b.name !== undefined ? str(b.name, 'nome') : target.name;
    let storeId = target.store_id;
    if (b.store_id !== undefined) {
      storeId = b.store_id ? int(b.store_id, 'store_id') : null;
      if (storeId) assertManage(u, storeId);
    }
    let role = target.role;
    if (b.role !== undefined && b.role !== target.role) {
      assertAdmin(u);
      if (!['admin', 'manager', 'seller'].includes(b.role)) throw bad('Função inválida.');
      role = b.role;
    }
    if (id === u.id && (role !== u.role || b.active === false)) throw bad('Não podes alterar a tua própria função nem desativar-te.');
    tx(db, () => {
      db.prepare('UPDATE users SET name = ?, first_name = ?, store_id = ?, role = ?, igl = ?, active = ? WHERE id = ?').run(
        name,
        name.split(/\s+/)[0],
        storeId,
        role,
        b.igl !== undefined ? (b.igl ? 1 : 0) : target.igl,
        b.active !== undefined ? (b.active ? 1 : 0) : target.active,
        id
      );
      if (b.password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(str(b.password, 'palavra-passe', { min: 8, max: 200 })), id);
      if (b.active === false || b.password) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      if (Array.isArray(b.store_ids) && u.role === 'admin') {
        db.prepare('DELETE FROM manager_stores WHERE user_id = ?').run(id);
        for (const sid of b.store_ids) db.prepare('INSERT OR IGNORE INTO manager_stores (user_id, store_id) VALUES (?, ?)').run(id, int(sid, 'store_ids'));
      }
    });
    return c.json({ ok: true });
  });

  // ------------------------------------------------------------ categories
  app.get('/api/categories', (c) => c.json(loadCategories(db, c.req.query('all') === '1')));

  app.post('/api/categories', async (c) => {
    assertAdmin(c.get('user'));
    const b = await c.req.json();
    const name = str(b.name, 'nome', { max: 40 });
    const slug = firstNameKey(name) + '_' + Date.now().toString(36);
    const unit = b.unit === 'un' ? 'un' : 'eur';
    const icon = ICONS.has(b.icon) ? b.icon : 'target';
    const sort = (db.prepare('SELECT MAX(sort) AS s FROM categories').get().s || 0) + 1;
    const r = db.prepare('INSERT INTO categories (slug, name, unit, icon, sort) VALUES (?, ?, ?, ?, ?)').run(slug, name, unit, icon, sort);
    return c.json({ id: Number(r.lastInsertRowid) }, 201);
  });

  app.patch('/api/categories/:id', async (c) => {
    assertAdmin(c.get('user'));
    const id = int(c.req.param('id'), 'id');
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!cat) throw new HTTPException(404, { message: 'Categoria não encontrada.' });
    const b = await c.req.json();
    db.prepare('UPDATE categories SET name = ?, unit = ?, icon = ?, sort = ?, active = ? WHERE id = ?').run(
      b.name !== undefined ? str(b.name, 'nome', { max: 40 }) : cat.name,
      b.unit !== undefined ? (b.unit === 'un' ? 'un' : 'eur') : cat.unit,
      b.icon !== undefined && ICONS.has(b.icon) ? b.icon : cat.icon,
      b.sort !== undefined ? int(b.sort, 'sort') : cat.sort,
      b.active !== undefined ? (b.active ? 1 : 0) : cat.active,
      id
    );
    return c.json({ ok: true });
  });

  // ----------------------------------------------------------------- goals
  app.get('/api/goals', (c) => {
    const storeId = int(c.req.query('store_id'), 'store_id');
    assertView(c.get('user'), storeId);
    const [y, m] = period(c);
    return c.json(db.prepare('SELECT user_id, category_id, target FROM goals WHERE store_id = ? AND year = ? AND month = ?').all(storeId, y, m));
  });

  app.put('/api/goals', async (c) => {
    const b = await c.req.json();
    const storeId = int(b.store_id, 'store_id');
    assertManage(c.get('user'), storeId);
    const y = int(b.year, 'year');
    const m = int(b.month, 'month');
    const sellers = new Set(db.prepare(`SELECT id FROM users WHERE store_id = ? AND role = 'seller'`).all(storeId).map((r) => r.id));
    tx(db, () => {
      const up = db.prepare(
        `INSERT INTO goals (store_id, user_id, category_id, year, month, target, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, category_id, year, month) DO UPDATE SET target = excluded.target, updated_at = excluded.updated_at`
      );
      const del = db.prepare('DELETE FROM goals WHERE user_id = ? AND category_id = ? AND year = ? AND month = ?');
      for (const it of b.items || []) {
        const uid = int(it.user_id, 'user_id');
        if (!sellers.has(uid)) continue;
        const t = Number(it.target);
        if (!it.target || !Number.isFinite(t) || t <= 0) del.run(uid, int(it.category_id, 'category_id'), y, m);
        else up.run(storeId, uid, int(it.category_id, 'category_id'), y, m, t);
      }
    });
    return c.json({ ok: true });
  });

  // --------------------------------------------------------------- results
  app.get('/api/results', (c) => {
    const storeId = int(c.req.query('store_id'), 'store_id');
    assertView(c.get('user'), storeId);
    const date = c.req.query('date');
    if (!isDate(date)) throw bad('Data inválida.');
    const rows = db.prepare('SELECT user_id, category_id, value, source FROM results WHERE store_id = ? AND date = ?').all(storeId, date);
    const previous = db
      .prepare(
        `SELECT r.user_id, r.category_id, r.value, r.date FROM results r
         WHERE r.store_id = ? AND r.date < ? AND r.date >= ? AND r.date = (SELECT MAX(date) FROM results r2 WHERE r2.user_id = r.user_id AND r2.category_id = r.category_id AND r2.date < ? AND r2.date >= ?)`
      )
      .all(storeId, date, date.slice(0, 8) + '01', date, date.slice(0, 8) + '01');
    return c.json({ rows, previous });
  });

  app.put('/api/results', async (c) => {
    const u = c.get('user');
    const b = await c.req.json();
    const storeId = int(b.store_id, 'store_id');
    assertManage(u, storeId);
    if (!isDate(b.date)) throw bad('Data inválida.');
    const sellers = new Set(db.prepare(`SELECT id FROM users WHERE store_id = ? AND role = 'seller'`).all(storeId).map((r) => r.id));
    tx(db, () => {
      const up = db.prepare(
        `INSERT INTO results (store_id, user_id, category_id, date, value, source, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, 'manual', ?, datetime('now'))
         ON CONFLICT(user_id, category_id, date) DO UPDATE SET value = excluded.value, source = 'manual', import_id = NULL, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
      );
      const del = db.prepare('DELETE FROM results WHERE user_id = ? AND category_id = ? AND date = ?');
      for (const it of b.items || []) {
        const uid = int(it.user_id, 'user_id');
        if (!sellers.has(uid)) continue;
        const cid = int(it.category_id, 'category_id');
        if (it.value === null || it.value === '') del.run(uid, cid, b.date);
        else {
          const v = Number(it.value);
          if (!Number.isFinite(v) || v < 0) throw bad('Valor inválido.');
          up.run(storeId, uid, cid, b.date, v, u.id);
        }
      }
    });
    return c.json({ ok: true });
  });

  // ------------------------------------------------------------- schedules
  app.get('/api/schedules', (c) => {
    const storeId = int(c.req.query('store_id'), 'store_id');
    assertView(c.get('user'), storeId);
    const [y, m] = period(c);
    const pre = `${y}-${String(m).padStart(2, '0')}-%`;
    return c.json(db.prepare('SELECT user_id, date, kind, start_time, end_time FROM schedules WHERE store_id = ? AND date LIKE ?').all(storeId, pre));
  });

  app.put('/api/schedules', async (c) => {
    const b = await c.req.json();
    const storeId = int(b.store_id, 'store_id');
    assertManage(c.get('user'), storeId);
    return c.json(writeSchedule(db, storeId, int(b.year, 'year'), int(b.month, 'month'), b.rows));
  });

  // --------------------------------------------------------------- imports
  const saveImage = async (c) => {
    const form = await c.req.parseBody();
    const file = form.image;
    if (!file || typeof file === 'string') throw bad('Falta a imagem.');
    if (!/^image\/(png|jpe?g|webp|heic|heif)$/.test(file.type)) throw bad('Formato não suportado. Usa PNG, JPG ou WEBP.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { form, image: { type: file.type, bytes } };
  };
  const storeImage = (id, image) => {
    const dir = path.join(DATA_DIR, 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    const ext = image.type.split('/')[1].replace('jpeg', 'jpg');
    const p = path.join(dir, `${id}.${ext}`);
    fs.writeFileSync(p, image.bytes);
    return p;
  };
  const imageLimit = bodyLimit({ maxSize: 12 * 1024 * 1024, onError: (c) => c.json({ error: 'A imagem é demasiado grande (máximo 12 MB).' }, 413) });

  app.post('/api/imports/results', imageLimit, async (c) => {
    const u = c.get('user');
    const { form, image } = await saveImage(c);
    const storeId = int(form.store_id, 'store_id');
    assertManage(u, storeId);
    const fallback = isDate(form.date) ? form.date : todayStr();
    const parsed = await readResultsImage(image, { categories: loadCategories(db) });
    const draft = prepareResults(db, storeId, parsed, fallback);
    const r = db.prepare(`INSERT INTO imports (store_id, kind, ref, parsed_json, created_by) VALUES (?, 'results', ?, ?, ?)`).run(storeId, draft.date, JSON.stringify(draft), u.id);
    const id = Number(r.lastInsertRowid);
    db.prepare('UPDATE imports SET image_path = ? WHERE id = ?').run(storeImage(id, image), id);
    return c.json({ id, draft });
  });

  app.post('/api/imports/schedule', imageLimit, async (c) => {
    const u = c.get('user');
    const { form, image } = await saveImage(c);
    const storeId = int(form.store_id, 'store_id');
    assertManage(u, storeId);
    const y = int(form.year, 'year');
    const m = int(form.month, 'month');
    const parsed = await readScheduleImage(image, { year: y, month: m });
    const draft = prepareSchedule(db, storeId, parsed, y, m);
    const r = db.prepare(`INSERT INTO imports (store_id, kind, ref, parsed_json, created_by) VALUES (?, 'schedule', ?, ?, ?)`).run(storeId, `${y}-${String(m).padStart(2, '0')}`, JSON.stringify(draft), u.id);
    const id = Number(r.lastInsertRowid);
    db.prepare('UPDATE imports SET image_path = ? WHERE id = ?').run(storeImage(id, image), id);
    return c.json({ id, draft });
  });

  const loadImport = (c) => {
    const imp = db.prepare('SELECT * FROM imports WHERE id = ?').get(int(c.req.param('id'), 'id'));
    if (!imp) throw new HTTPException(404, { message: 'Importação não encontrada.' });
    assertManage(c.get('user'), imp.store_id);
    return imp;
  };

  app.get('/api/imports/:id/image', (c) => {
    const imp = loadImport(c);
    if (!imp.image_path || !fs.existsSync(imp.image_path)) throw new HTTPException(404, { message: 'Imagem não encontrada.' });
    const ext = path.extname(imp.image_path).slice(1);
    return c.body(fs.readFileSync(imp.image_path), 200, { 'content-type': `image/${ext === 'jpg' ? 'jpeg' : ext}`, 'cache-control': 'private, max-age=3600' });
  });

  app.post('/api/imports/:id/commit', async (c) => {
    const imp = loadImport(c);
    if (imp.status !== 'draft') throw bad('Esta importação já foi tratada.');
    const b = await c.req.json();
    if (imp.kind === 'results') return c.json(commitResults(db, imp, c.get('user'), b));
    const [y, m] = imp.ref.split('-').map(Number);
    return c.json(writeSchedule(db, imp.store_id, y, m, b.rows, imp.id));
  });

  app.post('/api/imports/:id/undo', (c) => {
    undoImport(db, loadImport(c));
    return c.json({ ok: true });
  });

  app.get('/api/imports', (c) => {
    const storeId = int(c.req.query('store_id'), 'store_id');
    assertManage(c.get('user'), storeId);
    return c.json(
      db
        .prepare(`SELECT i.id, i.kind, i.status, i.ref, i.created_at, i.committed_at, u.first_name AS by FROM imports i LEFT JOIN users u ON u.id = i.created_by WHERE i.store_id = ? AND i.status != 'draft' ORDER BY i.id DESC LIMIT 20`)
        .all(storeId)
    );
  });

  // ------------------------------------------------------------ challenges
  app.get('/api/challenges', (c) => {
    const storeId = int(c.req.query('store_id'), 'store_id');
    assertView(c.get('user'), storeId);
    return c.json(db.prepare('SELECT * FROM challenges WHERE store_id = ? ORDER BY start_date DESC LIMIT 30').all(storeId));
  });

  app.post('/api/challenges', async (c) => {
    const b = await c.req.json();
    const storeId = int(b.store_id, 'store_id');
    assertManage(c.get('user'), storeId);
    if (!isDate(b.start_date) || !isDate(b.end_date) || b.end_date < b.start_date) throw bad('Datas inválidas.');
    const target = Number(b.target);
    if (!(target > 0)) throw bad('Objetivo inválido.');
    const r = db
      .prepare('INSERT INTO challenges (store_id, title, category_id, target, start_date, end_date, points) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(storeId, str(b.title, 'título', { max: 60 }), int(b.category_id, 'category_id'), target, b.start_date, b.end_date, Math.min(500, Math.max(0, Number(b.points) || 50)));
    return c.json({ id: Number(r.lastInsertRowid) }, 201);
  });

  app.delete('/api/challenges/:id', (c) => {
    const ch = db.prepare('SELECT * FROM challenges WHERE id = ?').get(int(c.req.param('id'), 'id'));
    if (!ch) throw new HTTPException(404, { message: 'Desafio não encontrado.' });
    assertManage(c.get('user'), ch.store_id);
    db.prepare('DELETE FROM challenges WHERE id = ?').run(ch.id);
    return c.json({ ok: true });
  });

  // ------------------------------------------------------------ dashboards
  app.get('/api/dashboard/seller', (c) => {
    const u = c.get('user');
    const [y, m] = period(c);
    const id = c.req.query('user_id') ? int(c.req.query('user_id'), 'user_id') : u.id;
    const seller = db.prepare('SELECT id, name, first_name, role, store_id, igl FROM users WHERE id = ? AND active = 1').get(id);
    if (!seller || seller.role !== 'seller') throw new HTTPException(404, { message: 'Vendedor não encontrado.' });
    if (seller.id !== u.id) assertManage(u, seller.store_id);
    return c.json(sellerDashboard(db, seller, y, m));
  });

  app.get('/api/dashboard/team', (c) => {
    const u = c.get('user');
    const storeId = int(c.req.query('store_id') || u.store_id, 'store_id');
    assertView(u, storeId);
    const [y, m] = period(c);
    return c.json(teamDashboard(db, u, storeId, y, m));
  });

  app.get('/api/dashboard/admin', (c) => {
    const u = c.get('user');
    if (u.role === 'seller') throw new HTTPException(403, { message: 'Sem acesso.' });
    const [y, m] = period(c);
    return c.json(adminDashboard(db, u, y, m));
  });

  return app;
}

/** Creates the first administrator from env vars when the database has no users. */
export function bootstrapAdmin(db) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (n > 0) return;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 8) {
    console.warn('Sem utilizadores. Define ADMIN_USERNAME e ADMIN_PASSWORD (mín. 8 caracteres) e reinicia para criar o administrador.');
    return;
  }
  const name = process.env.ADMIN_NAME || username;
  db.prepare(`INSERT INTO users (name, first_name, username, password_hash, role) VALUES (?, ?, ?, ?, 'admin')`).run(name, name.split(/\s+/)[0], username.toLowerCase(), hashPassword(password));
  console.log(`Administrador "${username}" criado.`);
}

export { storeIdsFor };
