'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProductImage } from '@/components/ui/product-image';
import { formatPrice } from '@/lib/utils';
import { cartSubtotalCents, useCart, useHydrated } from '@/store/cart';

export function CartView() {
  const hydrated = useHydrated();
  const { items, updateQuantity, removeItem } = useCart();

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" aria-busy />;
  }

  if (items.length === 0) {
    return (
      <Card className="py-12 text-center">
        <p className="text-muted-foreground">Košarica je prazna.</p>
        <Link href="/proizvodi" className={buttonVariants({ className: 'mt-6' })}>
          Nastavi kupovinu
        </Link>
      </Card>
    );
  }

  const subtotal = cartSubtotalCents(items);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((item) => (
          <li key={item.key} className="flex gap-4 p-4">
            <Link
              href={`/proizvodi/${item.slug}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-muted"
            >
              <ProductImage src={item.imageUrl} alt={item.name} sizes="96px" />
            </Link>
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <div>
                  <Link href={`/proizvodi/${item.slug}`} className="font-medium hover:text-primary">
                    {item.name}
                  </Link>
                  {item.variantName && (
                    <p className="text-sm text-muted-foreground">{item.variantName}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.priceCents)}</p>
                </div>
                <p className="font-medium">{formatPrice(item.priceCents * item.quantity)}</p>
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="flex items-center rounded-md border">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center"
                    onClick={() => updateQuantity(item.key, item.quantity - 1)}
                    aria-label="Smanji količinu"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center disabled:opacity-40"
                    onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    disabled={item.quantity >= item.maxQuantity}
                    aria-label="Povećaj količinu"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Ukloni
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Card className="h-fit space-y-4">
        <div className="flex justify-between">
          <span>Međuzbroj</span>
          <span className="font-semibold">{formatPrice(subtotal)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Način dostave odabire se i obračunava u sljedećem koraku.
        </p>
        <Link href="/naplata" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          Na blagajnu
        </Link>
        <Link href="/proizvodi" className="block text-center text-sm text-primary hover:underline">
          Nastavi kupovinu
        </Link>
      </Card>
    </div>
  );
}
