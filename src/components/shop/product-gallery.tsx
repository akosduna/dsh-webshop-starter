'use client';

import { useState } from 'react';
import { ProductImage } from '@/components/ui/product-image';
import { cn } from '@/lib/utils';

export function ProductGallery({
  images,
  name,
}: {
  images: { url: string; alt: string }[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? null;

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        <ProductImage
          src={current?.url ?? null}
          alt={current?.alt ?? name}
          sizes="(min-width: 768px) 50vw, 100vw"
          eager
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-md border bg-muted',
                i === active && 'ring-2 ring-primary',
              )}
              aria-label={`Slika ${i + 1}`}
            >
              <ProductImage src={img.url} alt={img.alt} sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
