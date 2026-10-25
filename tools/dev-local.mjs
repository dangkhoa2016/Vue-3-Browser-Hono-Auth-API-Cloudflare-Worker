// Local Vue server with a same-origin proxy to Wrangler. No build required.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.vue': 'text/plain', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' };

http.createServer(async (req, res) => {
  if (req.url === '/backend' || req.url.startsWith('/backend/')) {
    const upstream = http.request({
      hostname: '127.0.0.1', port: 8787,
      path: req.url.slice('/backend'.length) || '/', method: req.method,
      headers: { ...req.headers, host: 'localhost:8787' },
    }, (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end('Start the backend with npm run dev'); });
    req.pipe(upstream);
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    // Serve only application assets, never repository metadata or local config.
    if (relative !== 'index.html' && !/^(assets|vue)\//.test(relative)) throw new Error('Not found');
    if (relative.split('/').some(part => part.startsWith('.'))) throw new Error('Not found');
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root)) throw new Error('Not found');
    let body = await readFile(filename);
    if (relative === 'index.html') {
      body = Buffer.from(body.toString().replace('<head>', `<head>
  <script>
    try {
      localStorage.setItem('api-base-url', location.origin + '/backend/');
      localStorage.setItem('mock-api', 'false');
    } catch (_) {}
  </script>`));
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (_) { res.writeHead(404); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Vue: http://localhost:${port} (real API via /backend -> localhost:8787)`));
