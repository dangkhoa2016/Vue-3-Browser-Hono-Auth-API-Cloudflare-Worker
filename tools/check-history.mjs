#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path => /^(assets\/js|vue|tools)\//.test(path) && /\.(js|mjs|cjs|vue)$/.test(path);

/** Check explicit local dependencies, including eager SFC imports and literal route loaders. */
export function findMissingLinks(files) {
  const missing = [];
  for (const [path, content] of files) {
    if (!sourcePath(path)) continue;
    const imports = [...content.matchAll(/^\s*import\s+(?:[^;]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map(m => m[1]);
    if (path === 'assets/js/router.js') imports.push(...[...content.matchAll(/\bload\(['"]([^'"]+)['"]/g)].map(m => m[1]));
    if (path.endsWith('.vue')) imports.push(...[...content.matchAll(/<script\b[^>]*\bsrc=['"]([^'"]+)['"]/g)].map(m => m[1]));
    for (const specifier of imports) {
      if (!specifier.startsWith('/') && !specifier.startsWith('.')) continue;
      const target = specifier.startsWith('/') ? specifier.slice(1) : posix.join(posix.dirname(path), specifier);
      const resolved = posix.normalize(target);
      if (!files.has(resolved)) missing.push({ path, specifier, resolved });
    }
  }
  return missing;
}

export function checkHistory(repoRoot = ROOT, ref = 'HEAD') {
  const git = (...args) => execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const head = git('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).trim();
  const commits = git('rev-list', '--reverse', '--topo-order', head).trim().split('\n');
  const blobs = new Map(); const problems = [];
  for (const commit of commits) {
    const files = new Map();
    for (const line of git('ls-tree', '-r', commit).trim().split('\n')) {
      const tab = line.indexOf('\t'); const path = line.slice(tab + 1);
      const [mode, type, blob] = line.slice(0, tab).split(' ');
      if (type !== 'blob') continue;
      // Keep every path for resolution; only read source file bodies.
      if (sourcePath(path)) {
        if (mode === '120000') { problems.push({ commit, path, reason: 'Source symlinks are not supported' }); continue; }
        if (!blobs.has(blob)) blobs.set(blob, git('cat-file', 'blob', blob));
        files.set(path, blobs.get(blob));
      } else files.set(path, '');
    }
    problems.push(...findMissingLinks(files).map(problem => ({ commit, ...problem })));
  }
  return { head, commits: commits.length, sourceBlobs: blobs.size, problems };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ref = process.argv[2] || 'HEAD';
  try {
    const result = checkHistory(ROOT, ref);
    console.log(JSON.stringify(result, null, 2));
    if (result.problems.length) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
