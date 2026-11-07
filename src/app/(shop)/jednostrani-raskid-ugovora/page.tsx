import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Fill, LegalPage } from '@/components/legal/legal-page';
import { getStoreSettings } from '@/lib/shop/catalog';

export const metadata: Metadata = { title: 'Jednostrani raskid ugovora' };

const MAIL_BODY = `Izjavljujem da jednostrano raskidam ugovor o kupnji sljedeće robe:

Broj narudžbe:
Proizvodi:
Datum narudžbe / datum primitka:
Ime i prezime:
Adresa:
IBAN za povrat (ako je potrebno):
Datum:`;

export default async function WithdrawalPage() {
  const settings = await getStoreSettings();
  const email = settings?.contact_email;
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent('Jednostrani raskid ugovora')}&body=${encodeURIComponent(MAIL_BODY)}`
    : null;

  return (
    <LegalPage title="Jednostrani raskid ugovora" updated={<Fill>datum</Fill>}>
      <p>
        Kao potrošač imate pravo jednostrano raskinuti ugovor sklopljen na daljinu u roku od 14 dana
        od dana primitka robe, bez navođenja razloga. Rok je poštovan ako izjavu pošaljete prije
        njegova isteka.
      </p>
      <p>
        Izjavu možete poslati e-poštom, poštom ili ispunjavanjem obrasca ispod. Robu vratite na{' '}
        <Fill>adresa za povrat robe</Fill> najkasnije 14 dana od slanja izjave.
      </p>
      <p>
        <Fill>Provjerite zahtijeva li važeći propis za vašu trgovinu i posebnu „funkciju za
        raskid” (gumb) na stranici te po potrebi proširite ovu stranicu.</Fill>
      </p>

      {mailto && (
        <p className="mt-6">
          <a href={mailto} className={buttonVariants()}>
            <Mail className="h-4 w-4" /> Pošalji izjavu e-poštom
          </a>
        </p>
      )}

      <h2>Obrazac za jednostrani raskid ugovora</h2>
      <p>(ispunite i pošaljite ovaj obrazac samo ako želite jednostrano raskinuti ugovor)</p>
      <div className="mt-4 space-y-3 rounded-lg border bg-card p-6 text-sm">
        <p>
          Prima: <Fill>naziv prodavatelja, adresa, e-mail</Fill>
        </p>
        <p>Izjavljujem da jednostrano raskidam ugovor o kupnji sljedeće robe:</p>
        <p>______________________________________________</p>
        <p>Broj narudžbe: ____________________</p>
        <p>Datum narudžbe / datum primitka robe: ____________________</p>
        <p>Ime i prezime potrošača: ____________________</p>
        <p>Adresa potrošača: ____________________</p>
        <p>Potpis potrošača (samo ako se obrazac šalje na papiru): ____________________</p>
        <p>Datum: ____________________</p>
      </div>
    </LegalPage>
  );
}
