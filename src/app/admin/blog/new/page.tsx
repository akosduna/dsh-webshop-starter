import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogPostForm } from '@/components/admin/blog-post-form';
import { requireAdmin } from '@/lib/auth/server';
import { isModuleReady } from '@/lib/modules';

export default async function NewBlogPostPage() {
  await requireAdmin();
  if (!isModuleReady('blog')) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/blog" className="text-sm text-primary hover:underline">
        ← Blog
      </Link>
      <h1 className="text-2xl font-semibold">Nova objava</h1>
      <BlogPostForm uploadsEnabled={isModuleReady('blob_uploads')} />
    </div>
  );
}
