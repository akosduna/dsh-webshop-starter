'use client';

import { Field, Input, Select } from '@/components/ui/form';
import { COUNTRIES, type AddressInput } from '@/lib/shop/checkout-types';

export function AddressFields({
  prefix,
  value,
  onChange,
  errors = {},
}: {
  prefix: string;
  value: AddressInput;
  onChange: (next: AddressInput) => void;
  errors?: Record<string, string>;
}) {
  const set = (key: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value });
  const err = (key: string) => errors[`${prefix}.${key}`];
  const id = (key: string) => `${prefix}-${key}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Ime i prezime" htmlFor={id('full_name')} className="sm:col-span-2">
        <Input id={id('full_name')} value={value.full_name} onChange={set('full_name')} autoComplete="name" required />
        {err('full_name') && <p className="mt-1 text-xs text-destructive">{err('full_name')}</p>}
      </Field>
      <Field label="Tvrtka (nije obavezno)" htmlFor={id('company')} className="sm:col-span-2">
        <Input id={id('company')} value={value.company} onChange={set('company')} autoComplete="organization" />
      </Field>
      <Field label="Ulica i kućni broj" htmlFor={id('street')} className="sm:col-span-2">
        <Input id={id('street')} value={value.street} onChange={set('street')} autoComplete="street-address" required />
        {err('street') && <p className="mt-1 text-xs text-destructive">{err('street')}</p>}
      </Field>
      <Field label="Poštanski broj" htmlFor={id('postal_code')}>
        <Input id={id('postal_code')} value={value.postal_code} onChange={set('postal_code')} autoComplete="postal-code" required />
        {err('postal_code') && <p className="mt-1 text-xs text-destructive">{err('postal_code')}</p>}
      </Field>
      <Field label="Grad" htmlFor={id('city')}>
        <Input id={id('city')} value={value.city} onChange={set('city')} autoComplete="address-level2" required />
        {err('city') && <p className="mt-1 text-xs text-destructive">{err('city')}</p>}
      </Field>
      <Field label="Država" htmlFor={id('country')}>
        <Select id={id('country')} value={value.country} onChange={set('country')} autoComplete="country">
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Telefon za dostavu" htmlFor={id('phone')}>
        <Input id={id('phone')} value={value.phone} onChange={set('phone')} autoComplete="tel" type="tel" />
      </Field>
    </div>
  );
}
