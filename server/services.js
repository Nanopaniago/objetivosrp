import { evaluateSeller, evaluateChallenge, monthRates, mergeRates, workDaysOf, daysInMonth, dateOf } from './engine.js';

export const todayStr = () => {
  const tz = process.env.TZ_REPORTS || 'Europe/Lisbon';
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
};

const addDays = (date, n) => {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const prevMonth = (y, m, back) => {
  const d = new Date(Date.UTC(y, m - 1 - back, 1));
  return [d.getUTCFullYear(), d.getUTCMonth() + 1];
};

export function loadCategories(db, all = false) {
  return db.prepare(`SELECT id, slug, name, unit, icon, sort, active FROM categories ${all ? '' : 'WHERE active = 1'} ORDER BY sort, id`).all();
}

export function sellersOf(db, storeId) {
  return db
    .prepare(`SELECT id, name, first_name, username, role, store_id, igl, active FROM users WHERE store_id = ? AND role = 'seller' AND active = 1 ORDER BY name`)
    .all(storeId);
}

function monthBounds(y, m) {
  return [dateOf(y, m, 1), dateOf(y, m, daysInMonth(y, m))];
}

/** Evaluates every seller of a store for one month, including team challenges. */
export function storeMonth(db, storeId, y, m, today = todayStr()) {
  const categories = loadCategories(db);
  const sellers = sellersOf(db, storeId);
  const [from, to] = monthBounds(y, m);

  const goalRows = db.prepare('SELECT user_id, category_id, target FROM goals WHERE store_id = ? AND year = ? AND month = ?').all(storeId, y, m);
  const resultRows = db.prepare('SELECT user_id, category_id, date, value FROM results WHERE store_id = ? AND date BETWEEN ? AND ?').all(storeId, from, to);
  const schedRows = db.prepare('SELECT user_id, date, kind, start_time, end_time FROM schedules WHERE store_id = ? AND date BETWEEN ? AND ?').all(storeId, from, to);

  // Up to 6 previous months seed personal-record baselines
  const histFrom = monthBounds(...prevMonth(y, m, 6))[0];
  const histRows = db.prepare('SELECT user_id, category_id, date, value FROM results WHERE store_id = ? AND date >= ? AND date < ?').all(storeId, histFrom, from);
  const histSched = db.prepare('SELECT user_id, date, kind FROM schedules WHERE store_id = ? AND date >= ? AND date < ?').all(storeId, histFrom, from);

  const group = (rows) => {
    const out = new Map();
    for (const r of rows) {
      if (!out.has(r.user_id)) out.set(r.user_id, []);
      out.get(r.user_id).push(r);
    }
    return out;
  };
  const goalsBy = group(goalRows);
  const resBy = group(resultRows);
  const schedBy = group(schedRows);
  const histBy = group(histRows);
  const histSchedBy = group(histSched);

  const evals = sellers.map((user) => {
    const goals = new Map((goalsBy.get(user.id) || []).map((g) => [g.category_id, g.target]));
    const sched = schedBy.get(user.id) || [];
    const work = workDaysOf(sched, y, m);

    let prior = new Map();
    const hist = histBy.get(user.id) || [];
    if (hist.length) {
      for (let back = 6; back >= 1; back--) {
        const [py, pm] = prevMonth(y, m, back);
        const [pf, pt] = monthBounds(py, pm);
        const res = hist.filter((r) => r.date >= pf && r.date <= pt);
        if (!res.length) continue;
        const ps = (histSchedBy.get(user.id) || []).filter((r) => r.date >= pf && r.date <= pt);
        prior = mergeRates(prior, monthRates({ categories, results: res, work: workDaysOf(ps, py, pm) }));
      }
    }

    const ev = evaluateSeller({ categories, goals, results: resBy.get(user.id) || [], work, priorRates: prior, today });
    return { user, ev, schedule: sched };
  });

  // Team challenges active in this month
  const challenges = db
    .prepare('SELECT * FROM challenges WHERE store_id = ? AND start_date <= ? AND end_date >= ? ORDER BY start_date')
    .all(storeId, to, from)
    .map((ch) => {
      const deltasByUser = new Map(evals.map((e) => [e.user.id, e.ev.deltas]));
      const res = evaluateChallenge(ch, deltasByUser);
      if (res.completedOn) {
        for (const e of evals) {
          if (res.contributors.includes(e.user.id) && res.completedOn >= from && res.completedOn <= to) {
            e.ev.events.push({ date: res.completedOn, type: 'challenge', category_id: ch.category_id, points: ch.points, label: `Desafio cumprido: ${ch.title}` });
            e.ev.points += ch.points;
          }
        }
      }
      return { ...ch, ...res, category: categories.find((c) => c.id === ch.category_id) || null };
    });

  return { categories, evals, challenges, today };
}

function rankOf(evals) {
  return [...evals].sort((a, b) => b.ev.points - a.ev.points || b.ev.overall - a.ev.overall);
}

const round1 = (v) => (v === null || v === undefined ? null : Math.round(v * 10) / 10);

function catOut(c) {
  return {
    id: c.category.id,
    slug: c.category.slug,
    name: c.category.name,
    unit: c.category.unit,
    icon: c.category.icon,
    goal: c.goal,
    value: c.value,
    pct: round1(c.pct),
    remaining: c.remaining ?? null,
    need: c.need ?? null,
    needToday: c.needToday ?? null,
    projection: c.projection ?? null,
    projectionPct: round1(c.projectionPct),
    status: c.status ?? 'nogoal',
    next: c.next ?? null,
    nextMissing: c.nextMissing ?? null,
    nextPoints: c.nextPoints ?? null,
  };
}

export function sellerDashboard(db, user, y, m) {
  const sm = storeMonth(db, user.store_id, y, m);
  const ranked = rankOf(sm.evals);
  const idx = ranked.findIndex((e) => e.user.id === user.id);
  const me = ranked[idx];
  if (!me) return null;
  const ev = me.ev;
  const near = ranked
    .slice(Math.max(0, idx - 1), idx + 2)
    .map((e) => ({ id: e.user.id, name: e.user.first_name, points: e.ev.points, pos: ranked.indexOf(e) + 1, me: e.user.id === user.id }));
  const ahead = idx > 0 ? ranked[idx - 1] : null;
  return {
    seller: { id: user.id, name: user.name, firstName: user.first_name, igl: !!user.igl },
    refDate: ev.refDate,
    days: { total: ev.total, done: ev.done, left: ev.left, hasSchedule: ev.hasSchedule },
    pace: round1(ev.pace),
    overall: round1(ev.overall),
    projection: round1(ev.projection),
    categories: ev.cats.map(catOut),
    mission: ev.mission.map(catOut),
    streak: ev.streak,
    bestStreak: ev.bestStreak,
    points: ev.points,
    rank: idx + 1,
    rankTotal: ranked.length,
    gapToNext: ahead ? ahead.ev.points - ev.points : 0,
    aheadName: ahead ? ahead.user.first_name : null,
    near,
    series: ev.series,
    wins: [...ev.events].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    challenge: sm.challenges.find((c) => c.start_date <= sm.today && c.end_date >= sm.today) || sm.challenges[sm.challenges.length - 1] || null,
  };
}

export function teamDashboard(db, viewer, storeId, y, m) {
  const sm = storeMonth(db, storeId, y, m);
  const weekFrom = addDays(sm.today, -7);
  const ranked = rankOf(sm.evals).map((e, i) => ({
    pos: i + 1,
    id: e.user.id,
    name: e.user.first_name,
    fullName: e.user.name,
    igl: !!e.user.igl,
    me: e.user.id === viewer.id,
    points: e.ev.points,
    week: e.ev.events.filter((x) => x.date > weekFrom).reduce((s, x) => s + x.points, 0),
    overall: round1(e.ev.overall),
    streak: e.ev.streak,
  }));
  const badges = sm.evals
    .flatMap((e) => e.ev.events.filter((x) => x.type !== 'daily').map((x) => ({ ...x, who: e.user.first_name })))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);
  const stores = db
    .prepare('SELECT id, name FROM stores WHERE active = 1 ORDER BY name')
    .all()
    .map((s) => {
      const ev = s.id === Number(storeId) ? sm : storeMonth(db, s.id, y, m, sm.today);
      const vals = ev.evals.map((e) => e.ev.overall).filter((v) => v > 0);
      return { id: s.id, name: s.name, overall: vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0, mine: s.id === Number(storeId) };
    })
    .sort((a, b) => b.overall - a.overall);
  const challenge = sm.challenges.find((c) => c.start_date <= sm.today && c.end_date >= sm.today) || sm.challenges[sm.challenges.length - 1] || null;
  return { ranking: ranked, badges, stores, challenge, today: sm.today };
}

