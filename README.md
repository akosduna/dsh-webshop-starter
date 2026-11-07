# Webshop starter

Gotova, jednostavna internetska trgovina koju preuzmeš, povežeš sa svojim Supabase, Stripe i Vercel računom i
prilagodiš svom brendu. Namijenjena je polaznicima AI tečajeva i kao polazna točka za projekte trgovina.

Ako radiš s AI agentom (Cursor, Claude Code, Codex…), daj mu datoteku **[AGENT-SETUP.md](./AGENT-SETUP.md)** — u njoj
su svi koraci postavljanja, korak po korak, s provjerama.

## Što trgovina ima

- **Početna** — naslov iz postavki, izdvojeni proizvodi i kategorije
- **Kategorije** s najviše jednom razinom potkategorija
- **Popis proizvoda** — pretraga, filtar po cijeni i kategoriji, sortiranje, stranice
- **Stranica proizvoda** — galerija, varijante (npr. veličina i boja), stanje zalihe
- **Košarica** — radi i bez prijave, pamti se u pregledniku
- **Naplata** kao gost ili prijavljeni kupac, adresa dostave i računa, odabir načina dostave
- **Plaćanje karticom** preko Stripea (Payment Element) i webhook koji narudžbu označi plaćenom i smanji zalihu
  (sigurno i kad Stripe pošalje isti događaj više puta)
- **Korisnički račun** — prijava, registracija, zaboravljena lozinka, povijest narudžbi, spremljene adrese
- **Dostava** — dostava na adresu (s pragom za besplatnu dostavu) i osobno preuzimanje
- **Administracija** (`/admin`) — pregled, proizvodi s fotografijama i varijantama, kategorije, narudžbe sa
  statusima, postavke trgovine i dostave
- **Pravne stranice** — predlošci na hrvatskom s oznakama `[UPIŠI …]`: Uvjeti kupnje, Privatnost, Kolačići,
  Jednostrani raskid ugovora

Svi tekstovi za kupce su na hrvatskom, cijene u eurima.

## Tehnologija

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (baza, prijava, spremište slika) ·
Stripe · zustand (košarica) · Vercel (hosting)

## Brzi početak

Potrebno: Node.js 20.9+, Git, besplatni računi na [Supabase](https://supabase.com), [Stripe](https://stripe.com) i
[Vercel](https://vercel.com). Detalji za svaki korak su u [AGENT-SETUP.md](./AGENT-SETUP.md).

1. Preuzmi projekt i instaliraj pakete: `npm install`
2. Napravi novi Supabase projekt.
3. Primijeni bazu: `npx supabase link --project-ref <ref>` pa `npx supabase db push --include-seed`
   (ili zalijepi SQL datoteke u Supabase SQL Editor).
4. Kopiraj `.env.example` u `.env.local` i upiši Supabase i Stripe **test** ključeve.
5. Pokreni: `npm run dev` i otvori http://localhost:3000
6. Registriraj se u trgovini, pa sebe postavi za administratora (SQL u AGENT-SETUP.md, korak 5).
7. Za plaćanje lokalno pokreni `stripe listen --forward-to localhost:3000/api/stripe/webhook` i
   `whsec_…` vrijednost upiši u `.env.local`.
8. Probna kupnja s karticom `4242 4242 4242 4242` → narudžba je u `/admin/orders` označena kao plaćena.
9. Objavi na Vercelu, dodaj varijable okruženja i Stripe webhook za produkcijski URL.
10. Prije prave prodaje: ispuni pravne stranice, svoje proizvode i prebaci Stripe na live ključeve.

## Struktura projekta

```
src/
  app/
    (shop)/          trgovina: početna, proizvodi, kategorije, košarica, naplata, račun, pravne stranice
    (shop)/(auth)/   prijava, registracija, zaboravljena i nova lozinka
    admin/           administracija (samo za ulogu admin)
    api/stripe/      Stripe webhook
    auth/callback/   povratak iz e-mail poveznica (potvrda računa, nova lozinka)
    globals.css      BREND: boje, fontovi, zaobljenost
  components/        UI komponente (ui/ su osnovni gumbi, polja, kartice)
  config/site.ts     ostale postavke (broj proizvoda po stranici, napomena o pravnim tekstovima)
  lib/               Supabase klijenti, Stripe, katalog, narudžbe, pomoćne funkcije
  store/cart.ts      košarica
  types/database.ts  tipovi tablica
  proxy.ts           osvježavanje prijave
supabase/
  migrations/        shema baze, funkcije, prava pristupa (RLS), spremište slika
  seed.sql           demo podaci (3 kategorije, 8 proizvoda, 2 načina dostave)
public/demo/         demo slike proizvoda
```

## Kako promijeniti izgled (brend)

Sve boje, fontovi i zaobljenost su na **jednom mjestu**: blok `:root` na vrhu `src/app/globals.css`.

- `--primary` je glavna boja (gumbi, poveznice). Boje su u OKLCH formatu; vrijednost lako dobiješ na
  [oklch.com](https://oklch.com).
- `--radius` određuje zaobljenost kartica i gumba.
- Font: učitaj Google font preko `next/font` u `src/app/layout.tsx` i stavi njegovu CSS varijablu u `--font-body`
  (upute su u komentaru u `globals.css`).

Ime trgovine, kontakt, adresa i tekst na početnoj mijenjaju se u **Admin → Postavke**, bez diranja koda. Logo:
zamijeni tekstualni naziv u `src/components/layout/header.tsx` svojom slikom i zamijeni `src/app/icon.svg`.

## Naredbe

| Naredba             | Što radi                              |
| ------------------- | ------------------------------------- |
| `npm run dev`       | lokalni razvoj na http://localhost:3000 |
| `npm run build`     | produkcijska verzija                  |
| `npm run lint`      | provjera koda                         |
| `npm run typecheck` | provjera TypeScript tipova            |

## Važno

Pravni tekstovi su **predlošci**. Vlasnik trgovine ih mora provjeriti i prilagoditi (po potrebi uz pravnika) prije
početka prodaje. Isto vrijedi za podatke o tvrtki, PDV-u i fiskalizaciji, koji ovise o tvojoj vrsti poslovanja.
