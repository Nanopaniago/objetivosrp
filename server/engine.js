// Pure calculation engine: goals, pace, daily targets, projections and points.
// No database access here, so it can be unit-tested in isolation.

export const POINTS = {
  dailyGoal: 20,
  streak: { 3: 30, 5: 60, 10: 150 },
  milestone: { 50: 40, 80: 80, 100: 150, 120: 100 },
  record: 25,
  recordMinHistory: 5,
};

export const WORK_KINDS = new Set(['A', 'F', 'L']);

export const pad = (n) => String(n).padStart(2, '0');
export const dateOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

/**
 * Work days of a seller in a month.
 * With a schedule, only A/F/L days count. Without one, every day except Sunday counts
 * (and hasSchedule=false so the UI can warn).
 */
export function workDaysOf(scheduleRows, y, m) {
  const kindByDate = new Map();
  for (const r of scheduleRows) kindByDate.set(r.date, r.kind);
  const n = daysInMonth(y, m);
  const days = [];
  const hasSchedule = scheduleRows.length > 0;
  for (let d = 1; d <= n; d++) {
    const date = dateOf(y, m, d);
    if (hasSchedule) {
      if (WORK_KINDS.has(kindByDate.get(date))) days.push(date);
    } else if (new Date(y, m - 1, d).getDay() !== 0) {
      days.push(date);
    }
  }
  return { days, hasSchedule, kindByDate };
}

const countIn = (days, fromExcl, toIncl) =>
  days.reduce((n, d) => n + ((fromExcl === null || d > fromExcl) && d <= toIncl ? 1 : 0), 0);
const countAfter = (days, fromExcl) => days.reduce((n, d) => n + (fromExcl === null || d > fromExcl ? 1 : 0), 0);

function statusFor(pct, pace) {
  if (pct >= pace) return 'ahead';
  if (pct >= pace - 10) return 'close';
  return 'behind';
}

/**
 * Evaluates one seller for one month.
 * @param {object} p
 * @param {Array<{id:number,slug:string,name:string,unit:'eur'|'un'}>} p.categories
 * @param {Map<number,number>} p.goals            categoryId -> monthly target
 * @param {Array<{date:string,category_id:number,value:number}>} p.results  month-to-date snapshots
 * @param {{days:string[],hasSchedule:boolean}} p.work
 * @param {Map<number,{max:number,count:number}>} [p.priorRates] best daily rate before this month
 * @param {string} p.today  YYYY-MM-DD
 */
