# AGENT-SETUP — postavljanje trgovine korak po korak

Ova datoteka je pisana za **AI agenta** (Cursor, Claude Code, Codex…) koji vlasniku trgovine (u daljnjem tekstu
„čovjek”) pomaže postaviti projekt na njegov Vercel račun. Radi korake redom. Na kraju svakog koraka je
**Provjera**: ne idi dalje dok provjera ne prođe.

## 0. Pravila za agenta (obavezno)

1. **Pitaj čovjeka prije svega što košta novac ili ide uživo**: plaćeni Vercel / Neon / Resend plan, kupnja
   domene, ugovor s GLS-om, BOX NOW-om ili Teyom, Stripe live ključevi, objava na pravoj domeni, slanje e-maila
   pravim kupcima, prava pošiljka. Objasni što će se dogoditi i pričekaj izričito „da”.
2. **Prijave radi čovjek.** Ne upisuj njegove lozinke. Kad treba prijava (Vercel, Stripe, GitHub, GLS, BOX NOW,
   Teya, Resend), zamoli ga da se prijavi sam u pregledniku ili terminalu.
3. **Tajne ključeve nikad ne ispisuj u chat, ne stavljaj u kod i ne commitaj.** Upisuju se samo u `.env.local`
   (lokalno, u `.gitignore`) i u Vercel → Environment Variables. `.env.example` sadrži samo zamjenske vrijednosti i
   takav ostaje. Podaci trgovca (IBAN, primatelj, adresa skladišta, GLS broj klijenta, BOX NOW partner ID, Teya
   ID-jevi) također idu samo u env ili u Admin → Postavke, nikad u kod.
4. Ne isključuj provjere da bi build prošao (`ignoreBuildErrors`, `// @ts-ignore`, brisanje provjere uloge).
   Popravi uzrok.
5. Baza: mijenjaj je samo kroz `src/db/schema.ts` + `npm run db:generate` (nova datoteka u `drizzle/`). Vidi
   [DATABASE-SETUP.md](./DATABASE-SETUP.md), korak 7.
6. Kad nisi siguran, pitaj čovjeka jedno konkretno pitanje s ponuđenim opcijama.

## 1. Preduvjeti

