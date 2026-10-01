/** Bounded, read-only audit of this project's regular-file ustar snapshots. */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { verifySourceManifest } from './frontend-source-identity.mjs';

const BLOCK = 512;
const MAX_BYTES = 256 * 1024 * 1024;
const fail = message => { throw new Error(`snapshot: ${message}`); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function canonicalPath(path) {
  return typeof path === 'string' && path.length > 0 && !/[\\\x00-\x1f\x7f]/.test(path)
    && !path.startsWith('/') && !/^[A-Za-z]:/.test(path)
    && path.split('/').every(p => p && p !== '.' && p !== '..');
}

export function auditSnapshot(input) {
  if (!Buffer.isBuffer(input) && statSync(input).size > 64 * 1024 * 1024) fail('compressed archive exceeds limit');
  const compressed = Buffer.isBuffer(input) ? input : readFileSync(input);
  if (compressed.length > 64 * 1024 * 1024) fail('compressed archive exceeds limit');
  let tar;
  try { tar = gunzipSync(compressed, { maxOutputLength: MAX_BYTES }); }
  catch (error) { fail(`invalid gzip archive: ${error.message}`); }
  if (tar.length % BLOCK !== 0) fail('truncated archive');
  const entries = [];
  const paths = new Set();
  let offset = 0;
  const string = (header, at, size) => {
    const field = header.subarray(at, at + size);
    const end = field.indexOf(0);
    if (end >= 0 && field.subarray(end).some(v => v !== 0)) fail('invalid header string padding');
    const bytes = end < 0 ? field : field.subarray(0,end);
    const value = bytes.toString('utf8');
    if (!Buffer.from(value).equals(bytes)) fail('invalid header UTF-8');
    return value;
  };
  const octal = (header, at, size) => {
    const text = header.subarray(at, at + size).toString('ascii').replace(/[\0 ]+$/,'').trim();
    if (!/^[0-7]+$/.test(text)) fail('invalid octal header');
    const n = parseInt(text,8);
    if (!Number.isSafeInteger(n) || n < 0) fail('invalid header size');
    return n;
  };
  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (header.every(v => v === 0)) {
      if (tar.length - offset < BLOCK * 2 || tar.subarray(offset).some(v => v !== 0)) fail('invalid archive end marker');
      for (const path of paths) {
        const parts=path.split('/');
        while(parts.length>1) {parts.pop();if(paths.has(parts.join('/'))) fail('file-directory collision');}
      }
      return entries;
    }
    if (header.subarray(257,263).toString('ascii') !== 'ustar\0' || header.subarray(263,265).toString('ascii') !== '00') fail('unsupported archive header format');
    const declaredChecksum = octal(header,148,8);
    let checksum = 0;
    for (let i=0;i<BLOCK;i++) checksum += i >= 148 && i < 156 ? 32 : header[i];
    if (checksum !== declaredChecksum) fail('invalid header checksum');
    if (header[156] !== 48 && header[156] !== 0) fail('unsupported archive entry type (links and extensions refused)');
    if (string(header,157,100)) fail('unexpected link target on regular file');
    const prefix = string(header,345,155);
    const path = (prefix ? `${prefix}/` : '') + string(header,0,100);
    if (!canonicalPath(path) || paths.has(path)) fail(`invalid or duplicate archive path: ${path}`);
    paths.add(path);
    const size = octal(header,124,12);
    const mode = octal(header,100,8);
    if (mode !== 0o644 && mode !== 0o755) fail(`unsupported archive mode: ${path}`);
    const start = offset + BLOCK;
    const end = start + size;
    const next = start + Math.ceil(size / BLOCK) * BLOCK;
    if (next > tar.length || size > MAX_BYTES) fail('truncated archive body');
    if (tar.subarray(end,next).some(v => v !== 0)) fail('invalid archive padding');
    const bytes = tar.subarray(start,end);
    entries.push({path,mode:`100${mode.toString(8)}`,size,sha256:hash(bytes),bytes});
    if (entries.length > 100000) fail('too many archive entries');
    offset = next;
  }
  fail('missing archive end marker');
}

export function verifySnapshot(archive, manifest) {
  verifySourceManifest(manifest);
  const entries = auditSnapshot(archive);
  const expected = new Map(manifest.files.map(f => [f.path,f]));
  if (entries.length !== expected.size) fail('archive file set does not match manifest');
  for (const entry of entries) {
    const file = expected.get(entry.path);
    if (!file || ['mode','size','sha256'].some(k => entry[k] !== file[k])) fail(`archive entry differs from manifest: ${entry.path}`);
  }
  return {fileCount:entries.length, bytes:entries.reduce((sum,e) => sum+e.size,0), digest:manifest.digest};
}
