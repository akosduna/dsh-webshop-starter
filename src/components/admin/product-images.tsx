'use client';

import { useActionState, useTransition } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormMessage, Input } from '@/components/ui/form';
import { ProductImage } from '@/components/ui/product-image';
import { SubmitButton } from '@/components/ui/submit-button';
import { deleteProductImage, makeMainProductImage, uploadProductImages } from '@/app/admin/actions';

type Image = { id: string; url: string; alt: string | null };

export function ProductImagesManager({ productId, images }: { productId: string; images: Image[] }) {
  const [state, action] = useActionState(uploadProductImages, null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Slike</h2>
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((img, index) => (
            <div key={img.id} className="space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                <ProductImage src={img.url} alt={img.alt ?? ''} sizes="160px" />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                    Glavna
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={pending || index === 0}
                  aria-label="Postavi kao glavnu"
                  onClick={() => startTransition(() => makeMainProductImage(img.id))}
                >
                  <Star className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  aria-label="Obriši sliku"
                  onClick={() => startTransition(() => deleteProductImage(img.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Proizvod još nema slika.</p>
      )}
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="product_id" value={productId} />
        <Input
          type="file"
          name="files"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="h-auto max-w-sm py-2"
          aria-label="Odaberi slike"
        />
        <SubmitButton variant="outline" pendingText="Učitavanje…">
          Učitaj slike
        </SubmitButton>
      </form>
      <p className="text-xs text-muted-foreground">JPG, PNG, WebP, AVIF ili GIF, najviše 5 MB po slici.</p>
      {state?.error && <FormMessage type="error">{state.error}</FormMessage>}
      {state?.success && <FormMessage type="success">{state.success}</FormMessage>}
    </Card>
  );
}
