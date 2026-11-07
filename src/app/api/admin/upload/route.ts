import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/auth/server';
import { isModuleReady } from '@/lib/modules';

export const runtime = 'nodejs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024;

/**
 * Vercel Blob client upload: the browser asks this route for a short-lived
 * upload token and sends the file straight to Blob (no 4.5 MB function body
 * limit). Only admins get a token. The URL is saved afterwards by an admin
 * server action (product images, blog covers, blog inline images).
 */
export async function POST(request: Request) {
  if (!isModuleReady('blob_uploads')) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN nije postavljen.' }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Only the token request comes from the browser; check the admin session here.
        await assertAdmin();
        if (!/^(products|blog)\//.test(pathname)) {
          throw new Error('Neispravna putanja.');
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
        };
      },
      // Called by Vercel after the upload (not on localhost); nothing to do,
      // the admin action stores the URL.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload nije uspio.';
    return NextResponse.json({ error: message }, { status: message === 'Nemate pristup.' ? 403 : 400 });
  }
}
