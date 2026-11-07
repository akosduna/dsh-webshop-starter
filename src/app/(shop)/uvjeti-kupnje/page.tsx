import type { Metadata } from 'next';
import Link from 'next/link';
import { Fill, LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = { title: 'Uvjeti kupnje' };

export default function TermsPage() {
  return (
    <LegalPage title="Opći uvjeti kupnje" updated={<Fill>datum</Fill>}>
      <h2>1. Podaci o prodavatelju</h2>
      <p>
        Prodavatelj je <Fill>puni naziv tvrtke ili obrta</Fill>, sa sjedištem na adresi{' '}
        <Fill>adresa sjedišta</Fill>, OIB: <Fill>OIB</Fill>, upisan u{' '}
        <Fill>sudski / obrtni registar i broj upisa</Fill>. Kontakt: <Fill>e-mail</Fill>,{' '}
        <Fill>telefon</Fill>. Odgovorna osoba: <Fill>ime i prezime</Fill>.
      </p>

      <h2>2. Primjena uvjeta</h2>
      <p>
        Ovi uvjeti vrijede za sve kupnje u internetskoj trgovini <Fill>naziv trgovine i domena</Fill>.
        Narudžbom kupac potvrđuje da je pročitao i prihvatio ove uvjete.
      </p>

      <h2>3. Narudžba i sklapanje ugovora</h2>
      <p>
        Kupac odabire proizvode, unosi podatke za dostavu i račun te potvrđuje narudžbu plaćanjem.
        Ugovor je sklopljen u trenutku uspješnog plaćanja. Nakon toga kupac na zaslonu dobiva broj
        narudžbe <Fill>i potvrdu e-poštom, ako je slanje e-pošte uključeno</Fill>.
      </p>

      <h2>4. Cijene</h2>
      <p>
        Sve cijene iskazane su u eurima (EUR). <Fill>„PDV je uključen u cijenu.” ili „Prodavatelj nije u
        sustavu PDV-a.”</Fill> Trošak dostave prikazuje se prije potvrde narudžbe. Prodavatelj
        zadržava pravo promjene cijena; za kupca vrijedi cijena važeća u trenutku narudžbe.
      </p>

      <h2>5. Plaćanje</h2>
      <p>
        Plaćanje se obavlja platnom karticom putem usluge Stripe. Podaci o kartici unose se izravno
        kod Stripea i prodavatelj ih ne vidi niti pohranjuje. <Fill>Dodatni načini plaćanja, ako
        postoje</Fill>.
      </p>

      <h2>6. Dostava</h2>
      <p>
        Dostava se obavlja na području <Fill>npr. Republike Hrvatske</Fill> putem{' '}
        <Fill>naziv dostavne službe</Fill>. Rok isporuke je <Fill>npr. 2–4 radna dana</Fill> od
        plaćanja. Cijene dostave i iznos za besplatnu dostavu prikazani su u košarici. Moguće je i
        osobno preuzimanje na adresi <Fill>adresa preuzimanja i radno vrijeme</Fill>, ako je ta opcija
        ponuđena.
      </p>

      <h2>7. Pravo na jednostrani raskid ugovora</h2>
      <p>
        Potrošač ima pravo jednostrano raskinuti ugovor u roku od 14 dana od dana primitka robe, bez
        navođenja razloga. Za raskid je dovoljno poslati jasnu izjavu, primjerice putem{' '}
        <Link href="/jednostrani-raskid-ugovora">obrasca za jednostrani raskid</Link>. Robu je
        potrebno vratiti najkasnije 14 dana od izjave o raskidu. Izravne troškove povrata snosi{' '}
        <Fill>kupac / prodavatelj</Fill>. Prodavatelj vraća uplaćeni iznos, uključujući osnovnu
        dostavu, najkasnije 14 dana od primitka izjave, istim načinom plaćanja, a može zadržati povrat
        dok ne primi robu. <Fill>Iznimke, npr. proizvodi izrađeni po mjeri ili higijenski proizvodi</Fill>.
      </p>

      <h2>8. Reklamacije i materijalni nedostaci</h2>
      <p>
        Prodavatelj odgovara za materijalne nedostatke robe u skladu sa zakonom. Pisani prigovor
        kupac može poslati na <Fill>e-mail ili adresu za prigovore</Fill>. Prodavatelj će potvrditi
        primitak prigovora i odgovoriti u roku od 15 dana od primitka.
      </p>

      <h2>9. Izvansudsko rješavanje sporova</h2>
      <p>
        Prodavatelj i kupac nastojat će sporove riješiti sporazumno. <Fill>Tijelo za izvansudsko
        rješavanje potrošačkih sporova kojem se prodavatelj obvezuje sudjelovati, ili izjava da ne
        sudjeluje</Fill>.
      </p>

      <h2>10. Zaštita osobnih podataka</h2>
      <p>
        Osobni podaci obrađuju se u skladu s <Link href="/privatnost">Pravilima privatnosti</Link>.
      </p>

      <h2>11. Završne odredbe</h2>
      <p>
        Na ove uvjete primjenjuje se pravo Republike Hrvatske. <Fill>Nadležni sud</Fill>.
      </p>
    </LegalPage>
  );
}
