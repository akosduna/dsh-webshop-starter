import type { Metadata } from 'next';
import { Fill, LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = { title: 'Kolačići' };

export default function CookiesPage() {
  return (
    <LegalPage title="Pravila o kolačićima" updated={<Fill>datum</Fill>}>
      <h2>Što su kolačići</h2>
      <p>
        Kolačići su male datoteke koje stranica sprema u vaš preglednik. Slično se koristi i lokalna
        pohrana preglednika (localStorage).
      </p>

      <h2>Koje kolačiće koristimo</h2>
      <p>Trgovina u osnovnoj verziji koristi samo nužne kolačiće, za koje nije potrebna privola:</p>
      <ul>
        <li>
          <strong>better-auth.session_token</strong> — održava prijavu u korisnički račun. Traje dok se ne
          odjavite ili sesija ne istekne.
        </li>
        <li>
          <strong>shop_order_…</strong> — omogućuje pregled vaše narudžbe i podataka za plaćanje bez
          prijave. Traje 60 dana.
        </li>
        <li>
          <strong>shop-cart</strong> (lokalna pohrana) — pamti sadržaj košarice na vašem uređaju.
        </li>
        <li>
          <strong>Stripe</strong> — prilikom plaćanja Stripe postavlja kolačiće nužne za sigurnost i
          sprječavanje prijevara.
        </li>
      </ul>

      <h2>Analitika i marketing</h2>
      <p>
        <Fill>Ako dodate Google Analytics, Meta Pixel ili slične alate: navedite ih ovdje i dodajte
        traku za privolu (cookie banner) prije njihova učitavanja.</Fill>
      </p>

      <h2>Upravljanje kolačićima</h2>
      <p>
        Kolačiće možete obrisati ili blokirati u postavkama preglednika. Bez nužnih kolačića prijava i
        košarica neće raditi.
      </p>
    </LegalPage>
  );
}
