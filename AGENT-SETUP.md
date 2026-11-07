# AGENT-SETUP — postavljanje trgovine korak po korak

Ova datoteka je pisana za **AI agenta** (Cursor, Claude Code, Codex…) koji vlasniku trgovine (u daljnjem tekstu
„čovjek”) pomaže postaviti ovaj projekt na njegov Supabase, Stripe i Vercel račun. Radi korake redom. Na kraju
svakog koraka je **Provjera**: ne idi dalje dok provjera ne prođe.

## 0. Pravila za agenta (obavezno)

1. **Pitaj čovjeka prije svega što košta novac ili ide uživo**: plaćeni Supabase/Vercel plan, kupnja domene,
   Stripe live ključevi, objava na pravoj domeni, slanje e-maila pravim kupcima. Objasni što će se dogoditi i
   pričekaj izričito „da”.
2. **Prijave radi čovjek.** Ne upisuj njegove lozinke. Kad treba prijava (Supabase, Stripe, Vercel, GitHub), zamoli
   ga da se prijavi sam u pregledniku ili terminalu.
3. **Tajne ključeve nikad ne ispisuj u chat, ne stavljaj u kod i ne commitaj.** Upisuju se samo u `.env.local`
   (lokalno, već je u `.gitignore`) i u Vercel → Environment Variables. `.env.example` sadrži samo zamjenske
   vrijednosti i takav ostaje.
4. Ne isključuj provjere da bi build prošao (`ignoreBuildErrors`, `// @ts-ignore`, brisanje RLS pravila). Popravi
   uzrok.
5. Baza: mijenjaj je samo novim migracijama u `supabase/migrations/`. Svaka nova tablica mora imati uključen RLS,
   izričite `grant` naredbe i pravila (policies) — vidi `20260101000003_rls.sql` kao uzor.
6. Kad nisi siguran, pitaj čovjeka jedno konkretno pitanje s ponuđenim opcijama.

## 1. Preduvjeti

