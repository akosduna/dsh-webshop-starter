import { Card } from '@/components/ui/card';
import { SettingsForm, ShippingMethodForm } from '@/components/admin/settings-forms';
import { DeleteShippingMethodButton } from '@/components/admin/delete-buttons';
import { requireAdmin } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: settings }, { data: methods }] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('shipping_methods').select('*').order('sort_order'),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Postavke</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Trgovina</h2>
        <Card>
          <SettingsForm settings={settings} />
        </Card>
        <p className="text-xs text-muted-foreground">
          Valuta je EUR. Boje i fontovi mijenjaju se u datoteci src/app/globals.css.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Načini dostave</h2>
        {(methods ?? []).map((m) => (
          <Card key={m.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                {m.name} · {m.type === 'pickup' ? 'osobno preuzimanje' : 'dostava'} · {formatPrice(m.price_cents)}
                {m.free_over_cents !== null && ` · besplatno od ${formatPrice(m.free_over_cents)}`}
                {!m.is_active && ' · neaktivno'}
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
        ))}
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
