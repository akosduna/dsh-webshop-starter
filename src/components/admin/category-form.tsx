'use client';

import { useActionState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { saveCategory } from '@/app/admin/actions';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export function CategoryForm({
  category,
  parents,
}: {
  category?: Category;
  parents: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(saveCategory, null);
  return (
    <form action={action} className="space-y-6">
      {category && <input type="hidden" name="id" value={category.id} />}
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Naziv" htmlFor="name">
          <Input id="name" name="name" defaultValue={category?.name} required />
        </Field>
        <Field label="URL (slug)" htmlFor="slug" hint="Prazno = izradi iz naziva.">
          <Input id="slug" name="slug" defaultValue={category?.slug} />
        </Field>
        <Field
          label="Nadkategorija"
          htmlFor="parent_id"
          hint="Podržana je jedna razina podkategorija."
        >
          <Select id="parent_id" name="parent_id" defaultValue={category?.parent_id ?? ''}>
            <option value="">— glavna kategorija —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Redoslijed" htmlFor="sort_order">
          <Input id="sort_order" name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} />
        </Field>
        <Field label="Opis" htmlFor="description" className="sm:col-span-2">
          <Textarea id="description" name="description" defaultValue={category?.description ?? ''} />
        </Field>
        <Field
          label="Slika (URL)"
          htmlFor="image_url"
          hint="Npr. javni URL slike iz Supabase Storagea ili /demo/… datoteka."
          className="sm:col-span-2"
        >
          <Input id="image_url" name="image_url" defaultValue={category?.image_url ?? ''} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="is_active" defaultChecked={category?.is_active ?? true} /> Aktivna
        </label>
      </Card>
      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      <SubmitButton pendingText="Spremanje…">Spremi kategoriju</SubmitButton>
    </form>
  );
}
