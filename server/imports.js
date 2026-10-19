// Turns what Gemini read into a reviewable draft, then commits or undoes it.
import { HTTPException } from 'hono/http-exception';
import { firstNameKey, tx } from './db.js';
import { daysInMonth, dateOf } from './engine.js';
import { loadCategories } from './services.js';

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Strips a leading employee number like "10006391 - JOSE FERREIRA". */
const cleanName = (s) => String(s || '').replace(/^\s*\d+\s*[-–]?\s*/, '').trim();

export function matchPerson(rawName, sellers, managers) {
  const name = cleanName(rawName);
  const key = firstNameKey(name);
  const hits = sellers.filter((s) => firstNameKey(s.first_name) === key);
  if (hits.length === 1) return { status: 'ok', userId: hits[0].id };
  if (hits.length > 1) {
    const words = norm(name).split(' ').slice(1);
    const narrowed = hits.filter((s) => words.some((w) => w.length > 2 && norm(s.name).includes(w)));
    if (narrowed.length === 1) return { status: 'ok', userId: narrowed[0].id };
    return { status: 'ambiguous', userId: null, candidates: hits.map((h) => ({ id: h.id, name: h.name })) };
  }
  if (managers.some((mg) => firstNameKey(mg.first_name) === key)) return { status: 'ignored', userId: null, reason: 'Gestor (sem objetivos)' };
  return { status: 'unknown', userId: null };
}

function peopleOf(db, storeId) {
  const sellers = db.prepare(`SELECT id, name, first_name, igl FROM users WHERE store_id = ? AND role = 'seller' AND active = 1`).all(storeId);
  const managers = db
    .prepare(`SELECT DISTINCT u.id, u.name, u.first_name FROM users u LEFT JOIN manager_stores ms ON ms.user_id = u.id WHERE u.role IN ('manager','admin') AND (u.store_id = ? OR ms.store_id = ?)`)
    .all(storeId, storeId);
  return { sellers, managers };
}

const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// ------------------------------------------------------------------ results

export function prepareResults(db, storeId, parsed, fallbackDate) {
  const categories = loadCategories(db);
  const { sellers, managers } = peopleOf(db, storeId);
  const date = validDate(parsed?.report_date) ? parsed.report_date : fallbackDate;
  const bySlug = (list) => {
    const o = {};
    for (const v of list || []) if (v && v.category) o[v.category] = { goal: v.goal ?? null, actual: Number(v.actual) || 0, uncertain: !!v.uncertain };
    return o;
  };

  const rows = (parsed?.sellers || []).map((s, i) => ({ key: `r${i}`, readName: cleanName(s.name), ...matchPerson(s.name, sellers, managers), values: bySlug(s.values) }));
  const totals = bySlug(parsed?.totals);
  const counted = rows.filter((r) => r.status !== 'ignored');

  const issues = [];
  for (const r of rows) {
    if (r.status === 'unknown') issues.push({ kind: 'unknown', row: r.key, text: `"${r.readName}" não corresponde a nenhum vendedor da loja.` });
    if (r.status === 'ambiguous') issues.push({ kind: 'ambiguous', row: r.key, text: `"${r.readName}" pode ser mais do que um vendedor.` });
  }

  const checks = [];
  for (const c of categories) {
    const t = totals[c.slug];
    if (!t) continue;
    const sum = counted.reduce((s, r) => s + (r.values[c.slug]?.actual || 0), 0);
    const diff = Math.round((t.actual - sum) * 100) / 100;
    if (Math.abs(diff) < 0.5) {
      checks.push({ ok: true, text: `${c.name}: a soma bate certo com o Total Geral.` });
      continue;
    }
    const doubtful = counted.filter((r) => r.values[c.slug]?.uncertain);
    const issue = { kind: 'sum', category: c.slug, categoryName: c.name, unit: c.unit, sum, total: t.actual, diff, text: `${c.name}: a soma dos vendedores difere do Total Geral em ${Math.abs(diff)}.` };
    if (doubtful.length === 1) {
      const r = doubtful[0];
      issue.row = r.key;
      issue.readName = r.readName;
      issue.read = r.values[c.slug].actual;
      issue.suggested = Math.round((r.values[c.slug].actual + diff) * 100) / 100;
    }
    issues.push(issue);
    checks.push({ ok: false, text: issue.text });
  }

  // Accumulated values should never go down within the month
  const monthStart = date.slice(0, 8) + '01';
  const prevStmt = db.prepare('SELECT value FROM results WHERE user_id = ? AND category_id = ? AND date >= ? AND date < ? ORDER BY date DESC LIMIT 1');
  let decreases = 0;
  for (const r of counted) {
    if (!r.userId) continue;
    for (const c of categories) {
      const v = r.values[c.slug];
      if (!v) continue;
      const prev = prevStmt.get(r.userId, c.id, monthStart, date);
      if (prev && v.actual < prev.value) {
        decreases++;
        issues.push({ kind: 'decrease', row: r.key, category: c.slug, text: `${r.readName}: ${c.name} desceu de ${prev.value} para ${v.actual}.` });
      }
    }
  }
  checks.push({ ok: decreases === 0, text: decreases === 0 ? 'Nenhum acumulado desceu face ao relatório anterior.' : `${decreases} valores desceram face ao relatório anterior.` });

  const okRows = rows.filter((r) => r.status === 'ok').length;
  const ignored = rows.filter((r) => r.status === 'ignored');
  checks.unshift({ ok: okRows === counted.length, text: `${okRows} de ${counted.length} vendedores reconhecidos pelo primeiro nome.` });
  if (ignored.length) checks.splice(1, 0, { ok: true, text: `${ignored.map((r) => r.readName).join(', ')} ignorado (gestor, sem objetivos).` });
  checks.unshift({ ok: validDate(parsed?.report_date), text: validDate(parsed?.report_date) ? `Data reconhecida: ${date}.` : `Data não visível na imagem. Usada a data ${date}.` });

  const cellCount = counted.reduce((s, r) => s + Object.keys(r.values).length, 0);
  return { date, categories: categories.map((c) => ({ slug: c.slug, name: c.name, unit: c.unit, icon: c.icon })), rows, totals, issues, checks, cellCount, sellers: sellers.map((s) => ({ id: s.id, name: s.name })) };
}

