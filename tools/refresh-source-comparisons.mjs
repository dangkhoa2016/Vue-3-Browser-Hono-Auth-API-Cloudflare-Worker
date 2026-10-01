#!/usr/bin/env node
// Explicit maintenance command: compare historical manifests with today's source.
// This writes derived comparisons only; it never updates a run, log, snapshot or manifest.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest, compareSourceManifests } from './frontend-source-identity.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = resolve(root, 'reports/FRONTEND-SOURCE-COMPARISONS.json');
const previous = JSON.parse(readFileSync(path, 'utf8'));
if (previous.schema !== 'frontend-source-comparisons/1' || !Array.isArray(previous.entries)) {
  throw new Error('Invalid source comparison input');
}
const current = buildManifest(root);
const entries = previous.entries.map(({ fromRunId }) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(fromRunId)) throw new Error('Invalid historical run id');
  const before = JSON.parse(readFileSync(resolve(root, `reports/evidence/${fromRunId}.source-before.manifest.json`), 'utf8'));
  return compareSourceManifests(fromRunId, before, current);
});
writeFileSync(path, JSON.stringify({
  schema: previous.schema,
  purpose: 'Derived comparison to current source; historical outcomes and manifests remain unchanged.',
  generatedAt: new Date().toISOString(),
  historicalComparison: 'reports/evidence/historical-source-comparisons.json',
  entries
}, null, 2) + '\n');
console.log(`Compared ${entries.length} historical manifests with current source ${current.digest}`);
