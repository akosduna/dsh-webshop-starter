import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/env';
import { isModuleReady } from '@/lib/modules';
import { readTeyaParams } from '@/lib/payments/teya';
import { handleTeyaSuccessReturn } from '@/lib/payments/teya-orders';

export const runtime = 'nodejs';

/**
 * Browser return after a successful payment. Verifies the order hash and marks
 * the order paid if the notify has not arrived yet (e.g. local dev).
 */
async function handle(request: Request) {
  let target = '/kosarica';
  if (isModuleReady('teya')) {
    try {
      target = await handleTeyaSuccessReturn(await readTeyaParams(request));
    } catch (error) {
      console.error('[teya/success] error:', error);
    }
  }
  // 303 turns Teya's POST into a GET on the shop page.
  return NextResponse.redirect(`${siteUrl()}${target}`, { status: 303 });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