export function commitResults(db, imp, user, payload) {
  const date = payload?.date;
  if (!validDate(date)) throw new HTTPException(400, { message: 'Data inválida.' });
  const categories = loadCategories(db);
  const slugToId = new Map(categories.map((c) => [c.slug, c.id]));
  const { sellers } = peopleOf(db, imp.store_id);
  const allowed = new Set(sellers.map((s) => s.id));
  const rows = (payload.rows || []).filter((r) => r && allowed.has(Number(r.userId)));
  if (!rows.length) throw new HTTPException(400, { message: 'Não há vendedores reconhecidos para gravar.' });
  const [y, m] = [Number(date.slice(0, 4)), Number(date.slice(5, 7))];

  return tx(db, () => {
    const userIds = rows.map((r) => Number(r.userId));
    const ph = userIds.map(() => '?').join(',');
    const backup = {
      results: db.prepare(`SELECT * FROM results WHERE store_id = ? AND date = ? AND user_id IN (${ph})`).all(imp.store_id, date, ...userIds),
      goals: db.prepare(`SELECT * FROM goals WHERE store_id = ? AND year = ? AND month = ? AND user_id IN (${ph})`).all(imp.store_id, y, m, ...userIds),
      userIds,
      date,
      year: y,
      month: m,
    };
    const upRes = db.prepare(
      `INSERT INTO results (store_id, user_id, category_id, date, value, source, import_id, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, 'import', ?, ?, datetime('now'))
       ON CONFLICT(user_id, category_id, date) DO UPDATE SET value = excluded.value, source = 'import', import_id = excluded.import_id, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
    );
    const upGoal = db.prepare(
      `INSERT INTO goals (store_id, user_id, category_id, year, month, target, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, category_id, year, month) DO UPDATE SET target = excluded.target, updated_at = excluded.updated_at`
    );
    for (const r of rows) {
      for (const [slug, v] of Object.entries(r.values || {})) {
        const cid = slugToId.get(slug);
        if (!cid || v === null || typeof v !== 'object') continue;
        const actual = Number(v.actual);
        if (Number.isFinite(actual)) upRes.run(imp.store_id, Number(r.userId), cid, date, actual, imp.id, user.id);
        const goal = Number(v.goal);
        if (v.goal !== null && v.goal !== undefined && v.goal !== '' && Number.isFinite(goal) && goal > 0) upGoal.run(imp.store_id, Number(r.userId), cid, y, m, goal);
      }
    }
    db.prepare(`UPDATE imports SET status = 'committed', ref = ?, backup_json = ?, committed_at = datetime('now') WHERE id = ?`).run(date, JSON.stringify(backup), imp.id);
    return { date, updated: rows.length };
  });
}

// ----------------------------------------------------------------- schedule

const SHIFTS = { '09:30-18:30': 'A', '11:30-20:30': 'F' };
const hhmm = (s) => {
  const m = String(s || '').match(/(\d{1,2})[:h.](\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
};

export function cellToKind(cell) {
  const code = String(cell?.code || '').toUpperCase().trim();
  if (code === 'FO' || code === 'FC') return { kind: 'O' };
  if (code.startsWith('FER')) return { kind: 'V' };
  const start = hhmm(cell?.start);
  const end = hhmm(cell?.end);
  if (start && end) return { kind: SHIFTS[`${start}-${end}`] || 'L', start, end };
  return null;
}

export function prepareSchedule(db, storeId, parsed, year, month) {
  const { sellers, managers } = peopleOf(db, storeId);
  const n = daysInMonth(year, month);
  const issues = [];
  const checks = [];
  if (parsed?.month && parsed?.year && (parsed.month !== month || parsed.year !== year)) {
    issues.push({ kind: 'month', text: `A imagem parece ser de ${parsed.month}/${parsed.year}, não de ${month}/${year}.` });
  }
  const rows = (parsed?.rows || []).map((r, i) => {
    const match = matchPerson(r.name, sellers, managers);
    const days = {};
    const unreadable = [];
    for (let d = 1; d <= n; d++) {
      const cell = (r.days || []).find((x) => Number(x.day) === d);
      const k = cell && !cell.uncertain ? cellToKind(cell) : null;
      if (k) days[dateOf(year, month, d)] = k;
      else unreadable.push(d);
    }
    const seller = sellers.find((s) => s.id === match.userId);
    const nonIglFree = seller && !seller.igl ? Object.values(days).filter((v) => v.kind === 'L').length : 0;
    return { key: `r${i}`, readName: cleanName(r.name), ...match, days, unreadable, nonIglFree };
  });
  for (const r of rows) {
    if (r.status === 'unknown') issues.push({ kind: 'unknown', row: r.key, text: `"${r.readName}" não corresponde a nenhum vendedor.` });
    if (r.status === 'ambiguous') issues.push({ kind: 'ambiguous', row: r.key, text: `"${r.readName}" pode ser mais do que um vendedor.` });
    if (r.status !== 'ignored' && r.unreadable.length) issues.push({ kind: 'cells', row: r.key, text: `${r.readName}: ${r.unreadable.length} dias por ler (${r.unreadable.join(', ')}).` });
    if (r.nonIglFree) issues.push({ kind: 'freeShift', row: r.key, text: `${r.readName} tem ${r.nonIglFree} dias com horário fora do padrão e não é da equipa IGL.` });
  }
  const ok = rows.filter((r) => r.status === 'ok');
  checks.push({ ok: ok.length === rows.filter((r) => r.status !== 'ignored').length, text: `${ok.length} pessoas reconhecidas pelo primeiro nome.` });
  const ign = rows.filter((r) => r.status === 'ignored');
  if (ign.length) checks.push({ ok: true, text: `${ign.map((r) => r.readName).join(', ')} ignorado (gestão).` });
  const missing = sellers.filter((s) => !ok.some((r) => r.userId === s.id));
  if (missing.length) checks.push({ ok: false, text: `Sem escala na imagem: ${missing.map((s) => s.first_name).join(', ')}.` });
  const cells = ok.reduce((s, r) => s + Object.keys(r.days).length, 0);
  checks.push({ ok: cells === ok.length * n, text: `${cells} de ${ok.length * n} dias lidos.` });
  return { year, month, days: n, rows, issues, checks, sellers: sellers.map((s) => ({ id: s.id, name: s.name, igl: !!s.igl })) };
}

export function writeSchedule(db, storeId, year, month, rows, importId = null) {
  const { sellers } = peopleOf(db, storeId);
  const allowed = new Set(sellers.map((s) => s.id));
  const from = dateOf(year, month, 1);
  const to = dateOf(year, month, daysInMonth(year, month));
  const valid = (rows || []).filter((r) => allowed.has(Number(r.userId)));
  return tx(db, () => {
    const ids = valid.map((r) => Number(r.userId));
    const backup = ids.length
      ? db.prepare(`SELECT * FROM schedules WHERE store_id = ? AND date BETWEEN ? AND ? AND user_id IN (${ids.map(() => '?').join(',')})`).all(storeId, from, to, ...ids)
      : [];
    const del = db.prepare('DELETE FROM schedules WHERE user_id = ? AND date BETWEEN ? AND ?');
    const ins = db.prepare('INSERT INTO schedules (store_id, user_id, date, kind, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)');
    for (const r of valid) {
      del.run(Number(r.userId), from, to);
      for (const [date, v] of Object.entries(r.days || {})) {
        if (date < from || date > to || !v || !['A', 'F', 'L', 'O', 'V'].includes(v.kind)) continue;
        ins.run(storeId, Number(r.userId), date, v.kind, v.kind === 'L' ? hhmm(v.start) : null, v.kind === 'L' ? hhmm(v.end) : null);
      }
    }
    if (importId) {
      db.prepare(`UPDATE imports SET status = 'committed', ref = ?, backup_json = ?, committed_at = datetime('now') WHERE id = ?`).run(
        `${year}-${String(month).padStart(2, '0')}`,
        JSON.stringify({ schedules: backup, userIds: ids, from, to }),
        importId
      );
    }
    return { updated: valid.length };
  });
}

// --------------------------------------------------------------------- undo

export function undoImport(db, imp) {
  if (imp.status !== 'committed') throw new HTTPException(400, { message: 'Esta importação não está gravada.' });
  const latest = db.prepare(`SELECT id FROM imports WHERE store_id = ? AND kind = ? AND status = 'committed' ORDER BY committed_at DESC, id DESC LIMIT 1`).get(imp.store_id, imp.kind);
  if (latest?.id !== imp.id) throw new HTTPException(409, { message: 'Só é possível desfazer a importação mais recente.' });
  const b = JSON.parse(imp.backup_json || '{}');
  tx(db, () => {
    const ids = b.userIds || [];
    const ph = ids.map(() => '?').join(',');
    if (imp.kind === 'results' && ids.length) {
      db.prepare(`DELETE FROM results WHERE store_id = ? AND date = ? AND user_id IN (${ph})`).run(imp.store_id, b.date, ...ids);
      db.prepare(`DELETE FROM goals WHERE store_id = ? AND year = ? AND month = ? AND user_id IN (${ph})`).run(imp.store_id, b.year, b.month, ...ids);
      const ir = db.prepare('INSERT INTO results (store_id, user_id, category_id, date, value, source, import_id, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const r of b.results || []) ir.run(r.store_id, r.user_id, r.category_id, r.date, r.value, r.source, r.import_id, r.updated_by, r.updated_at);
      const ig = db.prepare('INSERT INTO goals (store_id, user_id, category_id, year, month, target, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const g of b.goals || []) ig.run(g.store_id, g.user_id, g.category_id, g.year, g.month, g.target, g.updated_at);
    }
    if (imp.kind === 'schedule' && ids.length) {
      db.prepare(`DELETE FROM schedules WHERE store_id = ? AND date BETWEEN ? AND ? AND user_id IN (${ph})`).run(imp.store_id, b.from, b.to, ...ids);
      const is = db.prepare('INSERT INTO schedules (store_id, user_id, date, kind, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)');
      for (const s of b.schedules || []) is.run(s.store_id, s.user_id, s.date, s.kind, s.start_time, s.end_time);
    }
    db.prepare(`UPDATE imports SET status = 'undone' WHERE id = ?`).run(imp.id);
  });
}
