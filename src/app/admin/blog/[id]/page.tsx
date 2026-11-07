import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { BlogPostForm } from '@/components/admin/blog-post-form';
import { getDb } from '@/db';
import { blogPosts } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/server';
import { isModuleReady } from '@/lib/modules';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  if (!isModuleReady('blog') || !UUID_RE.test(id)) notFound();

  const [post] = await getDb().select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/blog" className="text-sm text-primary hover:underline">
        ← Blog
      </Link>
      <h1 className="text-2xl font-semibold">{post.title}</h1>
      <BlogPostForm post={post} uploadsEnabled={isModuleReady('blob_uploads')} />
    </div>
  );
}
