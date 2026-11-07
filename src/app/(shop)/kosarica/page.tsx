import type { Metadata } from 'next';
import { CartView } from '@/components/shop/cart-view';

export const metadata: Metadata = { title: 'Košarica' };

export default function CartPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Košarica</h1>
      <CartView />
    </div>
  );
}
