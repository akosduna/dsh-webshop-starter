import Link from 'next/link';
import { LogoutButton } from '@/components/auth/auth-forms';
import { requireUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

const links = [
  { href: '/moj-racun', label: 'Profil' },
  { href: '/moj-racun/narudzbe', label: 'Narudžbe' },
  { href: '/moj-racun/adrese', label: 'Adrese' },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // The proxy only checks that a session cookie exists; this is the real check.
  const user = await requireUser('/moj-racun');

  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <aside className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Prijavljeni ste kao</p>
          <p className="truncate text-sm font-medium" data-testid="account-email">
            {user.email}
          </p>
        </div>
        <nav className="flex gap-1 md:flex-col" aria-label="Moj račun">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
              {l.label}
            </Link>
          ))}
          {user.isAdmin && (
            <Link href="/admin" className="rounded-md px-3 py-2 text-sm text-primary hover:bg-muted">
              Administracija
            </Link>
          )}
        </nav>
        <LogoutButton className="text-muted-foreground" />
      </aside>
      <div>{children}</div>
    </div>
  );
}
