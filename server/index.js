import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { openDb } from './db.js';
import { createApp, bootstrapAdmin } from './app.js';

const db = openDb();
bootstrapAdmin(db);
const app = createApp(db);

// Built frontend (npm run build) served from /dist with SPA fallback
const dist = path.resolve('dist');
if (fs.existsSync(dist)) {
  app.use('/assets/*', serveStatic({ root: './dist', onFound: (_p, c) => c.header('cache-control', 'public, max-age=31536000, immutable') }));
  app.use('/*', serveStatic({ root: './dist' }));
  const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  app.get('*', (c) => (c.req.path.startsWith('/api/') ? c.json({ error: 'Não encontrado.' }, 404) : c.html(index)));
}

const port = Number(process.env.PORT || 3000);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => console.log(`Objetivos RP a correr em http://0.0.0.0:${port}`));

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { db.close(); process.exit(0); });
