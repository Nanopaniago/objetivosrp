import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSeller, workDaysOf, evaluateChallenge, monthRates } from '../engine.js';

const cats = [
  { id: 1, slug: 'plus', name: 'Plus', unit: 'eur' },
  { id: 2, slug: 'peliculas', name: 'Películas', unit: 'un' },
];

test('work days without schedule skip Sundays', () => {
  const w = workDaysOf([], 2026, 10);
  assert.equal(w.hasSchedule, false);
  assert.equal(w.days.length, 27); // Oct 2026 has 4 Sundays
  assert.ok(!w.days.includes('2026-10-04'));
});

test('work days with schedule count only A/F/L', () => {
  const rows = [
    { date: '2026-10-01', kind: 'A' },
    { date: '2026-10-02', kind: 'F' },
    { date: '2026-10-03', kind: 'O' },
    { date: '2026-10-05', kind: 'V' },
    { date: '2026-10-06', kind: 'L' },
  ];
  const w = workDaysOf(rows, 2026, 10);
  assert.deepEqual(w.days, ['2026-10-01', '2026-10-02', '2026-10-06']);
});

test('daily target = remaining / work days left after last report', () => {
  const work = workDaysOf([], 2026, 10);
  const r = evaluateSeller({
    categories: cats,
    goals: new Map([[1, 2700], [2, 2]]),
    results: [
      { date: '2026-10-01', category_id: 1, value: 100 },
      { date: '2026-10-01', category_id: 2, value: 1 },
      { date: '2026-10-02', category_id: 1, value: 200 },
      { date: '2026-10-03', category_id: 1, value: 300 },
    ],
    work,
    today: '2026-10-19',
  });
  assert.equal(r.refDate, '2026-10-03');
  assert.equal(r.done, 3);
  assert.equal(r.left, 24);
  const plus = r.cats.find((c) => c.category.id === 1);
  assert.equal(plus.need, 100);
  assert.equal(plus.needToday, 100);
  const pel = r.cats.find((c) => c.category.id === 2);
  assert.equal(pel.pct, 50);
  assert.equal(pel.needToday, 1); // concrete number, never 0.04 units
  assert.equal(pel.next, 80);
  assert.equal(pel.nextMissing, 1); // ceil(1.6) - 1
  // 3 daily goals in Plus + 1 in Películas, milestone 50% Películas, streak of 3
  const types = r.events.map((e) => e.type).sort();
  assert.deepEqual(types, ['daily', 'daily', 'daily', 'daily', 'milestone', 'streak']);
  assert.equal(r.points, 4 * 20 + 40 + 30);
  assert.equal(r.streak, 3);
});

test('a bad day resets the streak; days off do not', () => {
  const sched = [];
  for (let d = 1; d <= 31; d++) sched.push({ date: `2026-10-${String(d).padStart(2, '0')}`, kind: d === 2 ? 'O' : 'A' });
  const work = workDaysOf(sched, 2026, 10); // 30 work days
  const r = evaluateSeller({
    categories: [cats[0]],
    goals: new Map([[1, 3000]]),
    results: [
      { date: '2026-10-01', category_id: 1, value: 100 },
      // day 2 is a day off: no report
      { date: '2026-10-03', category_id: 1, value: 200 },
      { date: '2026-10-04', category_id: 1, value: 205 }, // bad day
    ],
    work,
    today: '2026-10-19',
  });
  assert.equal(r.streak, 0);
  assert.equal(r.bestStreak, 2);
});

test('gaps between reports are judged over all work days in the gap', () => {
  const work = workDaysOf([], 2026, 10);
  const r = evaluateSeller({
    categories: [cats[0]],
    goals: new Map([[1, 2700]]),
    results: [{ date: '2026-10-03', category_id: 1, value: 300 }], // 3 work days at once
    work,
    today: '2026-10-19',
  });
  assert.equal(r.events.filter((e) => e.type === 'daily').length, 1);
  assert.equal(r.streak, 3);
});

test('reports in the future are ignored', () => {
  const work = workDaysOf([], 2026, 10);
  const r = evaluateSeller({ categories: [cats[0]], goals: new Map([[1, 1000]]), results: [{ date: '2026-10-25', category_id: 1, value: 900 }], work, today: '2026-10-19' });
  assert.equal(r.refDate, null);
  assert.equal(r.cats[0].value, 0);
});

test('personal record needs history and beats the previous best', () => {
  const work = workDaysOf([], 2026, 10);
  const prior = monthRates({
    categories: [cats[0]],
    results: [1, 2, 3, 5, 6, 7].map((d, i) => ({ date: `2026-09-${String(d).padStart(2, '0')}`, category_id: 1, value: (i + 1) * 100 })),
    work: workDaysOf([], 2026, 9),
  });
  assert.equal(prior.get(1).max, 100);
  const r = evaluateSeller({
    categories: [cats[0]],
    goals: new Map([[1, 2700]]),
    results: [{ date: '2026-10-01', category_id: 1, value: 250 }],
    work,
    priorRates: prior,
    today: '2026-10-19',
  });
  assert.ok(r.events.some((e) => e.type === 'record'));
});

test('team challenge completes when the sum reaches the target', () => {
  const res = evaluateChallenge(
    { category_id: 2, target: 3, start_date: '2026-10-01', end_date: '2026-10-07' },
    new Map([
      [10, [{ date: '2026-10-02', category_id: 2, delta: 2 }]],
      [11, [{ date: '2026-10-05', category_id: 2, delta: 1 }, { date: '2026-10-09', category_id: 2, delta: 5 }]],
    ])
  );
  assert.equal(res.progress, 3);
  assert.equal(res.completedOn, '2026-10-05');
  assert.deepEqual(res.contributors.sort(), [10, 11]);
});
