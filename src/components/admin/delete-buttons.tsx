'use client';

import { ConfirmButton } from '@/components/ui/confirm-button';
import { deleteCategory, deleteProduct, deleteShippingMethod } from '@/app/admin/actions';

export function DeleteProductButton({ productId }: { productId: string }) {
  return (
    <ConfirmButton size="sm" confirmText="Obrisati proizvod?" onConfirm={() => deleteProduct(productId)}>
      Obriši proizvod
    </ConfirmButton>
  );
}

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  return (
    <ConfirmButton size="sm" confirmText="Obrisati kategoriju?" onConfirm={() => deleteCategory(categoryId)}>
      Obriši
    </ConfirmButton>
  );
}

export function DeleteShippingMethodButton({ id }: { id: string }) {
  return (
    <ConfirmButton size="sm" confirmText="Obrisati?" onConfirm={() => deleteShippingMethod(id)}>
      Obriši
    </ConfirmButton>
  );
}
