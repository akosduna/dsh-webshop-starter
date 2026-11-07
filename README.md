# Webshop starter

Gotova internetska trgovina koju preuzmeš, povežeš sa svojim Vercel računom (baza Neon, slike Vercel Blob) i
prilagodiš svom brendu. Plaćanje virmanom s barkodom, karticom (Stripe ili Teya), dostava GLS i BOX NOW, blog i
korisnički računi. Namijenjena polaznicima AI tečajeva i kao polazna točka za projekte trgovina.

Ako radiš s AI agentom (Cursor, Claude Code, Codex…), daj mu datoteku **[AGENT-SETUP.md](./AGENT-SETUP.md)**: u njoj
su svi koraci postavljanja s provjerama.

## Što trgovina ima

- **Početna**: naslov iz postavki, izdvojeni proizvodi i kategorije
- **Kategorije** s jednom razinom potkategorija, **popis proizvoda** s pretragom, filtrima, sortiranjem i stranicama
- **Stranica proizvoda**: galerija, varijante (npr. veličina i boja), stanje zalihe
- **Košarica** radi i bez prijave i pamti se u pregledniku
- **Naplata** kao gost ili prijavljeni kupac (spremljene adrese se nude same)
- **Načini plaćanja**
  - **uplata na račun (virman)**: podaci za uplatu i PDF417 barkod za „slikaj i plati”, zaliha se rezervira odmah
  - **kartica preko Stripea** (Payment Element, Apple Pay, Google Pay)
  - **kartica preko Teye** (SecurePay stranica, isključeno dok se ne uključi)
- **Dostava**: dostava na adresu po fiksnoj cijeni, osobno preuzimanje, GLS na adresu, GLS paketomat / ParcelShop
  (karta za odabir), BOX NOW paketomat (karta za odabir). Cijene, prag za besplatnu dostavu, najveći iznos narudžbe
  i države uređuju se u administraciji.
- **Korisnički račun**: registracija, prijava, zaboravljena lozinka, profil, promjena lozinke, adrese, povijest
  narudžbi s praćenjem pošiljke i podacima za uplatu
- **Blog** (`/blog`): objave s naslovnom slikom, SEO naslovom i opisom, u sitemapi
- **Administracija** (`/admin`)
  - pregled sa stanjem modula
  - proizvodi s fotografijama i varijantama, kategorije
  - narudžbe: označi plaćeno, otkaži, skupno otkaži neplaćene virmane, izradi GLS / BOX NOW pošiljku, ispiši
    naljepnicu, osvježi praćenje
  - blog s uređivačem teksta, postavke trgovine i dostave
- **E-mailovi o narudžbi** (isključeno dok se ne uključi): zaprimljeno, upute za uplatu, plaćeno, poslano
- **Pravne stranice**: predlošci na hrvatskom s oznakama `[UPIŠI …]` (Uvjeti kupnje, Privatnost, Kolačići,
  Jednostrani raskid ugovora)

Svi tekstovi za kupce su na hrvatskom, cijene u eurima.

## Moduli

Svaki dio koji treba vanjski račun je **modul** u `src/config/modules.ts`. Modul radi kad je uključen (`enabled`) i
kad su postavljeni svi njegovi ključevi. Do tada se u trgovini ne prikazuje (naplata nudi samo spremne načine
plaćanja i dostave), a **Admin → Pregled** pokazuje stanje: ✅ spreman · ⚠ nedostaju ključevi: … · ⏸ isključeno.

| Modul | Zadano | Ključevi |
| --- | --- | --- |
| Uplata na račun (virman) | uključeno | `BANK_IBAN`, `BANK_RECIPIENT_NAME`, `BANK_RECIPIENT_STREET`, `BANK_RECIPIENT_CITY` |
| Stripe | uključeno | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Teya | isključeno | `TEYA_MERCHANT_ID`, `TEYA_PAYMENT_GATEWAY_ID`, `TEYA_SECRET_KEY`, `TEYA_API_URL` |
| GLS | uključeno | `GLS_USERNAME`, `GLS_PASSWORD`, `GLS_CLIENT_NUMBER`, `GLS_SENDER_*` |
| BOX NOW | uključeno | `BOXNOW_CLIENT_ID`, `BOXNOW_CLIENT_SECRET`, `BOXNOW_PARTNER_ID`, `BOXNOW_WAREHOUSE_ID`, `BOXNOW_WEBHOOK_SECRET` |
| Dostava na adresu (fiksna cijena) | uključeno | — |
| Osobno preuzimanje | uključeno | — |
| Blog | uključeno | — |
| E-mailovi o narudžbi (Resend) | isključeno | `RESEND_API_KEY`, `EMAIL_FROM` |
| Upload slika (Vercel Blob) | uključeno | `BLOB_READ_WRITE_TOKEN` |

