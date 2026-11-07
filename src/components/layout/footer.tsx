import Link from 'next/link';
import { siteConfig } from '@/config/site';
import type { StoreSettings } from '@/lib/shop/catalog';

const legalLinks = [
  { href: '/uvjeti-kupnje', label: 'Uvjeti kupnje' },
  { href: '/privatnost', label: 'Pravila privatnosti' },
  { href: '/kolacici', label: 'Kolačići' },
  { href: '/jednostrani-raskid-ugovora', label: 'Jednostrani raskid ugovora' },
];

export function Footer({ shopName, settings }: { shopName: string; settings: StoreSettings | null }) {
  return (
    <footer className="mt-20 border-t bg-muted/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold">{shopName}</p>
          {settings?.tagline && <p className="mt-2 text-muted-foreground">{settings.tagline}</p>}
        </div>
        <div>
          <p className="font-semibold">Kontakt</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {settings?.contact_email && (
              <li>
                <a href={`mailto:${settings.contact_email}`} className="hover:text-foreground">
                  {settings.contact_email}
                </a>
              </li>
            )}
            {settings?.contact_phone && <li>{settings.contact_phone}</li>}
            {settings?.address && <li>{settings.address}</li>}
            <li>
              <Link href="/kontakt" className="hover:text-foreground">
                Kontakt stranica
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Informacije</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-4 text-xs text-muted-foreground">
          {siteConfig.showLegalTemplateNotice && (
            <p>
              Napomena: pravni tekstovi na ovoj stranici su predlošci i vlasnik trgovine ih mora
              provjeriti i prilagoditi prije početka prodaje.
            </p>
          )}
          <p>
            © {new Date().getFullYear()} {shopName}. Sva prava pridržana.
          </p>
        </div>
      </div>
    </footer>
  );
}
