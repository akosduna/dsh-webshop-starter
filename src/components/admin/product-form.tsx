'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { saveProduct } from '@/app/admin/actions';
import { centsToInput } from '@/lib/utils';

type CategoryOption = { id: string; name: string; parent_id: string | null };

type ProductData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  sku: string | null;
  stock_quantity: number;
  category_id: string | null;
  option_names: string[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  variants: {
    id: string;
    options: Record<string, string>;
    sku: string | null;
    price_cents: number | null;
    stock_quantity: number;
    is_active: boolean;
  }[];
};

type VariantRow = {
  key: string;
  id?: string;
  options: Record<string, string>;
  sku: string;
  price: string;
  stock: string;
  is_active: boolean;
};

let rowCounter = 0;
const newKey = () => `row-${++rowCounter}`;

function parseOptionNames(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProductForm({
  categories,
  product,
}: {
  categories: CategoryOption[];
  product?: ProductData;
}) {
  const [state, action] = useActionState(saveProduct, null);
  const [optionNamesText, setOptionNamesText] = useState(product?.option_names.join(', ') ?? '');
  const [rows, setRows] = useState<VariantRow[]>(
    () =>
      product?.variants.map((v) => ({
        key: newKey(),
        id: v.id,
        options: v.options,
        sku: v.sku ?? '',
        price: centsToInput(v.price_cents),
        stock: String(v.stock_quantity),
        is_active: v.is_active,
      })) ?? [],
  );

  const optionNames = parseOptionNames(optionNamesText);
  const hasVariants = rows.length > 0;
  const topLevel = categories.filter((c) => !c.parent_id);

  const updateRow = (key: string, patch: Partial<VariantRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const serializedVariants = JSON.stringify(
    rows.map(({ id, options, sku, price, stock, is_active }) => ({ id, options, sku, price, stock, is_active })),
  );

  return (
    <form action={action} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="variants" value={serializedVariants} />

      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Naziv" htmlFor="name" className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={product?.name} required />
        </Field>
        <Field label="URL (slug)" htmlFor="slug" hint="Prazno = izradi iz naziva.">
          <Input id="slug" name="slug" defaultValue={product?.slug} />
        </Field>
        <Field label="Kategorija" htmlFor="category_id">
          <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ''}>
            <option value="">— bez kategorije —</option>
            {topLevel.map((parent) => (
              <optgroup key={parent.id} label={parent.name}>
                <option value={parent.id}>{parent.name}</option>
                {categories
                  .filter((c) => c.parent_id === parent.id)
                  .map((child) => (
                    <option key={child.id} value={child.id}>
                      {parent.name} › {child.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Opis" htmlFor="description" className="sm:col-span-2">
          <Textarea id="description" name="description" rows={6} defaultValue={product?.description ?? ''} />
        </Field>
        <Field label="Cijena (€)" htmlFor="price" hint="Npr. 19,90">
          <Input id="price" name="price" inputMode="decimal" defaultValue={centsToInput(product?.price_cents)} required />
        </Field>
        <Field label="Šifra (SKU)" htmlFor="sku">
          <Input id="sku" name="sku" defaultValue={product?.sku ?? ''} />
        </Field>
        <Field
          label="Zaliha (kom)"
          htmlFor="stock_quantity"
          hint={hasVariants ? 'Proizvod ima varijante — zaliha se vodi po varijanti.' : undefined}
        >
          <Input
            id="stock_quantity"
            name="stock_quantity"
            type="number"
            min={0}
            defaultValue={product?.stock_quantity ?? 0}
            disabled={hasVariants}
          />
        </Field>
        <Field label="Redoslijed" htmlFor="sort_order" hint="Manji broj = prikazuje se ranije.">
          <Input id="sort_order" name="sort_order" type="number" defaultValue={product?.sort_order ?? 0} />
        </Field>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="is_active" defaultChecked={product?.is_active ?? true} /> Aktivan (vidljiv u trgovini)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="is_featured" defaultChecked={product?.is_featured ?? false} /> Izdvojen na početnoj
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold">Varijante (npr. veličina, boja)</h2>
          <p className="text-sm text-muted-foreground">
            Ostavite prazno za proizvod bez varijanti. Prazna cijena varijante = osnovna cijena.
          </p>
        </div>
        <Field label="Nazivi opcija" htmlFor="option_names" hint="Odvojite zarezom, npr. Veličina, Boja">
          <Input
            id="option_names"
            name="option_names"
            value={optionNamesText}
            onChange={(e) => setOptionNamesText(e.target.value)}
          />
        </Field>

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  {optionNames.map((n) => (
                    <th key={n} className="p-2 font-medium">
                      {n}
                    </th>
                  ))}
                  <th className="p-2 font-medium">SKU</th>
                  <th className="p-2 font-medium">Cijena (€)</th>
                  <th className="p-2 font-medium">Zaliha</th>
                  <th className="p-2 font-medium">Aktivna</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    {optionNames.map((n) => (
                      <td key={n} className="p-1">
                        <Input
                          aria-label={n}
                          value={row.options[n] ?? ''}
                          onChange={(e) => updateRow(row.key, { options: { ...row.options, [n]: e.target.value } })}
                          className="min-w-20"
                        />
                      </td>
                    ))}
                    <td className="p-1">
                      <Input aria-label="SKU" value={row.sku} onChange={(e) => updateRow(row.key, { sku: e.target.value })} className="min-w-24" />
                    </td>
                    <td className="p-1">
                      <Input
                        aria-label="Cijena"
                        inputMode="decimal"
                        value={row.price}
                        placeholder="osnovna"
                        onChange={(e) => updateRow(row.key, { price: e.target.value })}
                        className="w-24"
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        aria-label="Zaliha"
                        type="number"
                        min={0}
                        value={row.stock}
                        onChange={(e) => updateRow(row.key, { stock: e.target.value })}
                        className="w-20"
                      />
                    </td>
                    <td className="p-1 text-center">
                      <Checkbox
                        aria-label="Aktivna"
                        checked={row.is_active}
                        onChange={(e) => updateRow(row.key, { is_active: e.target.checked })}
                      />
                    </td>
                    <td className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Ukloni varijantu"
                        onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={optionNames.length === 0}
          onClick={() =>
            setRows((prev) => [...prev, { key: newKey(), options: {}, sku: '', price: '', stock: '0', is_active: true }])
          }
        >
          <Plus className="h-4 w-4" /> Dodaj varijantu
        </Button>
      </Card>

      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      {state?.success && <FormMessage type="success">{state.success}</FormMessage>}
      <SubmitButton size="lg" pendingText="Spremanje…">
        Spremi proizvod
      </SubmitButton>
    </form>
  );
}
