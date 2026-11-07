import { NextResponse } from 'next/server';
import { isModuleReady } from '@/lib/modules';
import { readTeyaParams } from '@/lib/payments/teya';
import { handleTeyaNotify } from '@/lib/payments/teya-orders';

export const runtime = 'nodejs';

/**
 * Teya server-to-server notification (the payment confirmation that counts).
 * Must always answer 200 with this XML; anything else makes Teya retry for
 * up to 3 days. Invalid signatures are logged and ignored.
 */
const ACCEPT_XML = '<PaymentNotification>Accepted</PaymentNotification>';

function xml() {
  return new NextResponse(ACCEPT_XML, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

export async function POST(request: Request) {
  if (!isModuleReady('teya')) return xml();
  try {
    await handleTeyaNotify(await readTeyaParams(request));
  } catch (error) {
    console.error('[teya/notify] error:', error);
  }
  return xml();
}

// Teya sometimes sends a GET as a health check.
export async function GET() {
  return xml();
}
