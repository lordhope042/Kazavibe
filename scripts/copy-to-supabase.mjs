// Copies the data from your LOCAL database (and the files in ./storage) into Supabase.
// Run AFTER the tables exist in Supabase (npx prisma migrate deploy). Safe to re-run: rows that already exist are skipped.
//
// PowerShell, from the project folder:
//   $env:TARGET_DATABASE_URL="postgresql://postgres.PROJECTREF:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
//   $env:SUPABASE_URL="https://PROJECTREF.supabase.co"          (only needed to copy uploaded files)
//   $env:SUPABASE_SERVICE_KEY="your secret key"                  (only needed to copy uploaded files)
//   node scripts/copy-to-supabase.mjs          <- shows what it would copy, changes nothing
//   node scripts/copy-to-supabase.mjs --yes    <- does the copy
import fs from 'fs';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const die = (m) => { console.error('\nSTOPPED: ' + m); process.exit(1); };
// The SOURCE is always read from your .env file, never from the shell, so it cannot accidentally be Supabase itself.
const env = {};
try { for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) { const v = m[2].trim(), q = v.match(/^"([^"]*)"|^'([^']*)'/); env[m[1]] = q ? (q[1] ?? q[2]) : v.replace(/\s+#.*$/, ''); } } } catch { die('Could not read .env. Run this from the project folder.'); }
const SOURCE = env.DATABASE_URL, TARGET = process.env.TARGET_DATABASE_URL;
if (!SOURCE) die('DATABASE_URL is missing from your .env file.');
if (!TARGET) die('Set $env:TARGET_DATABASE_URL to your Supabase connection string first.');
if (SOURCE === TARGET) die('Source and target are the same database.');
const host = (u) => { try { return new URL(u).host; } catch { return '(unreadable)'; } };
console.log(`From (local):  ${host(SOURCE)}\nTo (Supabase): ${host(TARGET)}`);

const src = new PrismaClient({ datasources: { db: { url: SOURCE } } });
const dst = new PrismaClient({ datasources: { db: { url: TARGET } } });
// Parents before children. Temporary data (codes, call signals) is not copied.
const ORDER = ['user', 'profile', 'follow', 'followRequest', 'block', 'report', 'auditLog', 'post', 'like', 'save', 'comment', 'notification', 'conversation', 'message', 'payment', 'interest', 'match', 'pushSub', 'verification'];

const counts = {};
for (const m of ORDER) counts[m] = await src[m].count();
console.log('\nRows to copy: ' + ORDER.filter((m) => counts[m]).map((m) => `${m} ${counts[m]}`).join(', '));
const dir = process.env.STORAGE_DIR || path.join(process.cwd(), 'storage');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^[a-f0-9-]{36}\.[a-z0-9]+$/.test(f)) : [];
console.log(`Files in ${dir}: ${files.length}`);
if (!process.argv.includes('--yes')) { console.log('\nNothing was changed. Add --yes to copy.'); process.exit(0); }
if (await dst.user.count() && !process.argv.includes('--force')) die('Supabase already has members. Re-run with --yes --force to copy anyway (existing rows are skipped, nothing is overwritten).');

for (const m of ORDER) {
  if (!counts[m]) continue;
  let rows = await src[m].findMany();
  if (m === 'auditLog') rows = rows.map((r) => ({ ...r, meta: r.meta === null ? Prisma.JsonNull : r.meta }));
  const batches = m === 'comment' ? [rows.filter((r) => !r.parentId), rows.filter((r) => r.parentId)] : [rows]; // replies after the comments they answer
  let done = 0;
  for (const b of batches) for (let i = 0; i < b.length; i += 500) done += (await dst[m].createMany({ data: b.slice(i, i + 500), skipDuplicates: true })).count;
  console.log(`  ${m.padEnd(14)} copied ${done} of ${rows.length}`);
}

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4a: 'audio/mp4', ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
const SB = process.env.SUPABASE_URL?.replace(/\/$/, ''), KEY = process.env.SUPABASE_SERVICE_KEY, BUCKET = process.env.SUPABASE_BUCKET || 'kazavibe-media';
if (files.length && (!SB || !KEY)) console.log('\nUploaded files were NOT copied: set $env:SUPABASE_URL and $env:SUPABASE_SERVICE_KEY and run again.');
else if (files.length) {
  const auth = { apikey: KEY, ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}) };
  let up = 0, skipped = 0, failed = 0;
  for (const f of files) {
    const r = await fetch(`${SB}/storage/v1/object/${BUCKET}/${f}`, { method: 'POST', headers: { ...auth, 'Content-Type': MIME[f.split('.').pop()] ?? 'application/octet-stream', 'x-upsert': 'false' }, body: fs.readFileSync(path.join(dir, f)) });
    if (r.ok) up++; else if (r.status === 409 || /already exists|Duplicate/i.test(await r.text().catch(() => ''))) skipped++; else { failed++; console.log(`  could not upload ${f} (HTTP ${r.status}). Does the bucket "${BUCKET}" exist?`); }
  }
  console.log(`\nFiles: ${up} uploaded, ${skipped} already there, ${failed} failed`);
}
await src.$disconnect(); await dst.$disconnect();
console.log('\nDone. Check the Table Editor in Supabase, then run:  npm run db:secure');
