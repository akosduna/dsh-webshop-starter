import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/env';
import { isModuleReady } from '@/lib/modules';
import { readTeyaParams } from '@/lib/payments/teya';
import { handleTeyaFailureReturn } from '@/lib/payments/teya-orders';

export const runtime = 'nodejs';

/**
 * Browser return after the buyer cancelled / the payment failed. Unsigned, so
 * it only acts on an order found by our UUID and never touches a paid order.
 */
async function handle(request: Request) {
  let target = '/kosarica';
  if (isModuleReady('teya')) {
    try {
      target = await handleTeyaFailureReturn(await readTeyaParams(request), 'error');
    } catch (error) {
      console.error('[teya/error] error:', error);
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
