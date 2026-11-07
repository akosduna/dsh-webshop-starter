import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { getDb } from '@/db';
import { blogPosts } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';
import { isModuleReady } from '@/lib/modules';
import { formatDate } from '@/lib/utils';
import { deleteBlogPost } from './actions';

export default async function AdminBlogPage() {
  await requireAdmin();
  if (!isModuleReady('blog')) notFound();

  const posts = await getDb()
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      status: blogPosts.status,
      published_at: blogPosts.published_at,
      updated_at: blogPosts.updated_at,
    })
    .from(blogPosts)
    .orderBy(desc(blogPosts.updated_at));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Blog</h1>
        <Link href="/admin/blog/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" /> Nova objava
        </Link>
      </div>
      <Card className="p-0">
        <ul className="divide-y">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <Link href={`/admin/blog/${p.id}`} className="font-medium hover:text-primary">
                {p.title}
              </Link>
              <Badge tone={p.status === 'published' ? 'success' : 'neutral'}>
                {p.status === 'published' ? 'Objavljeno' : 'Skica'}
              </Badge>
              <span className="text-muted-foreground">
                {p.published_at ? formatDate(p.published_at) : `uređeno ${formatDate(p.updated_at)}`}
              </span>
              <span className="ml-auto">
                <ConfirmButton size="sm" confirmText="Obrisati objavu?" onConfirm={deleteBlogPost.bind(null, p.id)}>
                  Obriši
                </ConfirmButton>
              </span>
            </li>
          ))}
          {posts.length === 0 && <li className="p-4 text-sm text-muted-foreground">Još nema objava.</li>}
        </ul>
      </Card>
    </div>
  );
}
