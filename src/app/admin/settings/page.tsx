import { asc, eq } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { SettingsForm, ShippingMethodForm } from '@/components/admin/settings-forms';
import { DeleteShippingMethodButton } from '@/components/admin/delete-buttons';
import { getDb } from '@/db';
import { shippingMethods, storeSettings } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';
import { isModuleReady } from '@/lib/modules';
import { SHIPPING_TYPE_MODULE } from '@/lib/shop/shipping';
import { SHIPPING_TYPE_LABELS } from '@/lib/shop/orders';
import { formatPrice } from '@/lib/utils';

export default async function AdminSettingsPage() {
  await requireAdmin();
  const db = getDb();
  const [[settings], methods] = await Promise.all([
    db.select().from(storeSettings).where(eq(storeSettings.id, 1)),
    db.select().from(shippingMethods).orderBy(asc(shippingMethods.sort_order)),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Postavke</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Trgovina</h2>
        <Card>
          <SettingsForm settings={settings ?? null} />
        </Card>
        <p className="text-xs text-muted-foreground">
          Valuta je EUR. Boje i fontovi mijenjaju se u datoteci src/app/globals.css.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Načini dostave</h2>
        {methods.map((m) => {
          const moduleReady = isModuleReady(SHIPPING_TYPE_MODULE[m.type]);
          return (
            <Card key={m.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {m.name} · {SHIPPING_TYPE_LABELS[m.type]} · {formatPrice(m.price_cents)}
                  {m.free_over_cents !== null && ` · besplatno od ${formatPrice(m.free_over_cents)}`}
                  {m.max_subtotal_cents !== null && ` · do ${formatPrice(m.max_subtotal_cents)}`}
                  {!m.is_active && ' · neaktivno'}
                  {m.is_active && !moduleReady && (
                    <span className="text-destructive"> · ne prikazuje se (modul nije spreman)</span>
                  )}
                </span>
                <DeleteShippingMethodButton id={m.id} />
              </div>
              <details>
                <summary className="cursor-pointer text-sm text-primary">Uredi</summary>
                <div className="pt-4">
                  <ShippingMethodForm method={m} />
                </div>
              </details>
            </Card>
          );
        })}
        <Card>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-primary">+ Novi način dostave</summary>
            <div className="pt-4">
              <ShippingMethodForm />
            </div>
          </details>
        </Card>
      </section>
    </div>
  );
}
