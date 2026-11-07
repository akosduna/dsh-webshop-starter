import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function shouldSkipOptimization(src: string): boolean {
  // SVG placeholders and local URLs can't go through the Next.js image
  // optimizer; everything else (Vercel Blob) is optimized.
  return (
    src.endsWith('.svg') || src.startsWith('http://127.0.0.1') || src.startsWith('http://localhost')
  );
}

export function ProductImage({
  src,
  alt,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
  eager = false,
  className,
}: {
  src: string | null;
  alt: string;
  sizes?: string;
  /** Above-the-fold image (main product photo, first cards). */
  eager?: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center bg-muted', className)}>
        <ImageIcon className="h-10 w-10 text-muted-foreground" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      unoptimized={shouldSkipOptimization(src)}
      className={cn('object-cover', className)}
    />
  );
}
