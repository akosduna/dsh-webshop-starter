'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, FormMessage, Input, Select, Textarea } from '@/components/ui/form';
import { ProductImage } from '@/components/ui/product-image';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { saveBlogPost, type BlogPostInput } from '@/app/admin/blog/actions';

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  status: 'draft' | 'published';
  meta_title: string | null;
  meta_description: string | null;
};

export function BlogPostForm({ post, uploadsEnabled }: { post?: Post; uploadsEnabled: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<BlogPostInput>({
    id: post?.id,
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    excerpt: post?.excerpt ?? '',
    content: post?.content ?? '',
    coverImageUrl: post?.cover_image_url ?? '',
    status: post?.status ?? 'draft',
    metaTitle: post?.meta_title ?? '',
    metaDescription: post?.meta_description ?? '',
  });
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function uploadCover(file: File) {
    setCoverUploading(true);
    setMessage(null);
    try {
      const blob = await upload(`blog/covers/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]+/g, '-')}`, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
        contentType: file.type,
      });
      set('coverImageUrl', blob.url);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Učitavanje nije uspjelo.' });
    } finally {
      setCoverUploading(false);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveBlogPost(values);
      if (!result.ok) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      setValues((v) => ({ ...v, id: result.id, slug: result.slug }));
      setMessage({ type: 'success', text: values.status === 'published' ? 'Objava je spremljena i objavljena.' : 'Skica je spremljena.' });
      if (!post) router.replace(`/admin/blog/${result.id}`);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <Field label="Naslov" htmlFor="title">
          <Input id="title" value={values.title} onChange={(e) => set('title', e.target.value)} required />
        </Field>
        <Field label="Sažetak" htmlFor="excerpt" hint="Prikazuje se na popisu objava. Prazno = početak teksta.">
          <Textarea id="excerpt" value={values.excerpt} onChange={(e) => set('excerpt', e.target.value)} maxLength={500} />
        </Field>
        <div>
          <p className="mb-1 text-sm font-medium">Sadržaj</p>
          <RichTextEditor
            content={values.content}
            onChange={(html) => set('content', html)}
            uploadsEnabled={uploadsEnabled}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Card className="space-y-4">
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              value={values.status}
              onChange={(e) => set('status', e.target.value === 'published' ? 'published' : 'draft')}
            >
              <option value="draft">Skica</option>
              <option value="published">Objavljeno</option>
            </Select>
          </Field>
          {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
          <Button type="submit" className="w-full" disabled={pending || coverUploading}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Spremi
          </Button>
          {post && values.status === 'published' && (
            <Link href={`/blog/${values.slug}`} target="_blank" className="block text-center text-sm text-primary hover:underline">
              Pogledaj objavu
            </Link>
          )}
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-medium">Naslovna slika</p>
          {values.coverImageUrl ? (
            <div className="space-y-2">
              <div className="relative aspect-[16/9] overflow-hidden rounded-md border bg-muted">
                <ProductImage src={values.coverImageUrl} alt="" sizes="300px" />
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => set('coverImageUrl', '')}>
                <Trash2 className="h-4 w-4" /> Ukloni
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nema slike.</p>
          )}
          {uploadsEnabled ? (
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="h-auto py-2"
              aria-label="Učitaj naslovnu sliku"
              disabled={coverUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadCover(file);
              }}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Učitavanje je isključeno (nema BLOB_READ_WRITE_TOKEN).</p>
          )}
          {coverUploading && <p className="text-xs text-muted-foreground">Učitavanje…</p>}
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-medium">SEO</p>
          <Field label="URL (slug)" htmlFor="slug" hint="Prazno = iz naslova.">
            <Input id="slug" value={values.slug} onChange={(e) => set('slug', e.target.value)} />
          </Field>
          <Field label="Meta naslov" htmlFor="meta_title" hint="Prazno = naslov objave.">
            <Input id="meta_title" value={values.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} maxLength={200} />
          </Field>
          <Field label="Meta opis" htmlFor="meta_description" hint="Do ~160 znakova.">
            <Textarea
              id="meta_description"
              value={values.metaDescription}
              onChange={(e) => set('metaDescription', e.target.value)}
              maxLength={300}
            />
          </Field>
        </Card>
      </div>
    </form>
  );
}
