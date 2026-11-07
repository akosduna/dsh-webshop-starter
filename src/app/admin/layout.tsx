import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, FolderTree, LayoutDashboard, Package, Settings, ShoppingCart, Store } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/server';
import { isModuleReady } from '@/lib/modules';

export const metadata: Metadata = { title: 'Administracija', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The proxy only checks that a session cookie exists; this is the real admin check.
  const user = await requireAdmin();

  const nav = [
    { href: '/admin', label: 'Pregled', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Narudžbe', icon: ShoppingCart },
    { href: '/admin/products', label: 'Proizvodi', icon: Package },
    { href: '/admin/categories', label: 'Kategorije', icon: FolderTree },
    ...(isModuleReady('blog') ? [{ href: '/admin/blog', label: 'Blog', icon: FileText }] : []),
    { href: '/admin/settings', label: 'Postavke', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/40 md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b bg-card md:min-h-screen md:border-b-0 md:border-r">
        <div className="flex h-14 items-center px-4 font-semibold">Administracija</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0" aria-label="Admin">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
          <Link
            href="/"
            className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted md:mt-6"
          >
            <Store className="h-4 w-4" /> Natrag u trgovinu
          </Link>
        </nav>
        <p className="hidden truncate px-5 pt-6 text-xs text-muted-foreground md:block">{user.email}</p>
      </aside>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-8">{children}</main>
    </div>
  );
}
