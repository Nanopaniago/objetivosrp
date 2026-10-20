// Profile photos and background file reading (Gemini mocked).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rp-'));
process.env.GEMINI_API_KEY = 'test-key';
const { openDb } = await import('../db.js');
const { createApp } = await import('../app.js');
const { hashPassword } = await import('../auth.js');

const db = openDb(':memory:');
db.prepare(`INSERT INTO users (name, first_name, username, password_hash, role) VALUES ('Admin', 'Admin', 'admin', ?, 'admin')`).run(hashPassword('segredo123'));
const app = createApp(db);

async function login(username, password) {
  const res = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
  return res.headers.get('set-cookie').split(';')[0];
}
const req = (cookie, method, url, body) =>
  app.request(url, { method, headers: body instanceof FormData ? { cookie } : { cookie, 'content-type': 'application/json' }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });

const realFetch = globalThis.fetch;
let calls = [];
let replies = [];
globalThis.fetch = async (url, opts) => {
  if (!String(url).includes('generativelanguage')) return realFetch(url, opts);
  calls.push({ url: String(url), body: JSON.parse(opts.body) });
  const r = replies.shift();
  if (r instanceof Error) throw r;
  return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { status: r.status || 200 });
};
const geminiJson = (obj) => ({ body: { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] } });

async function waitJob(cookie, job) {
  for (let i = 0; i < 200; i++) {
    const s = await (await req(cookie, 'GET', `/api/imports/jobs/${job}`)).json();
    if (s.status !== 'running') return s;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('job never finished');
}

const admin = await login('admin', 'segredo123');
const store = (await (await req(admin, 'POST', '/api/stores', { name: 'Loja' })).json()).id;
const ana = (await (await req(admin, 'POST', '/api/users', { name: 'Ana Sousa', username: 'ana', password: 'password1', role: 'seller', store_id: store })).json()).id;
const bruno = (await (await req(admin, 'POST', '/api/users', { name: 'Bruno Lima', username: 'bruno', password: 'password1', role: 'seller', store_id: store })).json()).id;
const anaCookie = await login('ana', 'password1');

test('profile photo: upload, serve, permissions, remove', async () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const fd = () => { const f = new FormData(); f.append('photo', new File([png], 'a.png', { type: 'image/png' })); return f; };
  const up = await req(anaCookie, 'POST', `/api/users/${ana}/avatar`, fd());
  assert.equal(up.status, 200);
  const v = (await up.json()).avatar;
  assert.ok(v > 0);
  const me = await (await req(anaCookie, 'GET', '/api/me')).json();
  assert.equal(me.user.avatar, v);
  const img = await req(anaCookie, 'GET', `/api/users/${ana}/avatar?v=${v}`);
  assert.equal(img.headers.get('content-type'), 'image/png');
  // a seller cannot change someone else's photo; an admin can
  assert.equal((await req(anaCookie, 'POST', `/api/users/${bruno}/avatar`, fd())).status, 403);
  assert.equal((await req(admin, 'POST', `/api/users/${bruno}/avatar`, fd())).status, 200);
  const team = await (await req(anaCookie, 'GET', `/api/dashboard/team?store_id=${store}`)).json();
  assert.ok(Array.isArray(team.ranking));
  assert.equal((await req(anaCookie, 'DELETE', `/api/users/${ana}/avatar`)).status, 200);
  assert.equal((await req(anaCookie, 'GET', `/api/users/${ana}/avatar`)).status, 404);
});

test('PDF results are read in the background, with retry after a network error', async () => {
  calls = [];
  replies = [
    Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }),
    geminiJson({ report_date: '2026-10-19', sellers: [{ name: 'Ana Sou', values: [{ category: 'plus', actual: 1200, goal: 5000, uncertain: false }] }], totals: [{ category: 'plus', actual: 1200, uncertain: false }] }),
  ];
  const fd = new FormData();
  fd.append('file', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'relatorio.pdf', { type: 'application/pdf' }));
  fd.append('store_id', String(store));
  fd.append('date', '2026-10-19');
  const start = await req(admin, 'POST', '/api/imports/results', fd);
  assert.equal(start.status, 202);
  const { job } = await start.json();
  const s = await waitJob(admin, job);
  assert.equal(s.status, 'done', s.error);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.contents[0].parts[0].inline_data.mime_type, 'application/pdf');
  const file = await req(admin, 'GET', `/api/imports/${s.result.id}/image`);
  assert.equal(file.headers.get('content-type'), 'application/pdf');
  // another user cannot see the job
  assert.equal((await req(anaCookie, 'GET', `/api/imports/jobs/${job}`)).status, 404);
});

test('unavailable model falls back to the next one; errors explain the cause', async () => {
  calls = [];
  replies = [{ status: 404, body: '{"error":"model gone"}' }, geminiJson({ sellers: [], totals: [] })];
  const fd = new FormData();
  fd.append('file', new File([new Uint8Array([1])], 'r.png', { type: 'image/png' }));
  fd.append('store_id', String(store));
  const s = await waitJob(admin, (await (await req(admin, 'POST', '/api/imports/results', fd)).json()).job);
  assert.equal(s.status, 'done', s.error);
  assert.notEqual(calls[0].url, calls[1].url);

  replies = [{ status: 400, body: '{"error":{"message":"API key not valid"}}' }];
  const fd2 = new FormData();
  fd2.append('file', new File([new Uint8Array([1])], 'r.png', { type: 'image/png' }));
  fd2.append('store_id', String(store));
  const e = await waitJob(admin, (await (await req(admin, 'POST', '/api/imports/results', fd2)).json()).job);
  assert.equal(e.status, 'error');
  assert.match(e.error, /chave/i);

  const bad = new FormData();
  bad.append('file', new File(['x'], 'a.txt', { type: 'text/plain' }));
  bad.append('store_id', String(store));
  assert.equal((await req(admin, 'POST', '/api/imports/results', bad)).status, 400);
});
