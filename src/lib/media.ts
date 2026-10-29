import { randomUUID } from 'crypto';
import { deleteObject, putObject } from './storage';
import { HttpError } from './http';

export type Kind = 'image' | 'video' | 'audio' | 'doc';
export const MIME: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  m4a: 'audio/mp4', ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export const DOC_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
export const NAME_RE = new RegExp(`^[a-f0-9-]{36}\\.(${Object.keys(MIME).join('|')})$`);
export const LIMIT_MB: Record<Kind, number> = { image: 8, video: 50, audio: 10, doc: 20 };

/** Identify the file from its real bytes, never from the extension the client claims. Office files must also carry a matching extension. */
export function sniff(b: Buffer, ext: string): { ext: string; kinds: Kind[] } | null {
  const h4 = b.subarray(0, 4).toString('hex'), s4 = b.subarray(0, 4).toString('latin1');
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', kinds: ['image'] };
  if (h4 === '89504e47') return { ext: 'png', kinds: ['image'] };
  if (s4 === 'RIFF') { const t = b.subarray(8, 12).toString('latin1'); if (t === 'WEBP') return { ext: 'webp', kinds: ['image'] }; if (t === 'WAVE') return { ext: 'wav', kinds: ['audio'] }; }
  if (b.subarray(4, 8).toString('latin1') === 'ftyp') {
    const br = b.subarray(8, 12).toString('latin1');
    if (br.startsWith('qt')) return { ext: 'mov', kinds: ['video'] };
    if (br.startsWith('M4A') || br.startsWith('M4B')) return { ext: 'm4a', kinds: ['audio'] };
    return { ext: 'mp4', kinds: ['video', 'audio'] };
  }
  if (h4 === '1a45dfa3') return { ext: 'webm', kinds: ['video', 'audio'] };
  if (s4 === 'OggS') return { ext: 'ogg', kinds: ['audio'] };
  if (s4.startsWith('ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { ext: 'mp3', kinds: ['audio'] };
  if (s4 === '%PDF') return { ext: 'pdf', kinds: ['doc'] };
  if (h4 === '504b0304' && ['docx', 'xlsx', 'pptx'].includes(ext)) return { ext, kinds: ['doc'] };
  if (h4 === 'd0cf11e0' && ['doc', 'xls', 'ppt'].includes(ext)) return { ext, kinds: ['doc'] };
  return null;
}

export async function saveUpload(file: File, allow: Kind[]) {
  if (file.size > 50 * 1024 * 1024) throw new HttpError('File is too large (50 MB maximum).');
  const buf = Buffer.from(await file.arrayBuffer());
  const s = sniff(buf, (file.name.split('.').pop() ?? '').toLowerCase());
  const kind = s?.kinds.find((k) => allow.includes(k));
  if (!s || !kind) throw new HttpError('This file type is not allowed.');
  if (file.size > LIMIT_MB[kind] * 1024 * 1024) throw new HttpError(`${kind === 'doc' ? 'Documents' : kind === 'audio' ? 'Voice notes' : kind === 'image' ? 'Photos' : 'Videos'} can be ${LIMIT_MB[kind]} MB at most.`);
  const name = `${randomUUID()}.${s.ext}`;
  await putObject(name, buf, MIME[s.ext]);
  return { name, kind };
}
export const removeFile = (name?: string | null) => (name && NAME_RE.test(name) ? deleteObject(name) : Promise.resolve());