export function adminDashboard(db, viewer, y, m) {
  const today = todayStr();
  const yesterday = addDays(today, -1);
  const [ny, nm] = prevMonth(y, m, -1);
  const daysToEnd = daysInMonth(y, m) - Number(today.slice(8, 10));
  const stores = db.prepare('SELECT id, name, code FROM stores WHERE active = 1 ORDER BY name').all().filter((s) => viewer.role === 'admin' || viewer.store_ids.includes(s.id));
  const todos = [];
  const out = stores.map((s) => {
    const sm = storeMonth(db, s.id, y, m, today);
    const n = sm.evals.length;
    const avg = (f) => {
      const v = sm.evals.map(f).filter((x) => x !== null && x !== undefined);
      return v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null;
    };
    const last = db.prepare('SELECT MAX(date) AS d FROM results WHERE store_id = ?').get(s.id).d;
    const manager = db
      .prepare(`SELECT u.first_name FROM users u LEFT JOIN manager_stores ms ON ms.user_id = u.id WHERE u.role = 'manager' AND u.active = 1 AND (u.store_id = ? OR ms.store_id = ?) LIMIT 1`)
      .get(s.id, s.id);
    const noGoals = sm.evals.filter((e) => !e.ev.cats.some((c) => c.goal)).map((e) => e.user.first_name);
    if (n > 0 && (!last || last < yesterday)) {
      todos.push({ type: 'results', storeId: s.id, severity: 'high', title: `${s.name} sem resultados${last ? ' desde ' + last.slice(8, 10) + '/' + last.slice(5, 7) : ''}`, text: 'Os vendedores estão a ver números desatualizados.' });
    }
    if (noGoals.length) {
      todos.push({ type: 'goals', storeId: s.id, severity: 'medium', title: `${s.name}: ${noGoals.length} ${noGoals.length === 1 ? 'vendedor' : 'vendedores'} sem metas`, text: `Sem metas não há meta diária nem pontos (${noGoals.join(', ')}).` });
    }
    if (daysToEnd <= 12) {
      const has = db.prepare('SELECT COUNT(*) AS n FROM schedules WHERE store_id = ? AND date LIKE ?').get(s.id, `${ny}-${String(nm).padStart(2, '0')}-%`).n;
      if (!has && n > 0) todos.push({ type: 'schedule', storeId: s.id, severity: 'low', title: `${s.name}: escala do próximo mês por carregar`, text: `Faltam ${daysToEnd} dias para o fim do mês.` });
    }
    const cats = sm.categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      pct: avg((e) => e.ev.cats.find((x) => x.category.id === c.id)?.pct ?? null),
    }));
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      team: n,
      manager: manager?.first_name || null,
      overall: avg((e) => (e.ev.cats.some((c) => c.goal) ? e.ev.overall : null)),
      projection: avg((e) => e.ev.projection),
      pace: avg((e) => e.ev.pace),
      lastResult: last,
      upToDate: !!last && last >= yesterday,
      categories: cats,
    };
  });
  const vals = (k) => out.map((s) => s[k]).filter((v) => v !== null);
  const mean = (a) => (a.length ? round1(a.reduce((x, y) => x + y, 0) / a.length) : null);
  return {
    today,
    todos,
    kpis: {
      stores: out.length,
      sellers: out.reduce((s, x) => s + x.team, 0),
      overall: mean(vals('overall')),
      pace: mean(vals('pace')),
      projection: mean(vals('projection')),
      upToDate: out.filter((s) => s.upToDate).length,
    },
    stores: out,
  };
}
