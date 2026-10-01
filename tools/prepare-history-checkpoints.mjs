#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = 'reports/evidence/historical-checkpoints.bundle';

/** Restore only pinned audit refs, offline. Never update HEAD, local branches or remote refs. */
export function prepareHistoricalCheckpoints(repoRoot = ROOT) {
  const catalog = JSON.parse(readFileSync(resolve(repoRoot, 'reports/HISTORY-CHECKPOINTS.json'), 'utf8'));
  if (catalog.schema !== 'frontend-history-checkpoints/1' || catalog.bundle !== BUNDLE
      || !Array.isArray(catalog.checkpoints) || !catalog.checkpoints.length) {
    throw new Error('Invalid historical checkpoint catalog');
  }
  const bundle = resolve(repoRoot, BUNDLE);
  const digest = createHash('sha256').update(readFileSync(bundle)).digest('hex');
  if (digest !== catalog.sha256) throw new Error('Historical checkpoint bundle checksum mismatch');
  const git = (...args) => execFileSync('git', ['-C', repoRoot, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
  const advertised = new Map(git('bundle', 'list-heads', bundle).split('\n').map(line => {
    const [sha, ref] = line.split(' '); return [ref, sha];
  }));
  const seen = new Set();
  for (const { ref, sha } of catalog.checkpoints) {
    if (!/^refs\/heads\/checkpoint-[a-f0-9]{12}$/.test(ref) || !/^[a-f0-9]{40}$/.test(sha)
        || !ref.endsWith(sha.slice(0, 12)) || seen.has(ref)) {
      throw new Error('Invalid or duplicate historical checkpoint ref');
    }
    seen.add(ref);
    if (advertised.get(ref) !== sha) throw new Error('Checkpoint SHA differs from advertised bundle commit');
  }
  if (advertised.size !== seen.size) throw new Error('Unexpected refs in historical checkpoint bundle');
  // Validate the pack before any ref mutation; checksum alone is not a Git-format check.
  git('bundle', 'verify', bundle);
  const missing = catalog.checkpoints.filter(({ ref, sha }) => {
    const destination = `refs/history-audit/${ref.split('/').at(-1)}`;
    let symbolic = null;
    try { symbolic = git('symbolic-ref', '-q', destination); }
    catch (error) { if (error.status !== 1) throw error; }
    if (symbolic) throw new Error(`Symbolic historical checkpoint destination refused: ${destination}`);
    let existing = null;
    try { existing = git('rev-parse', '--verify', destination); } catch (_) { /* Not created yet. */ }
    if (existing && existing !== sha) throw new Error(`Unexpected historical checkpoint destination: ${destination}`);
    return !existing;
  });
  if (missing.length) {
    // Import objects without a destination refspec. Never let fetch follow an audit
    // symbolic ref into a user's branch. The transaction below creates only direct
    // refs and fails atomically if a destination appeared after the checks above.
    git('fetch', '--no-tags', '--no-write-fetch-head', '--no-auto-gc', bundle,
      ...missing.map(({ ref }) => ref));
    const transaction = ['start',
      ...missing.flatMap(({ ref, sha }) => ['option no-deref',
        `create refs/history-audit/${ref.split('/').at(-1)} ${sha}`]),
      'prepare', 'commit', ''].join('\n');
    execFileSync('git', ['-C', repoRoot, 'update-ref', '--no-deref', '--stdin'], {
      input: transaction, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  for (const { sha } of catalog.checkpoints) git('cat-file', '-e', `${sha}^{commit}`);
  return { verified: catalog.checkpoints.length, restored: missing.length, sha256: digest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(prepareHistoricalCheckpoints())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
