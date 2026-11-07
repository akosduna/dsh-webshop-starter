'use client';

import { useRef, useState, useTransition } from 'react';
import { Loader2, Star, Trash2 } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormMessage, Input } from '@/components/ui/form';
import { ProductImage } from '@/components/ui/product-image';
import { addProductImages, deleteProductImage, makeMainProductImage } from '@/app/admin/actions';

type Image = { id: string; url: string; alt: string | null };

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif';
const MAX_BYTES = 10 * 1024 * 1024;

function safeFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'slika'
  );
}

/** Product images: uploaded straight from the browser to Vercel Blob (/api/admin/upload issues the token). */
export function ProductImagesManager({
  productId,
  images,
  uploadsEnabled,
}: {
  productId: string;
  images: Image[];
  uploadsEnabled: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function uploadFiles() {
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) {
      setMessage({ type: 'error', text: 'Odaberite barem jednu sliku.' });
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setMessage({ type: 'error', text: `${tooBig.name}: najveća veličina je 10 MB.` });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const uploaded = [];
      for (const file of files) {
        const blob = await upload(`products/${productId}/${safeFileName(file.name)}`, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/upload',
          contentType: file.type,
        });
        uploaded.push({ url: blob.url });
      }
      const result = await addProductImages(productId, uploaded);
      setMessage(result?.error ? { type: 'error', text: result.error } : { type: 'success', text: result?.success ?? 'Spremljeno.' });
      if (fileRef.current) fileRef.current.value = '';
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Učitavanje nije uspjelo.' });
    } finally {
      setUploading(false);
    }
  }

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

      {uploadsEnabled ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="h-auto max-w-sm py-2"
              aria-label="Odaberi slike"
            />
            <Button type="button" variant="outline" disabled={uploading} onClick={uploadFiles}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploading ? 'Učitavanje…' : 'Učitaj slike'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP, AVIF ili GIF, najviše 10 MB po slici.</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Učitavanje slika je isključeno: postavite BLOB_READ_WRITE_TOKEN (Vercel Blob) — vidi INTEGRATIONS.md.
        </p>
      )}
      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
    </Card>
  );
}
