// Local stand-in for Vercel: serves the static files and mounts api/*.js the
// way Vercel's Node runtime does (req.query, res.statusCode/setHeader/end).
//   node scripts/dev.mjs   →   http://localhost:3210
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const PORT = Number(process.env.PORT || 3210);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };

http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  if (u.pathname.startsWith('/api/')) {
    const file = path.join(ROOT, 'api', u.pathname.slice(5).replace(/[^a-z0-9_-]/gi, '') + '.js');
    if (!fs.existsSync(file)) { res.statusCode = 404; res.end('no such function'); return; }
    delete require.cache[require.resolve(file)];
    req.query = Object.fromEntries(u.searchParams);
    try { await require(file)(req, res); } catch (e) { res.statusCode = 500; res.end(String(e && e.stack || e)); }
    return;
  }
  let p = u.pathname === '/' ? '/haze-prototype.dc.html' : u.pathname;
  const file = path.join(ROOT, decodeURIComponent(p));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; res.end('not found'); return; }
  res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`haze dev → http://localhost:${PORT}`));