Čovjek treba: **Node.js 20.9 ili noviji**, **Git**, besplatni [Vercel](https://vercel.com) račun, GitHub račun.
Agent instalira Vercel CLI: `npm i -g vercel`. Opcionalno: [Stripe CLI](https://docs.stripe.com/stripe-cli).

**Provjera**

```bash
node -v      # v20.9 ili više
git --version
vercel --version
```

## 2. Instalacija

```bash
npm install
```

**Provjera:** `npm run typecheck` i `npm test` završe bez grešaka.

## 3. Vercel projekt, baza i slike

1. Čovjek napravi **privatni** GitHub repozitorij i pushne projekt (provjeri `git status`: nema `.env.local`).
2. Vercel → **Add New → Project** → uvezi repozitorij (prvi deploy smije pasti dok nema baze).
3. Lokalno: `vercel link` (prijavu radi čovjek).
4. Vercel → projekt → **Storage**: dodaj **Neon** bazu (regija EU Frankfurt) i **Blob** spremište, oba povezana sa
   svim okruženjima. Besplatni planovi su dovoljni; ako se traži plaćanje — stani i pitaj.

Detalji: [DATABASE-SETUP.md](./DATABASE-SETUP.md), koraci 1 i 6.

**Provjera:** `vercel env ls` prikazuje `DATABASE_URL`, `DATABASE_URL_UNPOOLED` i `BLOB_READ_WRITE_TOKEN`
(vrijednosti ne ispisuj).

## 4. Varijable okruženja

```bash
vercel env pull .env.local
```

Dodaj u `.env.local` i u Vercel (Production + Preview + Development, osim gdje piše drugačije):

| Varijabla | Vrijednost |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | lokalno `http://localhost:3000`; na Vercelu prava adresa bez `/` na kraju |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` — različit za produkciju i lokalno |
| `ADMIN_EMAILS` | e-mail vlasnika (više adresa odvoji zarezom) |
| `BANK_IBAN`, `BANK_RECIPIENT_NAME`, `BANK_RECIPIENT_STREET`, `BANK_RECIPIENT_CITY` | podaci za uplatu — pitaj čovjeka, **prepiši točno** |

Ostale varijable (Stripe, GLS, BOX NOW, Teya, e-mail) su u `.env.example` i [INTEGRATIONS.md](./INTEGRATIONS.md).
Bez njih trgovina radi; njihovi moduli su samo isključeni.

**Provjera:** `.env.local` postoji, `git status` ga ne prikazuje.

## 5. Baza: migracije i početni podaci

```bash
npm run db:migrate
npm run db:seed            # ili: npm run db:seed -- --no-demo
```

Seed upiše postavke trgovine, pet načina dostave (dostava na adresu, osobno preuzimanje, GLS adresa, GLS paketomat,
BOX NOW) i, osim s `--no-demo`, 3 kategorije, 8 proizvoda s varijantama i jednu blog objavu.

**Provjera:** `npm run dev`, pa http://localhost:3000/api/health → `ok: true`, `database: "ok"`. Početna prikazuje
demo proizvode.

## 6. Prvi administrator

Čovjek se registrira na `/registracija` e-mailom iz `ADMIN_EMAILS`. Prava administratora dobije automatski.

**Provjera:** `/admin` se otvara. **Admin → Pregled → Moduli** prikazuje „Uplata na račun” ✅, a Stripe / GLS /
BOX NOW s ⚠ i popisom ključeva koji nedostaju (to je u redu dok ih ne postaviš). Korisnik koji nije u
`ADMIN_EMAILS` s `/admin` završi na početnoj.

## 7. Postavke trgovine, dostava, sadržaj

U **Admin → Postavke**: naziv trgovine, opis, kontakt e-mail, telefon, adresa (podnožje, Kontakt, pravne stranice),
naslov i podnaslov na početnoj, načini dostave (cijena, prag za besplatnu dostavu, najveći iznos, države).

Zatim u **Admin → Kategorije**, **Admin → Proizvodi** i **Admin → Blog** zamijeni demo sadržaj pravim (slike se
učitavaju u Vercel Blob, do 5 MB).

Pravne stranice (`src/app/(shop)/uvjeti-kupnje`, `privatnost`, `kolacici`, `jednostrani-raskid-ugovora`): pronađi
sve oznake `[UPIŠI …]` (`rg "Fill>" src/app`) i zamoli čovjeka za točne podatke (naziv tvrtke, OIB, adresa,
načini plaćanja i dostave, rokovi). **Ne izmišljaj pravne podatke.** Kad su tekstovi provjereni, u
`src/config/site.ts` postavi `showLegalTemplateNotice: false`.

**Provjera:** `rg -c "Fill>" src/app` vraća samo datoteke koje je čovjek svjesno ostavio za kasnije.

## 8. Plaćanja i dostava

Postavi module koje čovjek želi, svaki prema [INTEGRATIONS.md](./INTEGRATIONS.md):

- **Stripe** (test mod) — preporučeno za početak;
- **GLS** i/ili **BOX NOW** — traže ugovor (pitaj);
- **Teya** — samo ako čovjek ima ugovor; uključi u `src/config/modules.ts`;
- **E-mailovi o narudžbi** (Resend) — uključi u `src/config/modules.ts`; potrebni i za zaboravljenu lozinku.

Modul koji ne treba isključi (`enabled: false`), da ne stoji ⚠ u pregledu.

**Provjera:** Admin → Pregled prikazuje ✅ za svaki modul koji je čovjek odabrao.

## 9. Objava

1. U Vercelu provjeri varijable iz koraka 4 (na Productionu `NEXT_PUBLIC_APP_URL` = produkcijska adresa).
2. Produkcijska baza je ista Neon baza (ili njezina grana, ako je čovjek tako odabrao) — migracije: `npm run
   db:migrate` s produkcijskim URL-om (DATABASE-SETUP.md, korak 7).
3. Redeploy.
4. Vlastita domena (opcionalno; **pitaj prije kupnje**): Vercel → Settings → Domains, DNS zapisi kako Vercel kaže,
   pa `NEXT_PUBLIC_APP_URL` = domena (i `ADDITIONAL_TRUSTED_ORIGINS` za `www` varijantu) i Redeploy.
5. Stripe produkcijski webhook (INTEGRATIONS.md → Stripe, korak 4).

**Provjera:** `https://<adresa>/api/health` → `ok: true`; početna i `/prijava` rade.

## 10. Završna provjera (lokalno i na produkciji)

- [ ] Početna, kategorija, popis proizvoda, stranica proizvoda i `/blog` se otvaraju
- [ ] Proizvod s varijantama: odaberi veličinu/boju, dodaj u košaricu; košarica ostaje nakon osvježavanja
- [ ] Naplata nudi samo spremne načine plaćanja i dostave
- [ ] **Virman:** narudžba kao gost → „Hvala” s barkodom; u `/admin/orders` je „Čeka uplatu”, zaliha je smanjena;
      „Označi plaćeno” → „Plaćeno”
- [ ] **Stripe:** kartica `4242 4242 4242 4242` → „Plaćeno”; `4000 0000 0000 0002` → greška, nije plaćeno
- [ ] Otkazivanje neplaćene narudžbe vraća zalihu
- [ ] Prijavljeni kupac vidi svoju narudžbu u `/moj-racun/narudzbe`; drugi kupac je ne vidi
- [ ] GLS / BOX NOW (ako su uključeni): odabir paketomata na naplati, izrada pošiljke i naljepnica u administraciji
- [ ] Admin promijeni status u „Poslano” i kupac vidi novi status (i e-mail, ako je uključen)
- [ ] Podnožje prikazuje kontakt i sve četiri pravne stranice

## 11. Prelazak na pravu prodaju

**Pitaj čovjeka prije ovog koraka** i provjeri da su pravne stranice ispunjene, a podaci za uplatu točni. Zatim:

1. Stripe live ključevi i novi live webhook (INTEGRATIONS.md).
2. `GLS_MODE=production`, BOX NOW produkcijski pristup, Teya produkcijski URL (ako se koriste).
3. Redeploy, jedna stvarna mala kupnja i povrat novca. Obriši probne narudžbe i demo proizvode.

## Česte greške

| Simptom | Uzrok i rješenje |
| --- | --- |
| Početna prazna, u terminalu `[catalog] …` | Baza nije dostupna ili migracije nisu primijenjene. `/api/health` kaže što nedostaje; DATABASE-SETUP.md → Česte greške. |
| `/admin` vraća na početnu | Korisnik nije administrator: provjeri `ADMIN_EMAILS` (točan e-mail), odjavi se i prijavi. |
| `/admin` vraća na `/prijava` | Korisnik nije prijavljen ili je kolačić istekao. |
| Modul ima ⚠ iako je ključ upisan | Vrijednost je još `REPLACE_ME`, ili nakon izmjene `.env.local` nisi ponovno pokrenuo `npm run dev` (na Vercelu: Redeploy). |
| Plaćanje prođe, narudžba ostane „Čeka uplatu” | Stripe webhook ne stiže: lokalno `stripe listen`; na produkciji URL endpointa i `STRIPE_WEBHOOK_SECRET` iz **istog** endpointa i moda. |
| Webhook vraća `400` | Krivi `whsec_` (npr. lokalni na produkciji). |
| Barkod se ne prikazuje | Modul virmana nije spreman (`BANK_*`). |
| „Testno okruženje: stvarno slanje je isključeno” | Namjerno izvan produkcije — INTEGRATIONS.md → Zaštita od stvarnih akcija. |
| Slika se ne učitava (`hostname is not configured`) | Slike moraju biti iz Vercel Bloba ili `/public`. Za drugu domenu dodaj je u `images.remotePatterns` u `next.config.ts`. |
| Upload slike javlja grešku | Nema `BLOB_READ_WRITE_TOKEN`, slika veća od 5 MB ili nije JPG/PNG/WebP/AVIF/GIF. |
| „Zaboravljena lozinka” kaže da se javiš trgovini | E-mail modul je isključen (INTEGRATIONS.md → E-mailovi). |
