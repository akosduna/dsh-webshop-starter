import { NextResponse, type NextRequest } from 'next/server';
import { getBankDetails, renderHub3Barcode } from '@/lib/payments/bank-transfer';
import { bankPaymentDescription } from '@/lib/payments/hub3';
import { loadViewableOrder } from '@/lib/shop/order-viewer';

export const runtime = 'nodejs';

/** HUB-3 PDF417 barcode (PNG) for a bank-transfer order. Owner, admin or access token only. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const order = await loadViewableOrder(id, request.nextUrl.searchParams.get('t'));
  if (!order || order.payment_method !== 'bank_transfer' || !order.payment_reference) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const bank = getBankDetails();
  if (!bank) {
    return NextResponse.json({ error: 'Plaćanje virmanom nije postavljeno.' }, { status: 503 });
  }

  const png = await renderHub3Barcode(bank, {
    amountCents: order.total_cents,
    currency: order.currency,
    reference: order.payment_reference,
    description: bankPaymentDescription(order.order_number),
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