Kako dobiti ključeve za svaki modul: **[INTEGRATIONS.md](./INTEGRATIONS.md)**.

## Tehnologija

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Neon Postgres + Drizzle ORM · Better Auth
(e-mail i lozinka) · Vercel Blob · Stripe · zustand (košarica) · tiptap (uređivač bloga) · Vercel (hosting)

## Brzi početak

Potrebno: Node.js 20.9+, Git, besplatni [Vercel](https://vercel.com) račun i Vercel CLI (`npm i -g vercel`).
Detalji su u [AGENT-SETUP.md](./AGENT-SETUP.md) i [DATABASE-SETUP.md](./DATABASE-SETUP.md).

1. `npm install`
2. `vercel link`, pa u Vercelu dodaj **Neon** bazu (Storage → Marketplace) i **Blob** spremište.
3. `vercel env pull .env.local`, pa u `.env.local` dodaj `BETTER_AUTH_SECRET`, `ADMIN_EMAILS`,
   `NEXT_PUBLIC_APP_URL=http://localhost:3000` i podatke za uplatu (`BANK_*`).
4. `npm run db:migrate` pa `npm run db:seed`
5. `npm run dev` i otvori http://localhost:3000
6. Registriraj se e-mailom iz `ADMIN_EMAILS` → `/admin` je tvoj.
7. Probna narudžba „Uplata na račun” → stranica s barkodom → u administraciji „Označi plaćeno”.
8. Po potrebi postavi Stripe, GLS, BOX NOW, Teyu i e-mail ([INTEGRATIONS.md](./INTEGRATIONS.md)).
9. Prije prave prodaje: ispuni pravne stranice, unesi svoje proizvode, prebaci plaćanja na live ključeve.

## Struktura projekta

```
src/
  app/
    (shop)/            trgovina: početna, proizvodi, kategorije, košarica, naplata, račun, blog, pravne stranice
    (shop)/(auth)/     prijava, registracija, zaboravljena i nova lozinka
    admin/             administracija (samo administratori)
    api/auth/          Better Auth
    api/stripe/        Stripe webhook
    api/teya/          Teya povratne adrese (notify, success, cancel, error)
    api/boxnow/        BOX NOW webhook
    api/orders/        barkod za uplatu (PNG)
    api/admin/         upload slika (Blob), GLS / BOX NOW naljepnice
    api/health/        provjera nakon objave (env, baza, tablice, moduli)
    globals.css        BREND: boje, fontovi, zaobljenost
  components/          UI komponente (ui/ su osnovni gumbi, polja, kartice)
  config/modules.ts    MODULI: uključivanje i isključivanje
  config/site.ts       ostale postavke (broj proizvoda po stranici, napomena o pravnim tekstovima)
  db/schema.ts         shema baze (Drizzle); auth-schema.ts su tablice prijave
  lib/                 prijava, plaćanja (HUB-3, Stripe, Teya), dostava (GLS, BOX NOW), e-mail, katalog, narudžbe
  store/cart.ts        košarica
  proxy.ts             brza provjera kolačića za /admin i /moj-racun
drizzle/               SQL migracije (generira drizzle-kit, commitaju se)
scripts/seed.ts        početni podaci (postavke, 5 načina dostave, demo katalog i blog objava)
public/demo/           demo slike
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

| Naredba | Što radi |
| --- | --- |
| `npm run dev` | lokalni razvoj na http://localhost:3000 |
| `npm run build` | produkcijska verzija |
| `npm run lint` | provjera koda |
| `npm run typecheck` | provjera TypeScript tipova |
| `npm test` | unit testovi (`node:test` preko `tsx`) |
| `npm run db:generate` | nova migracija iz promjena u `src/db/schema.ts` |
| `npm run db:migrate` | primijeni migracije na bazu iz `.env.local` |
| `npm run db:seed` | početni podaci (`-- --no-demo` bez demo kataloga) |
| `npm run db:studio` | pregled baze u pregledniku (Drizzle Studio) |

## Važno

Pravni tekstovi su **predlošci**. Vlasnik trgovine ih mora provjeriti i prilagoditi (po potrebi uz pravnika) prije
početka prodaje. Isto vrijedi za podatke o tvrtki, PDV-u i fiskalizaciji, koji ovise o vrsti poslovanja.
