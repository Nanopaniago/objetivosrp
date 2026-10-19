import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db.js';
import { createApp } from '../app.js';
import { hashPassword } from '../auth.js';
import { prepareResults, prepareSchedule, cellToKind } from '../imports.js';

const db = openDb(':memory:');
db.prepare(`INSERT INTO users (name, first_name, username, password_hash, role) VALUES ('Admin', 'Admin', 'admin', ?, 'admin')`).run(hashPassword('segredo123'));
const app = createApp(db);

function client() {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await app.request(url, {
      method,
      headers: { 'content-type': 'application/json', cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  };
  return call;
}

const admin = client();
const seller = client();
const manager = client();
const ids = {};

test('login and permissions', async () => {
  assert.equal((await admin('GET', '/api/me')).status, 401);
  assert.equal((await admin('POST', '/api/auth/login', { username: 'admin', password: 'errada' })).status, 401);
  assert.equal((await admin('POST', '/api/auth/login', { username: 'admin', password: 'segredo123' })).status, 200);
  const me = await admin('GET', '/api/me');
  assert.equal(me.json.user.role, 'admin');

  ids.store = (await admin('POST', '/api/stores', { name: 'Loja Teste', code: '230' })).json.id;
  ids.other = (await admin('POST', '/api/stores', { name: 'Outra Loja' })).json.id;
  ids.ana = (await admin('POST', '/api/users', { name: 'Ana Sousa', username: 'ana', password: 'password1', role: 'seller', store_id: ids.store })).json.id;
  ids.bruno = (await admin('POST', '/api/users', { name: 'Bruno Lima', username: 'bruno', password: 'password1', role: 'seller', store_id: ids.store, igl: true })).json.id;
  ids.gestor = (await admin('POST', '/api/users', { name: 'Daniel Leal', username: 'daniel', password: 'password1', role: 'manager', store_id: ids.store })).json.id;

  await seller('POST', '/api/auth/login', { username: 'ana', password: 'password1' });
  await manager('POST', '/api/auth/login', { username: 'daniel', password: 'password1' });

  // Seller cannot write data or see other stores
  assert.equal((await seller('PUT', '/api/goals', { store_id: ids.store, year: 2026, month: 10, items: [] })).status, 403);
  assert.equal((await seller('GET', `/api/dashboard/team?store_id=${ids.other}`)).status, 403);
  assert.equal((await seller('GET', `/api/dashboard/seller?user_id=${ids.bruno}`)).status, 403);
  // Seller cannot promote anyone; manager cannot create managers
  assert.equal((await seller('PATCH', `/api/users/${ids.ana}`, { role: 'admin' })).status, 403);
  assert.equal((await manager('POST', '/api/users', { name: 'X', username: 'xx1', password: 'password1', role: 'manager', store_id: ids.store })).status, 403);
  assert.equal((await manager('PATCH', `/api/users/${ids.gestor}`, { role: 'admin' })).status, 403);
  // Manager cannot touch another store
  assert.equal((await manager('PUT', '/api/goals', { store_id: ids.other, year: 2026, month: 10, items: [] })).status, 403);
});

test('manual goals, results and schedule feed the dashboards', async () => {
  const cats = (await manager('GET', '/api/categories')).json;
  assert.equal(cats.length, 6);
  const plus = cats.find((c) => c.slug === 'plus');
  ids.plus = plus.id;
  const pel = cats.find((c) => c.slug === 'peliculas');
  assert.equal(pel.unit, 'un');

  assert.equal((await manager('PUT', '/api/goals', { store_id: ids.store, year: 2026, month: 10, items: [
    { user_id: ids.ana, category_id: plus.id, target: 2700 },
    { user_id: ids.bruno, category_id: plus.id, target: 2700 },
  ] })).status, 200);

  const rows = [ids.ana, ids.bruno].map((u) => {
    const days = {};
    for (let d = 1; d <= 31; d++) days[`2026-10-${String(d).padStart(2, '0')}`] = { kind: new Date(2026, 9, d).getDay() === 0 ? 'O' : 'A' };
    return { userId: u, days };
  });
  assert.equal((await manager('PUT', '/api/schedules', { store_id: ids.store, year: 2026, month: 10, rows })).status, 200);

  for (const [date, a, b] of [['2026-10-01', 100, 50], ['2026-10-02', 200, 60], ['2026-10-03', 300, 70]]) {
    const r = await manager('PUT', '/api/results', { store_id: ids.store, date, items: [
      { user_id: ids.ana, category_id: plus.id, value: a },
      { user_id: ids.bruno, category_id: plus.id, value: b },
    ] });
    assert.equal(r.status, 200);
  }

  const dash = (await seller('GET', '/api/dashboard/seller?year=2026&month=10')).json;
  assert.equal(dash.days.done, 3);
  assert.equal(dash.days.left, 24);
  assert.equal(dash.rank, 1);
  assert.equal(dash.streak, 3);
  assert.equal(dash.categories.find((c) => c.slug === 'plus').need, 100);

  const team = (await seller('GET', `/api/dashboard/team?store_id=${ids.store}&year=2026&month=10`)).json;
  assert.equal(team.ranking[0].name, 'Ana');
  assert.equal(team.ranking.length, 2);

  const adm = (await manager('GET', '/api/dashboard/admin?year=2026&month=10')).json;
  assert.equal(adm.stores.length, 1);
  assert.equal(adm.stores[0].team, 2);
});

test('results image draft: first-name matching, manager ignored, sum check with suggestion', () => {
  const draft = prepareResults(db, ids.store, {
    report_date: '2026-10-04',
    sellers: [
      { name: 'Ana Maria Sousa', values: [{ category: 'plus', goal: 2700, actual: 400, uncertain: false }] },
      { name: 'Bruno Lima', values: [{ category: 'plus', goal: 2700, actual: 21, uncertain: true }] },
      { name: 'Daniel Leal', values: [{ category: 'plus', goal: 0, actual: 0, uncertain: false }] },
      { name: 'Zé Ninguém', values: [{ category: 'plus', goal: 100, actual: 0, uncertain: false }] },
    ],
    totals: [{ category: 'plus', goal: 5500, actual: 480, uncertain: false }],
  }, '2026-10-04');
  assert.equal(draft.date, '2026-10-04');
  assert.equal(draft.rows[0].status, 'ok');
  assert.equal(draft.rows[0].userId, ids.ana);
  assert.equal(draft.rows[2].status, 'ignored');
  assert.equal(draft.rows[3].status, 'unknown');
  const sum = draft.issues.find((i) => i.kind === 'sum');
  assert.equal(sum.diff, 59);
  assert.equal(sum.suggested, 80);
  // Bruno's 21 is lower than his previous 70
  assert.ok(draft.issues.some((i) => i.kind === 'decrease'));
});

test('commit and undo a results import', async () => {
  const r = db.prepare(`INSERT INTO imports (store_id, kind, ref, parsed_json, created_by) VALUES (?, 'results', '2026-10-04', '{}', ?)`).run(ids.store, ids.gestor);
  const id = Number(r.lastInsertRowid);
  const c = await manager('POST', `/api/imports/${id}/commit`, { date: '2026-10-04', rows: [
    { userId: ids.ana, values: { plus: { goal: 3000, actual: 400 } } },
    { userId: ids.bruno, values: { plus: { goal: 2700, actual: 80 } } },
  ] });
  assert.equal(c.status, 200);
  assert.equal(db.prepare('SELECT target FROM goals WHERE user_id = ? AND category_id = ?').get(ids.ana, ids.plus).target, 3000);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM results WHERE date = '2026-10-04'`).get().n, 2);

  assert.equal((await manager('POST', `/api/imports/${id}/undo`)).status, 200);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM results WHERE date = '2026-10-04'`).get().n, 0);
  assert.equal(db.prepare('SELECT target FROM goals WHERE user_id = ? AND category_id = ?').get(ids.ana, ids.plus).target, 2700);
});

