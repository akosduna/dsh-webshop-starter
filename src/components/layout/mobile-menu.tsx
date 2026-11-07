'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
        aria-label={open ? 'Zatvori izbornik' : 'Otvori izbornik'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <nav className="absolute inset-x-0 top-16 border-b bg-background px-4 py-3 shadow-sm">
          <form action="/proizvodi" role="search" className="mb-3">
            <input
              name="q"
              placeholder="Pretraži proizvode…"
              aria-label="Pretraži proizvode"
              className="h-10 w-full rounded-md border bg-card px-3 text-sm"
            />
          </form>
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block rounded-md px-2 py-2 hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
