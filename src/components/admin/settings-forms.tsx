'use client';

import { useActionState } from 'react';
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { saveSettings, saveShippingMethod } from '@/app/admin/actions';
import { SHIPPING_METHOD_TYPES, type ShippingMethodType } from '@/db/enums';
import { SHIPPING_TYPE_LABELS } from '@/lib/shop/orders';
import { centsToInput } from '@/lib/utils';

type Settings = {
  shop_name: string;
  tagline: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
};

type ShippingMethod = {
  id: string;
  name: string;
  description: string | null;
  type: ShippingMethodType;
  price_cents: number;
  free_over_cents: number | null;
  max_subtotal_cents: number | null;
  countries: string[] | null;
  sort_order: number;
  is_active: boolean;
};

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [state, action] = useActionState(saveSettings, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Naziv trgovine" htmlFor="shop_name">
        <Input id="shop_name" name="shop_name" defaultValue={settings?.shop_name ?? ''} required />
      </Field>
      <Field label="Slogan" htmlFor="tagline">
        <Input id="tagline" name="tagline" defaultValue={settings?.tagline ?? ''} />
      </Field>
      <Field label="Kontakt e-mail" htmlFor="contact_email">
        <Input id="contact_email" name="contact_email" type="email" defaultValue={settings?.contact_email ?? ''} />
      </Field>
      <Field label="Kontakt telefon" htmlFor="contact_phone">
        <Input id="contact_phone" name="contact_phone" defaultValue={settings?.contact_phone ?? ''} />
      </Field>
      <Field label="Adresa" htmlFor="address" className="sm:col-span-2">
        <Input id="address" name="address" defaultValue={settings?.address ?? ''} />
      </Field>
      <Field label="Naslov na početnoj" htmlFor="hero_title" className="sm:col-span-2">
        <Input id="hero_title" name="hero_title" defaultValue={settings?.hero_title ?? ''} />
      </Field>
      <Field label="Podnaslov na početnoj" htmlFor="hero_subtitle" className="sm:col-span-2">
        <Textarea id="hero_subtitle" name="hero_subtitle" defaultValue={settings?.hero_subtitle ?? ''} />
      </Field>
      {state?.error && (
        <div className="sm:col-span-2">
          <FormMessage type="error">{state.error}</FormMessage>
        </div>
      )}
      {state?.success && (
        <div className="sm:col-span-2">
          <FormMessage type="success">{state.success}</FormMessage>
        </div>
      )}
      <div>
        <SubmitButton pendingText="Spremanje…">Spremi postavke</SubmitButton>
      </div>
    </form>
  );
}

export function ShippingMethodForm({ method }: { method?: ShippingMethod }) {
  const [state, action] = useActionState(saveShippingMethod, null);
  const idPrefix = method?.id ?? 'new';
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {method && <input type="hidden" name="id" value={method.id} />}
      <Field label="Naziv" htmlFor={`${idPrefix}-name`}>
        <Input id={`${idPrefix}-name`} name="name" defaultValue={method?.name} required />
      </Field>
      <Field
        label="Vrsta"
        htmlFor={`${idPrefix}-type`}
        hint="GLS i BOX NOW prikazuju se kupcu tek kad je modul spreman."
      >
        <Select id={`${idPrefix}-type`} name="type" defaultValue={method?.type ?? 'delivery'}>
          {SHIPPING_METHOD_TYPES.map((t) => (
            <option key={t} value={t}>
              {SHIPPING_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Cijena (€)" htmlFor={`${idPrefix}-price`}>
        <Input
          id={`${idPrefix}-price`}
          name="price"
          inputMode="decimal"
          defaultValue={centsToInput(method?.price_cents ?? 0)}
        />
      </Field>
      <Field label="Besplatno od iznosa (€)" htmlFor={`${idPrefix}-free`} hint="Prazno = nikad besplatno.">
        <Input
          id={`${idPrefix}-free`}
          name="free_over"
          inputMode="decimal"
          defaultValue={centsToInput(method?.free_over_cents)}
        />
      </Field>
      <Field
        label="Najveći iznos narudžbe (€)"
        htmlFor={`${idPrefix}-max`}
        hint="Iznad ovog iznosa način se ne nudi (npr. osiguranje paketomata). Prazno = bez ograničenja."
      >
        <Input
          id={`${idPrefix}-max`}
          name="max_subtotal"
          inputMode="decimal"
          defaultValue={centsToInput(method?.max_subtotal_cents)}
        />
      </Field>
      <Field
        label="Države (kodovi)"
        htmlFor={`${idPrefix}-countries`}
        hint="Za dostavu na adresu, npr. HR, SI. Prazno = sve države s popisa."
      >
        <Input id={`${idPrefix}-countries`} name="countries" defaultValue={method?.countries?.join(', ') ?? ''} />
      </Field>
      <Field label="Opis" htmlFor={`${idPrefix}-desc`} className="sm:col-span-2">
        <Input id={`${idPrefix}-desc`} name="description" defaultValue={method?.description ?? ''} />
      </Field>
      <Field label="Redoslijed" htmlFor={`${idPrefix}-sort`}>
        <Input id={`${idPrefix}-sort`} name="sort_order" type="number" defaultValue={method?.sort_order ?? 0} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <Checkbox name="is_active" defaultChecked={method?.is_active ?? true} /> Aktivno
      </label>
      {state?.error && (
        <div className="sm:col-span-2">
          <FormMessage type="error">{state.error}</FormMessage>
        </div>
      )}
      {state?.success && (
        <div className="sm:col-span-2">
          <FormMessage type="success">{state.success}</FormMessage>
        </div>
      )}
      <div>
        <SubmitButton pendingText="Spremanje…">Spremi</SubmitButton>
      </div>
    </form>
  );
}
