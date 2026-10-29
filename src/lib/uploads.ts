import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { HttpError } from './http';
import { DOC_EXT, LIMIT_MB, NAME_RE, sniff, type Kind } from './media';
import { deleteObject, inspectObject } from './storage';

/**
 * Direct uploads: the browser sends the file straight to storage (so it never passes through a size-limited server function),
 * then asks us to "claim" it. Claiming re-checks everything on the server: the file really is what it says, it is not too big,
 * and the name was issued to THIS member (a signed ticket), so nobody can claim someone else's file.
 */
export type Purpose = 'post' | 'avatar' | 'chat' | 'voice' | 'selfie';
export const ALLOW: Record<Purpose, Kind[]> = { post: ['image', 'video'], avatar: ['image'], chat: ['image', 'video', 'doc'], voice: ['audio'], selfie: ['image'] };
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
  'application/pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.ms-excel': 'xls', 'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};
const KINDS_BY_EXT: Record<string, Kind[]> = { jpg: ['image'], png: ['image'], webp: ['image'], mp4: ['video', 'audio'], mov: ['video'], webm: ['video', 'audio'], m4a: ['audio'], ogg: ['audio'], mp3: ['audio'], wav: ['audio'], ...Object.fromEntries(DOC_EXT.map((e) => [e, ['doc'] as Kind[]])) };
const family = (e: string) => (e === 'm4a' ? 'mp4' : e); // m4a and mp4 share one container format

const secret = () => { const s = process.env.SESSION_SECRET; if (!s) throw new Error('SESSION_SECRET is not set'); return s; };
const mac = (uid: string, name: string, purpose: string, exp: string) => createHmac('sha256', secret()).update([uid, name, purpose, exp].join('|')).digest('hex');

/** Decide the stored file name from what the browser says it is. Re-verified after upload. */
export function planUpload(purpose: Purpose, mime: string, filename: string | undefined, size: number) {
  const base = mime.split(';')[0].trim().toLowerCase(), nameExt = (filename ?? '').split('.').pop()?.toLowerCase() ?? '';
  const ext = EXT_BY_MIME[base] ?? (DOC_EXT.includes(nameExt) ? nameExt : undefined);
  const kind = ext ? KINDS_BY_EXT[ext]?.find((k) => ALLOW[purpose].includes(k)) : undefined;
  if (!ext || !kind) throw new HttpError('This file type is not allowed.');
  if (size > LIMIT_MB[kind] * 1024 * 1024) throw new HttpError(`That file is too large (${LIMIT_MB[kind]} MB maximum).`);
  return `${randomUUID()}.${ext}`;
}
export function makeTicket(uid: string, name: string, purpose: Purpose) {
  const exp = String(Date.now() + 15 * 60_000);
  return `${exp}.${mac(uid, name, purpose, exp)}`;
}

export async function claimUpload(uid: string, purpose: Purpose, name: string, ticket: string): Promise<{ name: string; kind: Kind }> {
  const [exp, sig] = ticket.split('.');
  const good = NAME_RE.test(name) && !!exp && !!sig && Number(exp) > Date.now() && (() => { const a = Buffer.from(sig), b = Buffer.from(mac(uid, name, purpose, exp)); return a.length === b.length && timingSafeEqual(a, b); })();
  if (!good) throw new HttpError('That upload has expired. Please try again.');
  const info = await inspectObject(name);
  if (!info) throw new HttpError('We could not find your upload. Please try again.');
  const nameExt = name.split('.').pop()!, s = sniff(info.head, nameExt), kind = s?.kinds.find((k) => ALLOW[purpose].includes(k));
  if (!s || !kind || family(s.ext) !== family(nameExt)) { await deleteObject(name); throw new HttpError('This file type is not allowed.'); }
  if (info.size > LIMIT_MB[kind] * 1024 * 1024) { await deleteObject(name); throw new HttpError(`That file is too large (${LIMIT_MB[kind]} MB maximum).`); }
  return { name, kind };
}
