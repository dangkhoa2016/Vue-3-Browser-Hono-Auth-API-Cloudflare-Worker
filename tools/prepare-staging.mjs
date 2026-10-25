// Package only public application files; configure the real staging API.
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const api = new URL(process.env.STAGING_API_URL || '');
if (api.protocol !== 'https:') throw new Error('STAGING_API_URL must use HTTPS');
const output = path.join(root, '.staging-dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ['assets', 'vue']) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
const apiJson = JSON.stringify(api.href.replace(/\/?$/, '/')).replaceAll('<', '\\u003c');
const html = (await readFile(path.join(root, 'index.html'), 'utf8')).replace('<head>', `<head>
  <script>
    try {
      localStorage.setItem('api-base-url', ${apiJson});
      localStorage.setItem('mock-api', 'false');
    } catch (_) {}
  </script>`);
await writeFile(path.join(output, 'index.html'), html);
console.log(`Staging assets prepared for API ${api.href}`);
