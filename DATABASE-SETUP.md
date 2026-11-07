# DATABASE-SETUP — baza, prijava i slike

Trgovina koristi **Neon Postgres** (preko Vercel Marketplacea), **Drizzle ORM** za shemu i upite, **Better Auth**
za prijavu (iste baze) i **Vercel Blob** za slike. Shema je u kodu (`src/db/schema.ts`), a SQL migracije koje iz nje
nastaju su u mapi `drizzle/` i commitaju se.

Pristup podacima kontrolira kod, ne baza: administratorske akcije, rute i layout administracije provjeravaju ulogu
(`requireAdmin()` / `assertAdmin()` u `src/lib/auth/server.ts`), a korisnik vidi samo svoje narudžbe i adrese.

## 1. Neon baza preko Vercela

Pretpostavka: projekt je povezan s Vercelom (`vercel link`, prijavu radi čovjek).

1. Vercel → projekt → **Storage** → **Create Database** → **Neon** (Marketplace).
2. Regija: **EU (Frankfurt, `eu-central-1`)** — zbog GDPR-a i brzine za kupce u Hrvatskoj.
3. Besplatni plan je dovoljan za početak. **Ako Neon ili Vercel traži plaćeni plan — stani i pitaj čovjeka.**
4. Poveži bazu sa svim okruženjima (Development, Preview, Production).

Vercel sam doda varijable `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direktna veza) i još nekoliko `PG*`
varijabli.

## 2. Varijable lokalno

```bash
vercel env pull .env.local
```

Zatim u `.env.local` dodaj (ako još nisu u Vercelu):

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=<openssl rand -base64 32>
ADMIN_EMAILS=vlasnik@primjer.hr
```

Iste tri varijable dodaj i u Vercel → Settings → Environment Variables (na Vercelu `NEXT_PUBLIC_APP_URL` je prava
adresa, npr. `https://moja-trgovina.vercel.app`, bez `/` na kraju). `BETTER_AUTH_SECRET` neka bude različit za
produkciju i lokalni razvoj; promjena odjavljuje sve korisnike.

## 3. Migracije i početni podaci

```bash
npx drizzle-kit migrate    # isto što i: npm run db:migrate
npm run db:seed            # postavke, 5 načina dostave, demo katalog i jedna blog objava
npm run db:seed -- --no-demo   # samo postavke i načini dostave
```

`drizzle.config.ts` čita `.env.local` (kao Next.js) i za migracije koristi `DATABASE_URL_UNPOOLED`, a ako ga nema,
`DATABASE_URL`. Seed se smije pokrenuti više puta: ne prepisuje ništa što je već u bazi.

**Provjera:** `npm run dev`, pa http://localhost:3000/api/health — `database: "ok"`, sve tablice `present: true`.

## 4. Tablice

Prijava (Better Auth): `user`, `session`, `account`, `verification`, plus `user_roles` (uloga `admin`).

Trgovina: `store_settings`, `categories`, `products`, `product_images`, `product_variants`, `shipping_methods`,
`orders`, `order_items`, `shipments`, `shipment_events`, `order_emails`, `customer_profiles`, `addresses`,
`blog_posts`.

Better Auth ima vlastitu vezu na bazu (`pg` Pool u `src/lib/auth/auth.ts`), odvojenu od Drizzle veze trgovine
(`src/db/index.ts`). To je namjerno — ne spajaj ih.

## 5. Prvi administrator

1. U `ADMIN_EMAILS` upiši e-mail vlasnika (više adresa odvoji zarezom).
2. Vlasnik se registrira na `/registracija` tim e-mailom.
3. Kod prvog otvaranja stranice nakon prijave upisuje se redak u `user_roles` s ulogom `admin`.

Dodatni administrator bez mijenjanja env varijabli (SQL, u Neon konzoli ili `npm run db:studio`):

```sql
insert into user_roles (user_id, role)
select id, 'admin' from "user" where email = 'kolega@primjer.hr'
on conflict do nothing;
```

