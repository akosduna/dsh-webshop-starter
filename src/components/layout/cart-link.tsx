'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { cartCount, useCart, useHydrated } from '@/store/cart';

export function CartLink() {
  const items = useCart((s) => s.items);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(items) : 0;

  return (
    <Link
      href="/kosarica"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
      aria-label={`Košarica (${count})`}
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
