import type { Metadata } from 'next';
import Link from 'next/link';
import { Fill, LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = { title: 'Pravila privatnosti' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Pravila privatnosti" updated={<Fill>datum</Fill>}>
      <h2>1. Voditelj obrade</h2>
      <p>
        Voditelj obrade osobnih podataka je <Fill>puni naziv tvrtke ili obrta</Fill>,{' '}
        <Fill>adresa</Fill>, OIB <Fill>OIB</Fill>. Za pitanja o privatnosti pišite na{' '}
        <Fill>e-mail za privatnost</Fill>. <Fill>Službenik za zaštitu podataka, ako je imenovan</Fill>.
      </p>

      <h2>2. Koje podatke prikupljamo</h2>
      <ul>
        <li>podaci za narudžbu: ime i prezime, adresa dostave i računa, e-mail, telefon, napomena;</li>
        <li>podaci o korisničkom računu: e-mail, lozinka (pohranjena kriptirano), spremljene adrese;</li>
        <li>podaci o narudžbama: kupljeni proizvodi, iznosi, status plaćanja i dostave;</li>
        <li>
          podaci o plaćanju obrađuje Stripe; mi ne vidimo i ne pohranjujemo broj kartice;
        </li>
        <li>tehnički podaci nužni za rad stranice (vidi <Link href="/kolacici">Kolačići</Link>).</li>
      </ul>

      <h2>3. Svrha i pravna osnova</h2>
      <ul>
        <li>izvršenje ugovora (obrada i dostava narudžbe, korisnički račun) — čl. 6. st. 1. b) GDPR-a;</li>
        <li>zakonske obveze (računovodstvo, porezni propisi, reklamacije) — čl. 6. st. 1. c);</li>
        <li>legitimni interes (sigurnost, sprječavanje prijevara) — čl. 6. st. 1. f);</li>
        <li><Fill>privola, ako šaljete newsletter ili koristite analitiku</Fill>.</li>
      </ul>

      <h2>4. Primatelji podataka</h2>
      <p>Podatke dijelimo samo s pružateljima usluga nužnih za rad trgovine:</p>
      <ul>
        <li>Supabase — baza podataka i prijava korisnika (<Fill>regija poslužitelja, npr. EU</Fill>);</li>
        <li>Vercel — poslužitelj internetske stranice;</li>
        <li>Stripe — obrada plaćanja karticama;</li>
        <li><Fill>dostavna služba</Fill> — dostava pošiljaka;</li>
        <li><Fill>knjigovodstveni servis i ostali primatelji</Fill>.</li>
      </ul>
      <p>
        <Fill>Ako se podaci prenose izvan EU/EGP-a, navedite zaštitne mjere (npr. standardne
        ugovorne klauzule).</Fill>
      </p>

      <h2>5. Rok čuvanja</h2>
      <p>
        Podatke o narudžbama čuvamo <Fill>rok, npr. koliko propisuju računovodstveni propisi</Fill>.
        Korisnički račun čuvamo dok ga ne obrišete. <Fill>Ostali rokovi</Fill>.
      </p>

      <h2>6. Vaša prava</h2>
      <p>
        Imate pravo na pristup, ispravak, brisanje, ograničenje obrade, prenosivost podataka i
        prigovor. Zahtjev pošaljite na <Fill>e-mail</Fill>. Pritužbu možete podnijeti Agenciji za
        zaštitu osobnih podataka (AZOP).
      </p>
    </LegalPage>
  );
}