Čovjek treba imati: računalo s macOS, Windows ili Linux; **Node.js 20.9 ili noviji**; **Git**; besplatne račune na
[supabase.com](https://supabase.com), [stripe.com](https://stripe.com) i [vercel.com](https://vercel.com); GitHub
račun (za objavu na Vercelu).

Opcionalno: [Stripe CLI](https://docs.stripe.com/stripe-cli) (za testiranje plaćanja lokalno) i Docker Desktop (samo
ako želi lokalnu Supabase bazu, vidi korak 14).

**Provjera**

```bash
node -v    # v20.9 ili više
git --version
npm -v
```

## 2. Instalacija projekta

```bash
npm install
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
```

**Provjera:** `npm run typecheck` završi bez grešaka.

## 3. Supabase projekt

Zamoli čovjeka da:

1. Na [supabase.com/dashboard](https://supabase.com/dashboard) klikne **New project**.
2. Odabere ime, **regiju u EU** (npr. Frankfurt — bitno zbog GDPR-a i brzine za hrvatske kupce) i spremi lozinku
   baze na sigurno mjesto.
3. Besplatni plan je dovoljan za početak. (Ako Supabase traži plaćeni plan — stani i pitaj.)

Kad je projekt spreman, trebaš **Project ref** (dio URL-a `https://<ref>.supabase.co`, vidi se u
Project Settings → General).

**Provjera:** čovjek ti je dao project ref, a Dashboard prikazuje projekt kao aktivan.

## 4. Baza: migracije i demo podaci

U projektu su četiri migracije i demo podaci:

| Datoteka                                          | Što radi                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `supabase/migrations/20260101000001_schema.sql`   | tablice, broj narudžbe, okidači                                    |
| `supabase/migrations/20260101000002_functions.sql` | `is_admin()`, sigurno smanjenje zalihe, označavanje plaćene narudžbe |
| `supabase/migrations/20260101000003_rls.sql`      | prava pristupa (RLS, grantovi, pravila)                            |
| `supabase/migrations/20260101000004_storage.sql`  | spremište slika `product-images`                                   |
| `supabase/seed.sql`                               | demo: postavke, 3 kategorije, 8 proizvoda, 2 načina dostave        |

### Opcija A — Supabase CLI (preporučeno)

```bash
npx supabase login                         # čovjek se prijavljuje u pregledniku
npx supabase link --project-ref <ref>      # traži lozinku baze — upisuje je čovjek
npx supabase db push --include-seed        # migracije + demo podaci
```

Ako demo podatke ne želi, izostavi `--include-seed`. (Demo proizvode može kasnije i obrisati u administraciji.)

### Opcija B — SQL Editor (bez CLI-a)

U Supabase Dashboardu → **SQL Editor** → New query: zalijepi i pokreni sadržaj datoteka **ovim redom**:
`…0001_schema.sql`, `…0002_functions.sql`, `…0003_rls.sql`, `…0004_storage.sql`, pa po želji `seed.sql`.
Svaku pokreni zasebno i provjeri da nema greške prije sljedeće.

**Provjera** (SQL Editor):

```sql
select
  (select count(*) from public.products)          as proizvodi,      -- 8 s demo podacima
  (select count(*) from public.shipping_methods)  as dostava,        -- 2
  (select count(*) from public.store_settings)    as postavke,       -- 1
  (select count(*) from storage.buckets where id = 'product-images') as spremiste; -- 1
```

## 5. Varijable okruženja

Upiši vrijednosti u `.env.local`. Ključeve čovjek kopira iz Dashboarda; ti mu kažeš točno gdje su.

| Varijabla                              | Gdje je naći                                                                   | Obavezno |
| -------------------------------------- | ------------------------------------------------------------------------------ | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase → Project Settings → Data API → Project URL                           | da       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key (`sb_publishable_…`; stari projekti: `anon` ključ) | da |
| `SUPABASE_SECRET_KEY`                  | Supabase → Project Settings → API Keys → Secret key (`sb_secret_…`; stari projekti: `service_role`). **Tajna** — samo server | da |
| `NEXT_PUBLIC_SITE_URL`                 | lokalno `http://localhost:3000`; na Vercelu prava adresa, bez `/` na kraju     | da       |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`   | Stripe → Developers → API keys → Publishable key (`pk_test_…`)                 | da, za plaćanje |
| `STRIPE_SECRET_KEY`                    | Stripe → Developers → API keys → Secret key (`sk_test_…`). **Tajna**           | da, za plaćanje |
| `STRIPE_WEBHOOK_SECRET`                | lokalno: ispis `stripe listen` (korak 7); produkcija: Stripe → Webhooks → endpoint → Signing secret (`whsec_…`). **Tajna** | da, za plaćanje |

Bez Stripe ključeva trgovina radi (katalog, košarica, račun, administracija), ali naplata javlja da plaćanje nije
postavljeno.

**Provjera:** `npm run dev`, otvori http://localhost:3000 — vide se demo proizvodi i kategorije.

## 6. Prijava kupaca (Supabase Auth)

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (nakon objave promijeni na pravu adresu, korak 10)
- **Redirect URLs:** dodaj `http://localhost:3000/**` (kasnije i `https://<tvoja-domena>/**`)

Te adrese trebaju poveznice iz e-mailova (potvrda računa, nova lozinka), koje vode na `/auth/callback`.

Napomena: ugrađeni Supabase e-mail služi samo za testiranje i šalje vrlo malo poruka na sat. Prije prave prodaje
postavi vlastiti SMTP (Authentication → Emails → SMTP Settings) — **pitaj čovjeka**, jer to može biti plaćena usluga.

**Provjera:** na `/registracija` napravi račun, potvrdi e-mail (ako je potvrda uključena), prijavi se na `/prijava`
— `/moj-racun` se otvara.

## 7. Prvi administrator

Administrator je obični korisnik kojem je u tablici `profiles` uloga `admin`. Čovjek se prvo registrira u trgovini
(korak 6), a onda u SQL Editoru pokreneš (zamijeni e-mail):

```sql
update public.profiles
set role = 'admin'
where email = 'ovdje-upisi-email@primjer.hr'
returning email, role;
```

Upit mora vratiti jedan redak s `admin`. Ako vrati nula redaka, korisnik se još nije registrirao ili je e-mail
krivo upisan. Uloga se ne može promijeniti iz trgovine, samo SQL-om — to je namjerno.

**Provjera:** nakon ponovnog učitavanja `/admin` se otvara, a u izborniku računa je poveznica „Administracija”.

## 8. Stripe (test način)

1. Čovjek u Stripe Dashboardu mora biti u **test modu** (prekidač „Test mode” / sandbox).
2. Developers → API keys: `pk_test_…` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `sk_test_…` → `STRIPE_SECRET_KEY`.
3. Lokalni webhook — u drugom terminalu:

   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook \
     --events payment_intent.succeeded,payment_intent.payment_failed,charge.refunded
   ```

   Naredba ispiše `whsec_…` → upiši u `STRIPE_WEBHOOK_SECRET` i ponovno pokreni `npm run dev`.

Kako plaćanje radi: naplata napravi narudžbu (`pending_payment`) i Stripe PaymentIntent s ukupnim iznosom iz baze
(nikad iz preglednika). Kad Stripe potvrdi plaćanje, webhook pozove funkciju `mark_order_paid`, koja narudžbu
označi plaćenom i smanji zalihu **točno jednom**, čak i ako Stripe isti događaj pošalje više puta. Stranica
`/naplata/uspjeh` radi istu provjeru kao rezervu ako webhook kasni.

**Provjera:** probna kupnja (korak 12) pokaže narudžbu kao „Plaćeno”, a terminal sa `stripe listen` prikaže
`payment_intent.succeeded` s odgovorom `200`.

## 9. Postavke trgovine i dostava

U **Admin → Postavke**:

- naziv trgovine, kratki opis, kontakt e-mail, telefon, adresa (prikazuju se u podnožju, na stranici Kontakt i u
  pravnim stranicama)
- naslov i podnaslov na početnoj
- načini dostave: naziv, vrsta (dostava / osobno preuzimanje), cijena, prag za besplatnu dostavu, opis, redoslijed,
  aktivno

Valuta je EUR. Zatim u **Admin → Kategorije** i **Admin → Proizvodi** zamijeni demo sadržaj pravim (fotografije se
učitavaju u Supabase Storage, do 5 MB po slici).

Pravne stranice (`src/app/(shop)/uvjeti-kupnje`, `privatnost`, `kolacici`, `jednostrani-raskid-ugovora`): pronađi
sve oznake `[UPIŠI …]` (`rg "Fill>" src/app`) i zamoli čovjeka za točne podatke (naziv tvrtke, OIB, adresa,
dostavna služba, rokovi). **Ne izmišljaj pravne podatke.** Kad su tekstovi provjereni, u `src/config/site.ts`
postavi `showLegalTemplateNotice: false` da nestane napomena u podnožju.

**Provjera:** `rg -c "Fill>" src/app` vraća samo datoteke koje je čovjek svjesno ostavio za kasnije.

## 10. Objava na Vercelu

1. Čovjek napravi **privatni** GitHub repozitorij i pushne projekt (`.env.local` se ne pusha — provjeri
   `git status` prije commita).
2. Vercel → **Add New → Project** → uvezi repozitorij. Framework se prepozna sam (Next.js).
3. **Environment Variables** — dodaj sve iz koraka 5 (za sada test Stripe ključevi), a
   `NEXT_PUBLIC_SITE_URL` = Vercel adresa, npr. `https://moja-trgovina.vercel.app`.
4. Deploy.
5. Vlastita domena (opcionalno; **pitaj prije kupnje**): Vercel → Project → Settings → Domains, pa DNS zapisi
   kako Vercel kaže. Nakon toga promijeni `NEXT_PUBLIC_SITE_URL` i ponovno deployaj (Redeploy).
6. Supabase → Authentication → URL Configuration: **Site URL** = produkcijska adresa, u **Redirect URLs** dodaj
   `https://<adresa>/**`.

**Provjera:** produkcijska adresa otvara početnu s proizvodima; `/prijava` radi.

## 11. Stripe webhook za produkciju

Stripe Dashboard → Developers → **Webhooks** → Add endpoint:

- URL: `https://<adresa>/api/stripe/webhook`
- Događaji: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

Kopiraj **Signing secret** (`whsec_…`) u Vercel → `STRIPE_WEBHOOK_SECRET` i ponovno deployaj. (Lokalni `whsec_`
iz `stripe listen` je drugačiji i ne vrijedi na Vercelu.)

**Provjera:** nakon probne kupnje na produkciji, u Stripe → Webhooks → endpoint, događaj ima status `200`.

## 12. Završna provjera (radi je lokalno i na produkciji)

- [ ] Početna, kategorija, popis proizvoda i stranica proizvoda se otvaraju i prikazuju proizvode
- [ ] Pretraga i sortiranje na `/proizvodi` rade
- [ ] Proizvod s varijantama: odaberi veličinu/boju, dodaj u košaricu; košarica ostaje nakon osvježavanja stranice
- [ ] Naplata kao gost: ispuni podatke, odaberi dostavu, plati karticom `4242 4242 4242 4242`, bilo koji budući
      datum, bilo koji CVC → otvara se stranica „Hvala na narudžbi”
- [ ] `/admin/orders`: narudžba je „Plaćeno”, broj narudžbe počinje od 1001
- [ ] Zaliha kupljenog proizvoda/varijante se smanjila za kupljenu količinu (admin → proizvod)
- [ ] Prijavljeni kupac vidi svoju narudžbu u `/moj-racun/narudzbe`; drugi kupac je ne vidi
- [ ] Odbijena kartica `4000 0000 0000 0002` prikaže grešku, a narudžba nije plaćena (plaćanje „Neuspješno”);
      ponovni pokušaj s `4242…` u istom obrascu je označi plaćenom
- [ ] Admin promijeni status narudžbe (npr. „Poslano”) i kupac vidi novi status
- [ ] Footer prikazuje kontakt i poveznice na sve četiri pravne stranice

## 13. Prelazak na pravu prodaju (live)

**Pitaj čovjeka prije ovog koraka** i provjeri da su pravne stranice ispunjene, a Stripe račun aktiviran (podaci
o tvrtki, bankovni račun). Zatim:

1. Stripe isključi test mode → Developers → API keys: live Publishable key (`pk_live_…`) i live Secret key u
   Vercel varijable (zamijene test ključeve).
2. Napravi **novi** webhook endpoint u live modu (korak 11) i njegov `whsec_…` stavi u Vercel.
3. Redeploy, pa jedna stvarna mala kupnja i povrat novca (refund) u Stripeu — plaćanje narudžbe prelazi u „Povrat”. (Povrat ne vraća zalihu automatski — ispravi je u
   administraciji.)

## Česte greške

| Simptom | Uzrok i rješenje |
| ------- | ---------------- |
| Početna je prazna, u terminalu `[catalog] … fetch failed` | Krivi `NEXT_PUBLIC_SUPABASE_URL` ili ključ, ili migracije nisu primijenjene (korak 4). |
| `permission denied for table …` | Nedostaje grant ili RLS pravilo. Provjeri da je `…0003_rls.sql` pokrenut. Za novu tablicu dodaj grant + pravila u novoj migraciji. |
| `/admin` vraća na početnu | Korisnik nije admin — korak 7, pa se odjavi i prijavi. |
| „Online plaćanje još nije postavljeno” | Stripe ključevi nedostaju ili su još `REPLACE_ME`. Nakon izmjene `.env.local` ponovno pokreni `npm run dev`; na Vercelu Redeploy. |
| Plaćanje prođe, a narudžba ostane „Čeka plaćanje” | Webhook ne stiže: lokalno pokreni `stripe listen`; na produkciji provjeri URL endpointa i da je `STRIPE_WEBHOOK_SECRET` iz **istog** endpointa (i istog moda: test/live). Otvaranje stranice uspjeha također potvrđuje plaćanje. |
| Webhook vraća `400 Invalid signature` | Krivi `whsec_` (npr. lokalni na produkciji). |
| E-mail za potvrdu računa ne stiže | Ugrađeni Supabase e-mail ima malo poruka na sat; pričekaj ili postavi SMTP (korak 6). Provjeri spam. |
| Poveznica iz e-maila vodi na `localhost` | Site URL / Redirect URLs u Supabaseu (korak 6 i 10). |
| Slika se ne učitava (`hostname is not configured`) | Slike moraju biti iz Supabase Storagea ili `/public`. Za drugu domenu dodaj je u `images.remotePatterns` u `next.config.ts`. |
| Učitavanje slike javlja grešku | Slika veća od 5 MB ili nije JPG/PNG/WebP/AVIF/GIF. |
| `supabase db push` traži lozinku | To je lozinka baze iz koraka 3 — upisuje je čovjek (može je resetirati u Project Settings → Database). |

## Opcionalno: e-mail potvrde narudžbe

Nije u osnovi projekta (traži račun kod pružatelja e-maila — **pitaj čovjeka**). Preporuka: [Resend](https://resend.com).

1. `npm install resend`, dodaj `RESEND_API_KEY` i `ORDER_EMAIL_FROM` (npr. `Trgovina <narudzbe@tvoja-domena.hr>`) u
   `.env.local`, `.env.example` (samo zamjenske vrijednosti) i Vercel. Domenu pošiljatelja potvrdi u Resendu.
2. Napravi `src/lib/email/order-confirmation.ts` (`import 'server-only'`) koji iz baze (service klijent) učita
   narudžbu s `order_items` i pošalje e-mail kupcu (`orders.email`) i po želji trgovini
   (`store_settings.contact_email`).
3. Pozovi ga na mjestu označenom `// HOOK:` u `src/lib/shop/payments.ts` (funkcija `confirmPaidOrder`). To mjesto
   se izvršava **točno jednom po narudžbi**, bez obzira na to stigne li prvo webhook ili kupac na stranicu uspjeha.
   Grešku e-maila uhvati (`try/catch`) i zapiši u log — neuspješan e-mail ne smije srušiti potvrdu plaćanja.
4. Nakon toga promijeni tekst na `/naplata/uspjeh` da spominje e-mail potvrdu.

## Opcionalno: dodatni načini plaćanja

PaymentIntent koristi `automatic_payment_methods`, pa se dodatni načini (Apple Pay, Google Pay, Link, ostali koje
Stripe podržava za EUR) uključuju u **Stripe Dashboard → Settings → Payment methods**, bez promjene koda. Za Apple
Pay na produkciji treba potvrditi domenu u istim postavkama. Plaćanje pouzećem ili bankovnom uplatom nije
podržano u osnovi; dodaje se kao novi način dostave/plaćanja s narudžbom koja ostaje u statusu „Čeka plaćanje”.

## 14. Opcionalno: lokalna Supabase baza (Docker)

Za razvoj bez cloud projekta: pokreni Docker Desktop, pa

```bash
npx supabase start      # prvi put preuzima Docker slike (nekoliko minuta)
npx supabase db reset   # migracije + seed
```

Lokalna baza koristi portove 55421 (API) i 55423 (Studio), da se ne sudara s drugim lokalnim Supabase projektima.
`npx supabase status` ispiše lokalni URL i ključeve za `.env.local`. Zaustavljanje: `npx supabase stop`.
