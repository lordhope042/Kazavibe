import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

/**
 * Where uploaded files live.
 *   STORAGE_DRIVER=local     (default) a folder on this computer/server (STORAGE_DIR). Good for development and for servers with a disk.
 *   STORAGE_DRIVER=supabase  a PRIVATE Supabase Storage bucket. Needed on hosts whose disk is wiped on every deploy (e.g. Railway free).
 * Files are never public: every download goes through /api/media, which checks who is asking.
 */
const driver = () => (process.env.STORAGE_DRIVER ?? (process.env.VERCEL ? 'supabase' : 'local')); // Vercel has no persistent disk
/** True when files go straight from the browser to Supabase (needed on Vercel: its functions reject bodies over 4.5 MB). */
export const isDirect = () => driver() === 'supabase';
const DIR = process.env.STORAGE_DIR ?? path.join(process.cwd(), 'storage');
const NOT_FOUND = () => Response.json({ error: 'Not found' }, { status: 404 });

function sb() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, ''), key = process.env.SUPABASE_SERVICE_KEY, bucket = process.env.SUPABASE_BUCKET ?? 'kazavibe-media';
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set when STORAGE_DRIVER=supabase');
  // legacy service_role keys are JWTs (send as Bearer too); new sb_secret_ keys go in the apikey header only
  const auth: Record<string, string> = { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) };
  return { base: `${url}/storage/v1/object`, root: `${url}/storage/v1`, origin: url, bucket, auth };
}

export async function putObject(name: string, buf: Buffer, mime: string) {
  if (driver() === 'supabase') {
    const s = sb();
    const r = await fetch(`${s.base}/${s.bucket}/${name}`, { method: 'POST', cache: 'no-store', headers: { ...s.auth, 'Content-Type': mime, 'x-upsert': 'false' }, body: buf });
    if (!r.ok) throw new Error(`Storage upload failed (${r.status}): ${(await r.text().catch(() => '')).slice(0, 200)}`);
    return;
  }
  await fsp.mkdir(DIR, { recursive: true });
  await fsp.writeFile(path.join(DIR, name), buf);
}

export async function deleteObject(name: string) {
  try {
    if (driver() === 'supabase') { const s = sb(); await fetch(`${s.base}/${s.bucket}/${name}`, { method: 'DELETE', cache: 'no-store', headers: s.auth }); return; }
    await fsp.unlink(path.join(DIR, name));
  } catch { /* already gone */ }
}

type Range = { start: number; end: number } | 'bad' | undefined;
function parseRange(header: string | null, size: number): Range {
  const m = /bytes=(\d*)-(\d*)/.exec(header ?? '');
  if (!m) return undefined;
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; }
  return start > end || end >= size ? 'bad' : { start, end };
}

/** Streams a stored file, with Range support so video and audio can seek (Safari needs this). `h` = headers to send. */
export async function serveObject(name: string, rangeHeader: string | null, h: Record<string, string>): Promise<Response> {
  if (driver() === 'supabase') {
    const s = sb();
    const up = await fetch(`${s.base}/authenticated/${s.bucket}/${name}`, { cache: 'no-store', headers: { ...s.auth, ...(rangeHeader ? { Range: rangeHeader } : {}) } });
    if (up.status === 206) {
      return new Response(up.body, { status: 206, headers: { ...h, 'Content-Range': up.headers.get('content-range') ?? '', 'Content-Length': up.headers.get('content-length') ?? '' } });
    }
    if (!up.ok) return NOT_FOUND();
    if (rangeHeader) { // the server ignored Range and sent everything: cut the piece ourselves (files are at most 50 MB)
      const buf = Buffer.from(await up.arrayBuffer()), r = parseRange(rangeHeader, buf.length);
      if (r === 'bad') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${buf.length}` } });
      if (r) return new Response(buf.subarray(r.start, r.end + 1), { status: 206, headers: { ...h, 'Content-Range': `bytes ${r.start}-${r.end}/${buf.length}`, 'Content-Length': String(r.end - r.start + 1) } });
      return new Response(buf, { headers: { ...h, 'Content-Length': String(buf.length) } });
    }
    const len = up.headers.get('content-length');
    return new Response(up.body, { headers: len ? { ...h, 'Content-Length': len } : h });
  }
  const file = path.join(DIR, name), st = await fsp.stat(file).catch(() => null);
  if (!st) return NOT_FOUND();
  const r = parseRange(rangeHeader, st.size);
  if (r === 'bad') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${st.size}` } });
  if (r) return new Response(Readable.toWeb(fs.createReadStream(file, { start: r.start, end: r.end })) as any, { status: 206, headers: { ...h, 'Content-Range': `bytes ${r.start}-${r.end}/${st.size}`, 'Content-Length': String(r.end - r.start + 1) } });
  return new Response(Readable.toWeb(fs.createReadStream(file)) as any, { headers: { ...h, 'Content-Length': String(st.size) } });
}

/** A short-lived link the browser can PUT a file to, for exactly this file name. The secret key never leaves the server. */
export async function createSignedUpload(name: string): Promise<string> {
  const s = sb();
  const r = await fetch(`${s.base}/upload/sign/${s.bucket}/${name}`, { method: 'POST', cache: 'no-store', headers: { ...s.auth, 'Content-Type': 'application/json' }, body: '{}' });
  if (!r.ok) throw new Error(`Could not create an upload link (${r.status}): ${(await r.text().catch(() => '')).slice(0, 200)}`);
  const j = await r.json(), rel: string | undefined = j.url ?? j.signedURL;
  if (!rel) throw new Error('Storage returned no upload link');
  if (rel.startsWith('http')) return rel;
  return rel.startsWith('/storage/v1') ? `${s.origin}${rel}` : `${s.root}${rel.startsWith('/') ? rel : '/' + rel}`;
}

/** Size and first bytes of a stored file, without downloading all of it. Used to check what was really uploaded. */
export async function inspectObject(name: string): Promise<{ size: number; head: Buffer } | null> {
  if (driver() !== 'supabase') {
    const f = path.join(DIR, name), st = await fsp.stat(f).catch(() => null);
    if (!st) return null;
    const fh = await fsp.open(f, 'r'), buf = Buffer.alloc(Math.min(4096, st.size));
    await fh.read(buf, 0, buf.length, 0); await fh.close();
    return { size: st.size, head: buf };
  }
  const s = sb();
  const r = await fetch(`${s.base}/authenticated/${s.bucket}/${name}`, { cache: 'no-store', headers: { ...s.auth, Range: 'bytes=0-4095' } });
  if (!r.ok || !r.body) return null;
  const cr = r.headers.get('content-range'), total = Number(cr ? cr.split('/')[1] : r.headers.get('content-length')) || 0;
  const reader = r.body.getReader(), chunks: Buffer[] = [];
  let got = 0;
  while (got < 4096) { const { done, value } = await reader.read(); if (done) break; chunks.push(Buffer.from(value)); got += value.length; }
  await reader.cancel().catch(() => {});
  return { size: total || got, head: Buffer.concat(chunks).subarray(0, 4096) };
}
