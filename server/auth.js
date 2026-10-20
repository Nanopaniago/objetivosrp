import crypto from 'node:crypto';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

const COOKIE = 'rp_session';
const SESSION_DAYS = 30;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [algo, saltHex, hashHex] = String(stored || '').split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

export function createSession(db, c, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires.toISOString());
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    expires,
  });
}

export function destroySession(db, c) {
  const token = getCookie(c, COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  deleteCookie(c, COOKIE, { path: '/' });
}

/** Hono middleware: loads c.get('user') or answers 401. */
export function requireAuth(db) {
  return async (c, next) => {
    const token = getCookie(c, COOKIE);
    if (!token) throw new HTTPException(401, { message: 'Sessão terminada. Entra novamente.' });
    const row = db
      .prepare(
        `SELECT u.id, u.name, u.first_name, u.username, u.role, u.store_id, u.igl, u.active, u.avatar, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
      )
      .get(token);
    if (!row || !row.active || new Date(row.expires_at) < new Date()) {
      if (row) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      throw new HTTPException(401, { message: 'Sessão terminada. Entra novamente.' });
    }
    delete row.expires_at;
    row.store_ids = storeIdsFor(db, row);
    c.set('user', row);
    await next();
  };
}

export function storeIdsFor(db, user) {
  if (user.role === 'admin') return db.prepare('SELECT id FROM stores').all().map((r) => r.id);
  const ids = new Set();
  if (user.store_id) ids.add(user.store_id);
  if (user.role === 'manager') {
    for (const r of db.prepare('SELECT store_id FROM manager_stores WHERE user_id = ?').all(user.id)) ids.add(r.store_id);
  }
  return [...ids];
}

export function canView(user, storeId) {
  return user.role === 'admin' || user.store_ids.includes(Number(storeId));
}

export function canManage(user, storeId) {
  return user.role === 'admin' || (user.role === 'manager' && user.store_ids.includes(Number(storeId)));
}

export function assertView(user, storeId) {
  if (!canView(user, storeId)) throw new HTTPException(403, { message: 'Não tens acesso a esta loja.' });
}

export function assertManage(user, storeId) {
  if (!canManage(user, storeId)) throw new HTTPException(403, { message: 'Só o gestor desta loja pode fazer isto.' });
}

export function assertAdmin(user) {
  if (user.role !== 'admin') throw new HTTPException(403, { message: 'Só o administrador pode fazer isto.' });
}
