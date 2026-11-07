'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Client-only guest cart, persisted in localStorage. Prices here are for
// display only: the server recalculates everything from the database at checkout.

export type CartItem = {
  /** productId or productId:variantId */
  key: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName: string | null;
  priceCents: number;
  imageUrl: string | null;
  maxQuantity: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'key' | 'quantity'>, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

export function cartItemKey(productId: string, variantId: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const key = cartItemKey(item.productId, item.variantId);
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key
                  ? { ...i, ...item, quantity: Math.min(i.quantity + quantity, item.maxQuantity) }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, key, quantity: Math.min(quantity, item.maxQuantity) }],
          };
        }),
      updateQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) =>
                  i.key === key ? { ...i, quantity: Math.min(quantity, i.maxQuantity) } : i,
                ),
        })),
      removeItem: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'shop-cart', version: 1 },
  ),
);

export function cartSubtotalCents(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

const noopSubscribe = () => () => {};

/** False during SSR and the first client render, so persisted cart state never causes hydration mismatches. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