export function evaluateSeller({ categories, goals, results, work, priorRates = new Map(), today }) {
  const byDate = new Map();
  for (const r of results) {
    if (r.date > today) continue;
    if (!byDate.has(r.date)) byDate.set(r.date, new Map());
    byDate.get(r.date).set(r.category_id, Number(r.value));
  }
  const dates = [...byDate.keys()].sort();
  const refDate = dates.length ? dates[dates.length - 1] : null;
  const total = work.days.length;
  const done = refDate ? countIn(work.days, null, refDate) : 0;
  const left = total - done;
  const pace = total > 0 ? (done / total) * 100 : 0;

  const withGoal = categories.filter((c) => (goals.get(c.id) || 0) > 0);

  // ---- Walk snapshots in order: deltas, daily targets, points, streaks ----
  const events = [];
  const acc = new Map(); // categoryId -> accumulated so far
  const rates = new Map(); // categoryId -> {max,count}
  for (const [k, v] of priorRates) rates.set(k, { ...v });
  const reached = new Set();
  let streak = 0;
  let bestStreak = 0;
  let prevDate = null;
  const series = [{ x: 0, y: 0 }];
  const deltas = []; // {date, category_id, delta}

  for (const date of dates) {
    const snap = byDate.get(date);
    const gap = countIn(work.days, prevDate, date);
    const leftBefore = countAfter(work.days, prevDate);
    let ratioSum = 0;
    let ratioN = 0;
    for (const c of categories) {
      const prev = acc.get(c.id) || 0;
      const cur = snap.has(c.id) ? snap.get(c.id) : prev;
      const delta = cur - prev;
      acc.set(c.id, cur);
      if (delta !== 0) deltas.push({ date, category_id: c.id, delta });
      const goal = goals.get(c.id) || 0;
      if (goal <= 0) continue;

      if (gap > 0) {
        const remainingBefore = goal - prev;
        let ratio = 1;
        if (remainingBefore > 0 && leftBefore > 0) {
          const expected = (remainingBefore / leftBefore) * gap;
          ratio = expected > 0 ? delta / expected : 1;
          if (ratio >= 1) events.push({ date, type: 'daily', category_id: c.id, points: POINTS.dailyGoal, label: `Meta diária em ${c.name}` });
        }
        // For the streak a category also counts as fine when it is already at or above the
        // month's pace, so lumpy unit categories (1 película every few days) don't break it.
        const paceAfter = total > 0 ? (countIn(work.days, null, date) / total) * 100 : 0;
        const paceRatio = paceAfter > 0 ? ((cur / goal) * 100) / paceAfter : 1;
        ratioSum += Math.min(Math.max(ratio, paceRatio), 2);
        ratioN++;

        // Personal record: best daily rate, only once there is enough history
        const rate = delta / gap;
        const r = rates.get(c.id) || { max: 0, count: 0 };
        if (r.count >= POINTS.recordMinHistory && rate > r.max && rate > 0) {
          events.push({ date, type: 'record', category_id: c.id, points: POINTS.record, label: `Recorde pessoal em ${c.name}` });
        }
        rates.set(c.id, { max: Math.max(r.max, rate), count: r.count + gap });
      }

      const pct = (cur / goal) * 100;
      for (const m of Object.keys(POINTS.milestone).map(Number)) {
        const key = `${c.id}:${m}`;
        if (pct >= m && !reached.has(key)) {
          reached.add(key);
          events.push({ date, type: 'milestone', category_id: c.id, points: POINTS.milestone[m], label: `${m}% em ${c.name}` });
        }
      }
    }

    if (gap > 0 && ratioN > 0) {
      if (ratioSum / ratioN >= 1) {
        const before = streak;
        streak += gap;
        for (const t of Object.keys(POINTS.streak).map(Number)) {
          if (before < t && streak >= t) {
            events.push({ date, type: 'streak', category_id: null, points: POINTS.streak[t], label: `Sequência de ${t} dias` });
          }
        }
      } else {
        streak = 0;
      }
      bestStreak = Math.max(bestStreak, streak);
    }

    if (withGoal.length) {
      const overall = withGoal.reduce((s, c) => s + ((acc.get(c.id) || 0) / goals.get(c.id)) * 100, 0) / withGoal.length;
      series.push({ x: countIn(work.days, null, date), y: Math.round(overall * 10) / 10 });
    }
    prevDate = date;
  }

  // ---- Current picture per category ----
  const cats = categories.map((c) => {
    const goal = goals.get(c.id) || 0;
    const value = acc.get(c.id) || 0;
    if (goal <= 0) return { category: c, goal: null, value, pct: null };
    const pct = (value / goal) * 100;
    const remaining = Math.max(0, goal - value);
    const need = remaining <= 0 ? 0 : left > 0 ? remaining / left : remaining;
    const projection = done > 0 ? (value / done) * total : null;
    const next = Object.keys(POINTS.milestone).map(Number).find((m) => m > pct) || null;
    let nextMissing = null;
    if (next) {
      const target = (next / 100) * goal;
      nextMissing = c.unit === 'un' ? Math.ceil(target - 1e-9) - value : target - value;
    }
    return {
      category: c,
      goal,
      value,
      pct,
      remaining,
      need,
      needToday: c.unit === 'un' ? (remaining > 0 ? Math.max(1, Math.ceil(need - 1e-9)) : 0) : Math.ceil(need),
      projection,
      projectionPct: projection === null ? null : (projection / goal) * 100,
      status: remaining <= 0 ? 'done' : statusFor(pct, pace),
      next,
      nextMissing,
      nextPoints: next ? POINTS.milestone[next] : null,
    };
  });

  const scored = cats.filter((c) => c.pct !== null);
  const overall = scored.length ? scored.reduce((s, c) => s + c.pct, 0) / scored.length : 0;
  const projAll = scored.filter((c) => c.projectionPct !== null);
  const projection = projAll.length ? projAll.reduce((s, c) => s + c.projectionPct, 0) / projAll.length : null;
  const mission = scored
    .filter((c) => c.remaining > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  return {
    refDate,
    total,
    done,
    left,
    pace,
    hasSchedule: work.hasSchedule,
    overall,
    projection,
    cats,
    mission,
    streak,
    bestStreak,
    events,
    points: events.reduce((s, e) => s + e.points, 0),
    series,
    deltas,
    rates,
  };
}

/**
 * Daily rates (value gained per work day) for a past month, used to seed personal records.
 */
export function monthRates({ categories, results, work }) {
  const out = new Map();
  const byDate = new Map();
  for (const r of results) {
    if (!byDate.has(r.date)) byDate.set(r.date, new Map());
    byDate.get(r.date).set(r.category_id, Number(r.value));
  }
  const acc = new Map();
  let prev = null;
  for (const date of [...byDate.keys()].sort()) {
    const gap = countIn(work.days, prev, date);
    for (const c of categories) {
      const p = acc.get(c.id) || 0;
      const snap = byDate.get(date);
      const cur = snap.has(c.id) ? snap.get(c.id) : p;
      acc.set(c.id, cur);
      if (gap > 0) {
        const o = out.get(c.id) || { max: 0, count: 0 };
        out.set(c.id, { max: Math.max(o.max, (cur - p) / gap), count: o.count + gap });
      }
    }
    prev = date;
  }
  return out;
}

export function mergeRates(a, b) {
  const out = new Map(a);
  for (const [k, v] of b) {
    const o = out.get(k) || { max: 0, count: 0 };
    out.set(k, { max: Math.max(o.max, v.max), count: o.count + v.count });
  }
  return out;
}

/**
 * Team challenge: sum of positive deltas of a category inside [start, end].
 * Returns progress, completion date and contributors.
 */
export function evaluateChallenge(challenge, deltasByUser) {
  const flat = [];
  for (const [userId, deltas] of deltasByUser) {
    for (const d of deltas) {
      if (d.category_id === challenge.category_id && d.date >= challenge.start_date && d.date <= challenge.end_date && d.delta > 0) {
        flat.push({ userId, date: d.date, delta: d.delta });
      }
    }
  }
  flat.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let sum = 0;
  let completedOn = null;
  const contributors = new Set();
  for (const f of flat) {
    sum += f.delta;
    contributors.add(f.userId);
    if (!completedOn && sum >= challenge.target) completedOn = f.date;
  }
  return { progress: sum, completedOn, contributors: [...contributors] };
}
