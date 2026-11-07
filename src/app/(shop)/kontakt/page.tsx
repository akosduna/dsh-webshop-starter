import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getStoreSettings } from '@/lib/shop/catalog';

export const metadata: Metadata = { title: 'Kontakt' };

export default async function ContactPage() {
  const settings = await getStoreSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold">Kontakt</h1>
      <p className="text-muted-foreground">
        Imate pitanje o proizvodu ili narudžbi? Javite nam se — odgovaramo u najkraćem mogućem roku.
      </p>
      <Card className="space-y-4">
        {settings?.contact_email && (
          <p className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <a href={`mailto:${settings.contact_email}`} className="hover:text-primary">
              {settings.contact_email}
            </a>
          </p>
        )}
        {settings?.contact_phone && (
          <p className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-primary" />
            <a href={`tel:${settings.contact_phone.replace(/\s/g, '')}`} className="hover:text-primary">
              {settings.contact_phone}
            </a>
          </p>
        )}
        {settings?.address && (
          <p className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            {settings.address}
          </p>
        )}
        {settings?.contact_email && (
          <a href={`mailto:${settings.contact_email}`} className={buttonVariants()}>
            Pošalji e-mail
          </a>
        )}
        {!settings?.contact_email && !settings?.contact_phone && (
          <p className="text-sm text-muted-foreground">Kontakt podaci još nisu upisani (Admin → Postavke).</p>
        )}
      </Card>
    </div>
  );
}
