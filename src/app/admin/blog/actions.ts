'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/db';
import { blogPosts } from '@/db/schema';
import { isUniqueViolation } from '@/db/utils';
import { requireAdmin } from '@/lib/auth/server';
import { deleteBlobs, isAllowedImageUrl } from '@/lib/blob';
import { htmlToText, sanitizeBlogHtml } from '@/lib/blog/sanitize';
import { slugify } from '@/lib/utils';

export type BlogPostInput = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  status: 'draft' | 'published';
  metaTitle: string;
  metaDescription: string;
};

export type BlogSaveResult = { ok: true; id: string; slug: string } | { ok: false; error: string };

function refreshBlog(slug?: string) {
  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/sitemap.xml');
}

export async function saveBlogPost(input: BlogPostInput): Promise<BlogSaveResult> {
  await requireAdmin();

  const title = input.title.trim().slice(0, 200);
  const slug = slugify(input.slug.trim() || title);
  if (!title) return { ok: false, error: 'Upišite naslov.' };
  if (!slug) return { ok: false, error: 'URL (slug) nije ispravan.' };
  const status: 'draft' | 'published' = input.status === 'published' ? 'published' : 'draft';

  const coverImageUrl = input.coverImageUrl.trim();
  if (coverImageUrl && !isAllowedImageUrl(coverImageUrl)) {
    return { ok: false, error: 'Naslovna slika mora biti učitana slika ili putanja na stranici (/…).' };
  }

  const content = sanitizeBlogHtml(input.content.slice(0, 200_000));
  const excerpt = input.excerpt.trim().slice(0, 500) || htmlToText(content).slice(0, 220) || null;

  const db = getDb();
  const [existing] = input.id
    ? await db
        .select({ published_at: blogPosts.published_at, slug: blogPosts.slug, cover: blogPosts.cover_image_url })
        .from(blogPosts)
        .where(eq(blogPosts.id, input.id))
    : [];
  if (input.id && !existing) return { ok: false, error: 'Objava ne postoji.' };

  const values = {
    title,
    slug,
    excerpt,
    content,
    cover_image_url: coverImageUrl || null,
    status,
    meta_title: input.metaTitle.trim().slice(0, 200) || null,
    meta_description: input.metaDescription.trim().slice(0, 300) || null,
    // First publish sets the date; later edits keep it.
    published_at: status === 'published' ? (existing?.published_at ?? new Date()) : (existing?.published_at ?? null),
  };

  let id = input.id;
  try {
    if (input.id) {
      await db.update(blogPosts).set(values).where(eq(blogPosts.id, input.id));
    } else {
      const [created] = await db.insert(blogPosts).values(values).returning({ id: blogPosts.id });
      id = created.id;
    }
  } catch (error) {
    if (isUniqueViolation(error, 'slug')) return { ok: false, error: 'Taj URL (slug) već postoji. Odaberite drugi.' };
    console.error('[blog] save', error);
    return { ok: false, error: 'Spremanje nije uspjelo.' };
  }

  if (existing?.cover && existing.cover !== values.cover_image_url) await deleteBlobs([existing.cover]);
  refreshBlog(slug);
  if (existing && existing.slug !== slug) refreshBlog(existing.slug);
  return { ok: true, id: id!, slug };
}

export async function deleteBlogPost(id: string) {
  await requireAdmin();
  const [deleted] = await getDb()
    .delete(blogPosts)
    .where(eq(blogPosts.id, id))
    .returning({ slug: blogPosts.slug, cover: blogPosts.cover_image_url });
  if (deleted) {
    await deleteBlobs([deleted.cover]);
    refreshBlog(deleted.slug);
  }
}
