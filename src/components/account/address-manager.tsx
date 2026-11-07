'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Field, FormMessage, Input, Select } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { COUNTRIES } from '@/lib/shop/checkout-types';
import { deleteAddress, saveAddress, setDefaultAddress } from '@/app/(shop)/moj-racun/actions';

type Address = {
  id: string;
  full_name: string;
  company: string | null;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
};

function AddressForm({ address, onDone }: { address?: Address; onDone: () => void }) {
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof saveAddress>>, formData: FormData) => {
    const result = await saveAddress(prev, formData);
    if (result?.success) onDone();
    return result;
  }, null);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {address && <input type="hidden" name="id" value={address.id} />}
      <Field label="Ime i prezime" htmlFor="a-name" className="sm:col-span-2">
        <Input id="a-name" name="full_name" defaultValue={address?.full_name} required />
      </Field>
      <Field label="Tvrtka (nije obavezno)" htmlFor="a-company" className="sm:col-span-2">
        <Input id="a-company" name="company" defaultValue={address?.company ?? ''} />
      </Field>
      <Field label="Ulica i kućni broj" htmlFor="a-street" className="sm:col-span-2">
        <Input id="a-street" name="street" defaultValue={address?.street} required />
      </Field>
      <Field label="Poštanski broj" htmlFor="a-zip">
        <Input id="a-zip" name="postal_code" defaultValue={address?.postal_code} required />
      </Field>
      <Field label="Grad" htmlFor="a-city">
        <Input id="a-city" name="city" defaultValue={address?.city} required />
      </Field>
      <Field label="Država" htmlFor="a-country">
        <Select id="a-country" name="country" defaultValue={address?.country ?? 'HR'}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Telefon" htmlFor="a-phone">
        <Input id="a-phone" name="phone" defaultValue={address?.phone ?? ''} />
      </Field>
      {state?.error && (
        <div className="sm:col-span-2">
          <FormMessage type="error">{state.error}</FormMessage>
        </div>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton pendingText="Spremanje…">Spremi adresu</SubmitButton>
        <Button type="button" variant="ghost" onClick={onDone}>
          Odustani
        </Button>
      </div>
    </form>
  );
}

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  return (
    <div className="space-y-4">
      {addresses.length === 0 && editing !== 'new' && (
        <Card className="text-muted-foreground">Nemate spremljenih adresa.</Card>
      )}
      {addresses.map((a) => (
        <Card key={a.id}>
          {editing === a.id ? (
            <AddressForm address={a} onDone={() => setEditing(null)} />
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="text-sm">
                <p className="font-medium">
                  {a.full_name} {a.is_default && <Badge tone="primary">Zadana</Badge>}
                </p>
                <p className="text-muted-foreground">
                  {a.company && <>{a.company}, </>}
                  {a.street}, {a.postal_code} {a.city}, {a.country}
                  {a.phone && <> · {a.phone}</>}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!a.is_default && (
                  <Button size="sm" variant="ghost" onClick={() => setDefaultAddress(a.id)}>
                    Postavi kao zadanu
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(a.id)}>
                  Uredi
                </Button>
                <ConfirmButton size="sm" onConfirm={() => deleteAddress(a.id)}>
                  Obriši
                </ConfirmButton>
              </div>
            </div>
          )}
        </Card>
      ))}
      {editing === 'new' ? (
        <Card>
          <AddressForm onDone={() => setEditing(null)} />
        </Card>
      ) : (
        <Button onClick={() => setEditing('new')}>Dodaj adresu</Button>
      )}
    </div>
  );
}
