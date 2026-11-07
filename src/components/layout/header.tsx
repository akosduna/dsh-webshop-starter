import Link from 'next/link';
import { Search, User } from 'lucide-react';
import { CartLink } from '@/components/layout/cart-link';
import { MobileMenu } from '@/components/layout/mobile-menu';
import type { CategoryWithChildren } from '@/lib/shop/catalog';

export function Header({
  shopName,
  categories,
  showBlog = false,
}: {
  shopName: string;
  categories: CategoryWithChildren[];
  showBlog?: boolean;
}) {
  const links = [
    ...categories.map((c) => ({ href: `/kategorije/${c.slug}`, label: c.name })),
    ...(showBlog ? [{ href: '/blog', label: 'Blog' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <MobileMenu links={[{ href: '/proizvodi', label: 'Svi proizvodi' }, ...links]} />
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {shopName}
        </Link>
        <nav className="ml-6 hidden items-center gap-5 text-sm md:flex" aria-label="Glavna navigacija">
          <Link href="/proizvodi" className="text-muted-foreground hover:text-foreground">
            Svi proizvodi
          </Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <form action="/proizvodi" className="hidden items-center sm:flex" role="search">
            <label htmlFor="header-search" className="sr-only">
              Pretraži proizvode
            </label>
            <input
              id="header-search"
              name="q"
              placeholder="Pretraži…"
              className="h-9 w-40 rounded-md border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring lg:w-56"
            />
          </form>
          <Link
            href="/proizvodi"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted sm:hidden"
            aria-label="Pretraži"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/moj-racun"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Moj račun"
          >
            <User className="h-5 w-5" />
          </Link>
          <CartLink />
        </div>
      </div>
    </header>
  );
}
