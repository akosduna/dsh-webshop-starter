import 'server-only';

import { del } from '@vercel/blob';
import { isModuleReady } from '@/lib/modules';

const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

/** True for a public Vercel Blob URL (https, *.public.blob.vercel-storage.com). */
export function isBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/** Accepts uploaded Blob URLs and site-relative paths (/demo/…); rejects anything else. */
export function isAllowedImageUrl(value: string): boolean {
  return isBlobUrl(value) || (value.startsWith('/') && !value.startsWith('//'));
}

/** Deletes Blob files; never throws (a leftover file is not worth failing the admin action). */
export async function deleteBlobs(urls: (string | null | undefined)[]): Promise<void> {
  const targets = urls.filter((u): u is string => !!u && isBlobUrl(u));
  if (targets.length === 0 || !isModuleReady('blob_uploads')) return;
  try {
    await del(targets);
  } catch (error) {
    console.error('[blob] delete failed', error instanceof Error ? error.message : error);
  }
}
