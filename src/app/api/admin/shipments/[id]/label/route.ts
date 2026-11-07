import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders, shipments } from '@/db/schema';
import { assertAdmin } from '@/lib/auth/server';
import { reprintGlsLabel } from '@/lib/shipping/shipments';

export const runtime = 'nodejs';

/** Shipping label PDF. Admin only — labels contain customer addresses. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: 'Nemate pristup.' }, { status: 403 });
  }

  const { id } = await context.params;
  const [shipment] = await getDb()
    .select({
      id: shipments.id,
      provider: shipments.provider,
      label_pdf: shipments.label_pdf,
      order_number: orders.order_number,
    })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.order_id))
    .where(eq(shipments.id, id));
  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let pdf = shipment.label_pdf;
  if (!pdf && shipment.provider === 'gls') {
    try {
      pdf = await reprintGlsLabel(shipment.id);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'PDF nije dostupan.' },
        { status: 502 },
      );
    }
  }
  if (!pdf) return NextResponse.json({ error: 'Naljepnica još nije generirana.' }, { status: 404 });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="naljepnica-${shipment.order_number}-${shipment.provider}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
