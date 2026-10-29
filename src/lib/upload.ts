export type Purpose = 'post' | 'avatar' | 'chat' | 'voice' | 'selfie';

/**
 * Uploads a file and tells our server about it.
 * Hosted setup: the file goes straight to storage, then a small JSON request finishes the job.
 * Local development: the file is sent to our server as before (field name `field`).
 */
export async function postUpload(url: string, file: File, purpose: Purpose, extra: Record<string, unknown> = {}, field = 'file'): Promise<{ ok: boolean; data: any }> {
  const sr = await fetch('/api/uploads/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose, mime: file.type, size: file.size, filename: file.name }) });
  const sj = await sr.json().catch(() => ({}));
  if (!sr.ok) return { ok: false, data: { error: sj.error ?? 'Could not start the upload.' } };
  let res: Response;
  if (sj.direct) {
    const put = await fetch(sj.url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    if (!put.ok) return { ok: false, data: { error: 'The upload did not finish. Check your connection and try again.' } };
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...extra, name: sj.name, ticket: sj.ticket }) });
  } else {
    const fd = new FormData(); fd.set(field, file);
    for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== null) fd.set(k, String(v));
    res = await fetch(url, { method: 'POST', body: fd });
  }
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}
