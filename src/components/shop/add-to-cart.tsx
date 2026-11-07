'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/card';
import { cn, formatPrice } from '@/lib/utils';
import { useCart } from '@/store/cart';
import type { ProductDetail, ProductVariant } from '@/lib/shop/catalog';

const FALLBACK_OPTION = 'Varijanta';
const LOW_STOCK = 5;

export function AddToCart({ product }: { product: ProductDetail }) {
  const addItem = useCart((s) => s.addItem);

  const hasVariants = product.variants.length > 0;
  // Variants without option names (e.g. created before options were set) fall
  // back to a single "Varijanta" choice using the variant name.
  const optionNames = product.optionNames.length ? product.optionNames : [FALLBACK_OPTION];
  const variants: ProductVariant[] = product.optionNames.length
    ? product.variants
    : product.variants.map((v) => ({ ...v, options: { [FALLBACK_OPTION]: v.name } }));

  const initial = variants.find((v) => v.stockQuantity > 0) ?? variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(initial?.options ?? {});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const match = hasVariants
    ? variants.find((v) => optionNames.every((n) => v.options[n] === selected[n]))
    : undefined;

  const priceCents = hasVariants ? (match?.priceCents ?? initial.priceCents) : product.priceCents;
  const stock = hasVariants ? (match?.stockQuantity ?? 0) : product.stockQuantity;
  const canBuy = stock > 0 && (!hasVariants || !!match);

  function valuesFor(name: string): string[] {
    return [...new Set(variants.map((v) => v.options[name]).filter(Boolean))];
  }

  function isAvailable(name: string, value: string): boolean {
    return variants.some(
      (v) =>
        v.options[name] === value &&
        v.stockQuantity > 0 &&
        optionNames.every((n) => n === name || !selected[n] || v.options[n] === selected[n]),
    );
  }

  function choose(name: string, value: string) {
    setSelected((prev) => ({ ...prev, [name]: value }));
    setQuantity(1);
    setAdded(false);
  }

  function handleAdd() {
    if (!canBuy) return;
    addItem(
      {
        productId: product.id,
        variantId: match?.id ?? null,
        slug: product.slug,
        name: product.name,
        variantName: match?.name ?? null,
        priceCents,
        imageUrl: product.images[0]?.url ?? null,
        maxQuantity: stock,
      },
      quantity,
    );
    setAdded(true);
  }

  return (
    <div className="mt-4 space-y-6">
      <p className="text-2xl font-semibold">{formatPrice(priceCents)}</p>

      {hasVariants &&
        optionNames.map((name) => (
          <fieldset key={name}>
            <legend className="mb-2 text-sm font-medium">
              {name}
              {selected[name] && <span className="text-muted-foreground">: {selected[name]}</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {valuesFor(name).map((value) => {
                const active = selected[name] === value;
                const available = isAvailable(name, value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => choose(name, value)}
                    aria-pressed={active}
                    className={cn(
                      'min-w-12 rounded-md border px-3 py-2 text-sm transition-colors',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                      !available && !active && 'text-muted-foreground line-through',
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

      <div>
        {hasVariants && !match ? (
          <Badge tone="warning">Ova kombinacija nije dostupna</Badge>
        ) : stock <= 0 ? (
          <Badge tone="danger">Nema na zalihi</Badge>
        ) : stock <= LOW_STOCK ? (
          <Badge tone="warning">Još samo {stock} kom.</Badge>
        ) : (
          <Badge tone="success">Na zalihi</Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-md border">
          <button
            type="button"
            className="flex h-11 w-10 items-center justify-center disabled:opacity-40"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={!canBuy || quantity <= 1}
            aria-label="Smanji količinu"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="flex h-11 w-10 items-center justify-center disabled:opacity-40"
            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            disabled={!canBuy || quantity >= stock}
            aria-label="Povećaj količinu"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button size="lg" onClick={handleAdd} disabled={!canBuy} className="flex-1 sm:flex-none">
          Dodaj u košaricu
        </Button>
      </div>

      {added && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-success/10 px-4 py-3 text-sm text-success">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" /> Proizvod je dodan u košaricu.
          </span>
          <Link href="/kosarica" className="font-medium underline">
            Otvori košaricu
          </Link>
        </div>
      )}
    </div>
  );
}