test('schedule codes and image draft', () => {
  assert.deepEqual(cellToKind({ code: 'FO' }), { kind: 'O' });
  assert.deepEqual(cellToKind({ code: 'FC' }), { kind: 'O' });
  assert.deepEqual(cellToKind({ code: 'FERS' }), { kind: 'V' });
  assert.deepEqual(cellToKind({ start: '09:30', end: '18:30' }), { kind: 'A', start: '09:30', end: '18:30' });
  assert.deepEqual(cellToKind({ start: '11:30', end: '20:30' }), { kind: 'F', start: '11:30', end: '20:30' });
  assert.equal(cellToKind({ start: '09:00', end: '18:00' }).kind, 'L');

  const days = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, code: i % 7 === 5 ? 'FO' : '', start: '09:30', end: '18:30', uncertain: i === 10 }));
  const draft = prepareSchedule(db, ids.store, { year: 2026, month: 11, rows: [
    { name: '10006391 - ANA SOU', days },
    { name: '10004735 - DANIEL LEAL', days },
  ] }, 2026, 11);
  assert.equal(draft.rows[0].status, 'ok');
  assert.equal(draft.rows[1].status, 'ignored');
  assert.deepEqual(draft.rows[0].unreadable, [11]);
  assert.ok(draft.checks.some((c) => !c.ok && c.text.includes('Bruno')));
});
