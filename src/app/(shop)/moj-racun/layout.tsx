import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { requireUser, isAdminUser } from '@/lib/auth';
import { logout } from '@/app/(shop)/(auth)/actions';

export const dynamic = 'force-dynamic';

const links = [
  { href: '/moj-racun', label: 'Profil' },
  { href: '/moj-racun/narudzbe', label: 'Narudžbe' },
  { href: '/moj-racun/adrese', label: 'Adrese' },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser('/moj-racun');
  const admin = await isAdminUser();

  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <aside className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Prijavljeni ste kao</p>
          <p className="truncate text-sm font-medium">{user.email}</p>
        </div>
        <nav className="flex gap-1 md:flex-col" aria-label="Moj račun">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
              {l.label}
            </Link>
          ))}
          {admin && (
            <Link href="/admin" className="rounded-md px-3 py-2 text-sm text-primary hover:bg-muted">
              Administracija
            </Link>
          )}
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Odjava
          </button>
        </form>
      </aside>
      <div>{children}</div>
    </div>
  );
}
