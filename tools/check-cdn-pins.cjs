#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// The same files the browser fixture derives its allowlist from. If the two lists diverge, the gate and
// the guard end up disagreeing about what the app asks for — which is how the Google Fonts stylesheet in
// `vue/Loader.vue` ended up outside both: the guard had to allow its whole origin to keep the app's
// fonts loading, and the gate never checked it at all (FR9-04).
const TARGETS = ['index.html', 'vue/Loader.js', 'vue/Loader.vue', 'assets/js/init.js', 'assets/js/appServices.js'];

// Only the exact Google Fonts query remains an explicitly floating upstream resource.
const ACCEPTED_FLOATING = new Map([
  // The Google Fonts stylesheet is query-addressed and Google republishes it in place, so there is no
  // version segment to name. The browser policy still pins the *exact* request — host, path and the whole
  // family query — so this is a floating upstream dependency, not an unpinned host: anything else on
  // fonts.googleapis.com is refused at runtime.
  ['https://fonts.googleapis.com/css2?family=Noto+Sans:wght@500;700&family=Noto+Sans+KR:wght@500;700&family=Noto+Sans+JP:wght@500;700&display=swap',
    'Google Fonts is query-addressed and republished in place; the browser policy names this exact request and no other resource on that host']
]);

const CDN_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net', 'cdn.tailwindcss.com', 'fonts.googleapis.com'];
const EXACT_VERSION = /@[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?(?=\/|$)/;
const FLOATING_VERSION = /@(?:latest|next|canary|[0-9]+(?:\.[0-9x*]+)*|[\^~]|\*)/;
const VERSION_PREFIX = /\/npm\/[^/]*?@[^/]*\//;

function extractUrls (file) {
  const text = fs.readFileSync(file, 'utf8');
  const urls = new Set();
  for (const match of text.matchAll(/https:\/\/[^\s'"`)]+/g)) urls.add(match[0]);
  return [...urls];
}

function classify (url) {
  if (/^https:\/\/cdn\.tailwindcss\.com\/[0-9]+\.[0-9]+\.[0-9]+$/.test(url)) return { status: 'ok', note: '' };
  if (ACCEPTED_FLOATING.has(url)) return { status: 'accepted', note: ACCEPTED_FLOATING.get(url) };
  if (EXACT_VERSION.test(url)) return { status: 'ok', note: '' };
  if (FLOATING_VERSION.test(url)) return { status: 'fail', note: 'floating tag or range instead of an exact version' };
  if (VERSION_PREFIX.test(url)) return { status: 'fail', note: 'version segment is not an exact release' };
  return { status: 'fail', note: 'dependency has no exact version' };
}

async function reachable (url) {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

async function main () {
  const online = process.argv.includes('--online');
  const files = TARGETS.filter((file) => fs.existsSync(path.join(ROOT, file)));
  const rows = [];

  for (const file of files) {
    for (const url of extractUrls(path.join(ROOT, file))) {
      let host = '';
      try {
        host = new URL(url).host;
      } catch (error) {
        rows.push({ file, url, status: 'fail', note: `unparsable URL: ${error.message}` });
        continue;
      }
      if (!CDN_HOSTS.includes(host)) continue;
      const result = classify(url);
      if (online && result.status !== 'fail') {
        const check = await reachable(url);
        if (!check.ok) {
          result.status = 'fail';
          result.note = result.note || `unreachable (${check.error || `HTTP ${check.status}`})`;
        } else if (result.status === 'ok') {
          result.note = `HTTP ${check.status}`;
        }
      }
      rows.push({ file, url, ...result });
    }
  }

  if (rows.length === 0) {
    console.error('FAIL: no CDN dependency was found in the checked files.');
    process.exit(1);
  }

  console.log(online ? 'CDN pin check (static + reachability)' : 'CDN pin check (static only, pass --online to probe reachability)');
  console.log('');
  for (const row of rows) {
    const flag = row.status === 'ok' ? 'OK  ' : row.status === 'accepted' ? 'WARN' : 'FAIL';
    console.log(`${flag} ${row.file}: ${row.url}${row.note ? `  [${row.note}]` : ''}`);
  }

  const failed = rows.filter((row) => row.status === 'fail');
  const accepted = rows.filter((row) => row.status === 'accepted');
  console.log('');
  console.log(`${rows.length - failed.length}/${rows.length} CDN references pinned to an exact version.`);
  if (accepted.length) console.log(`${accepted.length} accepted floating reference(s) recorded above.`);

  if (failed.length) {
    console.error(`FAIL: ${failed.length} CDN reference(s) are not reproducible.`);
    process.exit(1);
  }
  console.log('PASS: every CDN reference resolves to an exact version.');
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