**Provjera:** `/admin` se otvara, a na `/moj-racun` je poveznica „Administracija”. Korisnik koji nije administrator
s `/admin` se vraća na početnu.

## 6. Slike (Vercel Blob)

1. Vercel → projekt → **Storage** → **Create** → **Blob**, poveži sa svim okruženjima.
2. `vercel env pull .env.local` doda `BLOB_READ_WRITE_TOKEN`.

Slike proizvoda i bloga šalju se iz preglednika izravno u Blob, preko rute `/api/admin/upload` koja dopušta samo
administratore i samo slike (JPG, PNG, WebP, AVIF, GIF, do 5 MB). Bez tokena trgovina radi, ali administracija javlja
da se slike ne mogu učitavati. Demo slike su u `public/demo/`.

## 7. Promjena sheme

1. Promijeni `src/db/schema.ts` (nova tablica, stupac, indeks).
2. `npm run db:generate` — nastane nova datoteka u `drizzle/`. **Pročitaj SQL** prije primjene.
3. `npm run db:migrate` lokalno, provjeri aplikaciju.
4. Commitaj `schema.ts` i novu migraciju zajedno.
5. Produkcija: `npm run db:migrate` s produkcijskim URL-om (npr. `vercel env pull --environment=production
   .env.production.local` i `DATABASE_URL_UNPOOLED=… npx drizzle-kit migrate`) **prije** objave koda koji koristi
   novi stupac.

Pravila: migracije samo dodaju (novi stupac s `default` ili `null`). Brisanje ili preimenovanje stupca radi se u dva
koraka (prvo kod prestane koristiti stupac, tek onda migracija) — **pitaj čovjeka** prije bilo čega što briše podatke.
Ne mijenjaj stare datoteke u `drizzle/` nakon što su primijenjene.

## 8. Česte greške

| Greška | Uzrok i rješenje |
| --- | --- |
| `relation "…" does not exist` (kod **42P01**) | Migracije nisu primijenjene na ovu bazu. `npm run db:migrate` (provjeri da `.env.local` pokazuje na pravu bazu). |
| `column "…" does not exist` (kod **42703**) | Kod je noviji od baze: postoji migracija koja nije primijenjena. `npm run db:migrate`. Na produkciji migriraj prije objave. |
| `DATABASE_URL env var is required` | Nema `.env.local` ili nema varijable. `vercel env pull .env.local`. Na Vercelu provjeri da je baza povezana s okruženjem. |
| `BETTER_AUTH_SECRET env var is required` | Dodaj ga u `.env.local` i u Vercel. |
| Upozorenje o `sslmode` ili greška certifikata | Neon URL mora imati `sslmode=require`; kod ga sam pretvara u `verify-full`. Lokalni Docker Postgres radi bez `sslmode`. |
| Prvi zahtjev nakon pauze traje nekoliko sekundi | Neon na besplatnom planu uspava bazu nakon neaktivnosti (cold start). Prijava ima ponovne pokušaje; ostalo je samo sporije prvi put. Za stalnu brzinu isključi „Scale to zero” (može koštati — pitaj). |
| Prijava javlja „Invalid origin” | Adresa s koje se prijavljuješ nije na popisu: provjeri `NEXT_PUBLIC_APP_URL`, za vlastitu domenu dodaj `ADDITIONAL_TRUSTED_ORIGINS`. `*.vercel.app` je već dopušten. |
| `Connection terminated` / `ETIMEDOUT` | Mreža ne pušta TCP do Neona (npr. neki korporativni VPN). Postavi `USE_NEON_SERVERLESS_POOL=true` i `USE_NEON_SERVERLESS_AUTH_POOL=true` (WebSocket). |

## 9. Lokalna baza bez clouda (Docker)

```bash
docker run -d --name webshop-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=webshop -p 5432:5432 postgres:17
```

U `.env.local`: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webshop` (bez `sslmode`), pa
`npm run db:migrate` i `npm run db:seed`. Integracijski test plaćanja: `TEST_DATABASE_URL=<isti URL> npm test`.
