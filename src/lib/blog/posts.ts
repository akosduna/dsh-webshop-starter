import 'server-only';

import { and, desc, eq, isNotNull, lte } from 'drizzle-orm';
import { getDb } from '@/db';
import { blogPosts, type BlogPost } from '@/db/schema';
import { safeQuery } from '@/db/utils';

const isPublished = () =>
  and(eq(blogPosts.status, 'published'), isNotNull(blogPosts.published_at), lte(blogPosts.published_at, new Date()));

export type BlogPostSummary = Pick<
  BlogPost,
  'id' | 'title' | 'slug' | 'excerpt' | 'cover_image_url' | 'published_at' | 'updated_at'
>;

export async function getPublishedPosts(limit = 50): Promise<BlogPostSummary[]> {
  return safeQuery(
    'blog posts',
    () =>
      getDb()
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          cover_image_url: blogPosts.cover_image_url,
          published_at: blogPosts.published_at,
          updated_at: blogPosts.updated_at,
        })
        .from(blogPosts)
        .where(isPublished())
        .orderBy(desc(blogPosts.published_at))
        .limit(limit),
    [],
  );
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  return safeQuery(
    'blog post',
    async () => {
      const [post] = await getDb()
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.slug, slug), isPublished()))
        .limit(1);
      return post ?? null;
    },
    null,
  );
}
