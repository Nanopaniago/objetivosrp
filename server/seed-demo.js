// Fills an EMPTY database with a demo store so the app can be tried out.
// Usage: DATA_DIR=./data-demo node server/seed-demo.js   (never run against real data)
import { openDb, tx } from './db.js';
import { hashPassword } from './auth.js';
import { workDaysOf, daysInMonth, dateOf } from './engine.js';
import { todayStr } from './services.js';

const db = openDb();
if (db.prepare('SELECT COUNT(*) AS n FROM stores').get().n > 0) {
  console.error('A base de dados já tem lojas. O demo só corre numa base de dados vazia.');
  process.exit(1);
}

const today = todayStr();
const [Y, M, D] = today.split('-').map(Number);
const pw = hashPassword('demo1234');
const cats = db.prepare('SELECT id, slug FROM categories').all();
const cid = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

// deterministic pseudo-random
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

tx(db, () => {
  if (!db.prepare(`SELECT 1 FROM users WHERE role = 'admin'`).get()) {
    db.prepare(`INSERT INTO users (name, first_name, username, password_hash, role) VALUES ('Admin Demo', 'Admin', 'admin', ?, 'admin')`).run(pw);
  }
  const stores = [
    db.prepare(`INSERT INTO stores (name, code) VALUES ('Loja Demo Norte', '230')`).run().lastInsertRowid,
    db.prepare(`INSERT INTO stores (name, code) VALUES ('Loja Demo Sul', '231')`).run().lastInsertRowid,
  ].map(Number);

  const mk = (name, username, role, storeId, igl = 0) =>
    Number(db.prepare('INSERT INTO users (name, first_name, username, password_hash, role, store_id, igl) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, name.split(' ')[0], username, pw, role, storeId, igl).lastInsertRowid);

  const gestor = mk('Daniel Gestor', 'gestor', 'manager', stores[0]);
  db.prepare('INSERT INTO manager_stores (user_id, store_id) VALUES (?, ?)').run(gestor, stores[0]);

  const team = [
    ['Ana Sousa', 'ana', 0.95, 0], ['Bruno Lima', 'bruno', 1.2, 0], ['Carla Matos', 'carla', 0.9, 0],
    ['Diogo Reis', 'diogo', 0.8, 0], ['Eva Costa', 'eva', 1.1, 1], ['Filipe Rocha', 'filipe', 0.75, 0],
    ['Gonçalo Pires', 'goncalo', 1.0, 0], ['Helena Dias', 'helena', 0.85, 0], ['Inês Faria', 'ines', 1.05, 0],
  ];
  const goals = { plus_master: 19000, plus: 5400, megas_total: 2000, dm_classicas: 940, dimobilli: 2, peliculas: 11 };
  const n = daysInMonth(Y, M);

  team.forEach(([name, username, perf, igl], i) => {
    const storeId = i < 6 ? stores[0] : stores[1];
    const uid = mk(name, username, 'seller', storeId, igl);
    for (const [slug, g] of Object.entries(goals)) {
      db.prepare('INSERT INTO goals (store_id, user_id, category_id, year, month, target) VALUES (?, ?, ?, ?, ?, ?)').run(storeId, uid, cid[slug], Y, M, g);
    }
    const rows = [];
    for (let d = 1; d <= n; d++) {
      const off = (d + i * 2) % 7 === 0 || (d + i * 2) % 7 === 1;
      const kind = off ? 'O' : igl ? 'L' : (Math.floor((d - 1) / 7) + i) % 2 === 0 ? 'A' : 'F';
      rows.push({ date: dateOf(Y, M, d), kind });
      db.prepare('INSERT INTO schedules (store_id, user_id, date, kind, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)').run(storeId, uid, dateOf(Y, M, d), kind, kind === 'L' ? '09:00' : null, kind === 'L' ? '18:00' : null);
    }
    const work = workDaysOf(rows, Y, M);
    const acc = Object.fromEntries(Object.keys(goals).map((k) => [k, 0]));
    for (const date of work.days) {
      if (date >= today) break;
      for (const [slug, g] of Object.entries(goals)) {
        const perDay = g / work.days.length;
        if (g <= 11) {
          if (rnd() < perDay * perf * 1.1) acc[slug] += 1;
        } else {
          acc[slug] += Math.round(perDay * perf * (0.55 + rnd() * 0.9));
        }
        db.prepare(`INSERT INTO results (store_id, user_id, category_id, date, value, source) VALUES (?, ?, ?, ?, ?, 'manual')`).run(storeId, uid, cid[slug], date, acc[slug]);
      }
    }
  });

  const start = dateOf(Y, M, Math.max(1, D - 3));
  const end = dateOf(Y, M, Math.min(n, D + 3));
  db.prepare('INSERT INTO challenges (store_id, title, category_id, target, start_date, end_date, points) VALUES (?, ?, ?, ?, ?, ?, 50)').run(stores[0], 'Semana das Películas', cid.peliculas, 8, start, end);
});

console.log('Demo criado. Entra com admin / gestor / ana (palavra-passe: demo1234).');
