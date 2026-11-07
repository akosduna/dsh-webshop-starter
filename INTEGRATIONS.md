# INTEGRATIONS — plaćanja, dostava i e-mail

Svaka integracija je modul u `src/config/modules.ts`. Modul se koristi tek kad je uključen **i** kad su postavljeni
svi njegovi ključevi; stanje vidiš u **Admin → Pregled** (✅ / ⚠ nedostaju ključevi: … / ⏸ isključeno).
Ključevi idu u `.env.local` i u Vercel → Settings → Environment Variables, nikad u kod. Nakon promjene ključeva:
lokalno ponovno pokreni `npm run dev`, na Vercelu **Redeploy**.

> Pravilo za agenta: otvaranje računa, ugovori s dostavnom službom ili bankom, live ključevi i sve što naplaćuje
> novac radi **čovjek**, nakon što ga pitaš. Ti mu kažeš gdje kliknuti i provjeriš rezultat.

Uključivanje i isključivanje: u `src/config/modules.ts` promijeni `enabled` i objavi novu verziju.

## Zaštita od stvarnih akcija izvan produkcije

Izrada pošiljaka (GLS produkcija, BOX NOW) i slanje e-mailova rade samo na Vercel **produkciji**
(`VERCEL_ENV=production`). Lokalno i na Preview okruženju administracija javlja „Testno okruženje: stvarno slanje je
isključeno”. Iznimke:

- `GLS_MODE=test` (GLS testni API) radi svugdje;
- `PREVIEW_EMAIL_ALLOWLIST` — adrese koje i izvan produkcije smiju primati e-mail;
- `ALLOW_LIVE_SIDE_EFFECTS=true` sve dopušta (samo svjesno, nikad na Preview).

---

## Uplata na račun (virman, HUB-3 barkod)

Zadano uključeno. Kupac nakon narudžbe dobije iznos, IBAN, primatelja, model, poziv na broj i **PDF417 barkod** koji
skeniraju aplikacije hrvatskih banaka. Isti podaci su na stranici narudžbe u korisničkom računu (i u e-mailu, ako je
e-mail modul uključen).

| Varijabla | Što je |
| --- | --- |
| `BANK_IBAN` | IBAN računa trgovine |
| `BANK_RECIPIENT_NAME` | naziv primatelja (tvrtka / obrt), do 25 znakova u barkodu |
| `BANK_RECIPIENT_STREET` | ulica i broj |
| `BANK_RECIPIENT_CITY` | poštanski broj i mjesto, npr. `10000 Zagreb` |
| `BANK_PAYMENT_MODEL` | model plaćanja, zadano `HR00` |
| `BANK_REFERENCE_TEMPLATE` | poziv na broj, zadano `0-{year}-{orderNumber}` |
| `BANK_TRANSFER_RESERVATION_DAYS` | koliko dana neplaćena narudžba drži zalihu, zadano 7 |

Tijek:

1. Narudžba nastaje sa statusom **„Čeka uplatu”**, a zaliha se odmah rezervira.
2. Kad uplata stigne na račun, administrator u **Admin → Narudžbe → narudžba** klikne **„Označi plaćeno”**.
3. **„Otkaži narudžbu”** vraća zalihu (jednom, ma koliko puta se kliknulo).
4. **Admin → Narudžbe → „Otkaži neplaćene virmane”** otkazuje sve neplaćene virmane starije od
   `BANK_TRANSFER_RESERVATION_DAYS` dana i vraća zalihu. Ne radi automatski — pokreće ga administrator.

**Provjera:** probna narudžba s „Uplata na račun” → stranica „Hvala” prikazuje barkod. Skeniraj ga aplikacijom banke
(ne potvrđuj plaćanje): primatelj, IBAN, iznos i poziv na broj moraju biti točni.

---

## Stripe (kartice, Apple Pay, Google Pay)

Zadano uključeno.

1. Čovjek otvori [Stripe](https://stripe.com) račun i ostane u **test modu**.
2. Developers → API keys: `pk_test_…` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `sk_test_…` → `STRIPE_SECRET_KEY`.
3. Lokalni webhook (Stripe CLI, u drugom terminalu):

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook \
     --events payment_intent.succeeded,payment_intent.payment_failed,charge.refunded
   ```

   Ispisani `whsec_…` → `STRIPE_WEBHOOK_SECRET`.
4. Produkcija: Stripe → Developers → **Webhooks** → Add endpoint `https://<adresa>/api/stripe/webhook`, isti
   događaji, Signing secret u Vercel.

Iznos se uvijek računa na serveru iz baze. Narudžba postaje plaćena i zaliha se smanjuje **točno jednom**, bez
obzira na to stigne li prvo webhook ili kupac na stranicu „Hvala” (red narudžbe se zaključava u transakciji).
Povrat novca (refund) u Stripeu mijenja plaćanje u „Povrat”; zalihu tada ispravi ručno.

**Provjera:** kartica `4242 4242 4242 4242`, bilo koji budući datum i CVC → narudžba je „Plaćeno”;
`4000 0000 0000 0002` → greška, narudžba nije plaćena.

Live: **pitaj čovjeka**, aktivirani Stripe račun, live Publishable i Secret key u Vercel, novi live webhook
endpoint.

---

## Teya SecurePay (kartice)

Zadano **isključeno**. Uključi `teya.enabled` u `src/config/modules.ts` kad čovjek ima ugovor s Teyom.

| Varijabla | Što je |
| --- | --- |
| `TEYA_MERCHANT_ID` | Merchant ID iz Teye |
| `TEYA_PAYMENT_GATEWAY_ID` | Payment Gateway ID |
| `TEYA_SECRET_KEY` | tajni ključ za potpis (HMAC-SHA256) |
| `TEYA_API_URL` | test: `https://test.borgun.is/SecurePay/default.aspx`, produkcijski URL daje Teya |
| `TEYA_CURRENCY`, `TEYA_LANGUAGE` | zadano `EUR`, `HR` |
| `TEYA_ORDER_PREFIX` | dva slova ispred broja narudžbe (Teya OrderId ima 12 znakova) |

Tijek: naplata napravi potpisani obrazac i preusmjeri kupca na Teya stranicu. Teya javlja rezultat na
`/api/teya/notify` (server-server, mjerodavno) i vraća kupca na `/api/teya/success`, `/cancel` ili `/error`.
Narudžba se označava plaćenom samo kad je potpis (`orderhash`) ispravan i iznos odgovara narudžbi; ponovljene
obavijesti ne mijenjaju ništa. Kupac koji odustane može pokušati ponovno sa stranice narudžbe.

Lokalno: Teya ne prihvaća `localhost`, pa se povratne adrese pretvaraju u `lvh.me`; `notify` lokalno treba tunel
(npr. ngrok). Testne kartice su u [Teya dokumentaciji](https://podrska.teya.com/hc/hr-hr/articles/29642942971793).

---

## GLS (dostava na adresu i paketomati / ParcelShop)

Zadano uključeno. Treba ugovor s GLS-om i MyGLS pristup.

| Varijabla | Što je |
| --- | --- |
| `GLS_USERNAME`, `GLS_PASSWORD` | MyGLS korisnik i lozinka (API) |
| `GLS_CLIENT_NUMBER` | GLS broj klijenta |
| `GLS_MODE` | `test` (testni API) ili `production` |
| `GLS_SENDER_NAME`, `GLS_SENDER_STREET`, `GLS_SENDER_HOUSE_NUMBER`, `GLS_SENDER_CITY`, `GLS_SENDER_ZIP`, `GLS_SENDER_COUNTRY` | adresa preuzimanja (skladište) |
| `GLS_SENDER_CONTACT_NAME`, `GLS_SENDER_PHONE`, `GLS_SENDER_EMAIL` | kontakt pošiljatelja |
| `GLS_PRINTER_TYPE` | format naljepnice, zadano `A4_2x2` |

U trgovini: načini dostave „GLS dostava na adresu” i „GLS paketomat ili ParcelShop” (kupac odabire točku na GLS
karti). U administraciji, na plaćenoj narudžbi: **„Izradi GLS pošiljku”**, **„Naljepnica (PDF)”**, **„Osvježi
praćenje”** (kad GLS javi dostavu, narudžba postaje „Dostavljeno”), **„Poništi pošiljku”**. Kupac u računu vidi
poveznicu za praćenje.

**Provjera:** s `GLS_MODE=test` izradi pošiljku na plaćenoj probnoj narudžbi i otvori naljepnicu.

---

## BOX NOW (paketomati)

Zadano uključeno. Treba partnerski ugovor s BOX NOW-om.

| Varijabla | Što je |
| --- | --- |
| `BOXNOW_CLIENT_ID`, `BOXNOW_CLIENT_SECRET` | API pristup |
| `BOXNOW_PARTNER_ID` | partner ID (koristi ga i karta za odabir paketomata) |
| `BOXNOW_WAREHOUSE_ID` | ID mjesta preuzimanja (skladište) |
| `BOXNOW_WEBHOOK_SECRET` | tajna za potpis webhooka |
| `BOXNOW_API_URL` | sandbox URL za testiranje (prazno = produkcija) |
| `BOXNOW_COMPARTMENT_SIZE` | 1 mali, 2 srednji, 3 veliki pretinac |
| `BOXNOW_CONTACT_PHONE`, `BOXNOW_CONTACT_EMAIL` | kontakt pošiljatelja (prazno = iz Admin → Postavke) |

U trgovini: „BOX NOW paketomat” s kartom za odabir. Zadani najveći iznos narudžbe za taj način je 200 € (uređuje se u
Postavkama). U administraciji: **„Izradi BOX NOW pošiljku”** i naljepnica.

Webhook: u BOX NOW partner portalu postavi `https://<adresa>/api/boxnow/webhook`. Zahtjev mora imati
`datasignature` = HMAC-SHA256 (hex ili base64) s `BOXNOW_WEBHOOK_SECRET`; bez ispravnog potpisa vraća `401`. Događaj
`delivered` mijenja narudžbu u „Dostavljeno” (ručna promjena u administraciji ima prednost).

---

## Dostava po fiksnoj cijeni i osobno preuzimanje

Bez ključeva. Cijena, prag za besplatnu dostavu, najveći iznos narudžbe i države (za dostavu na adresu) uređuju se u
**Admin → Postavke → Načini dostave**. Seed napravi svih pet načina; GLS i BOX NOW se kupcu prikazuju tek kad su
njihovi moduli spremni.

---

## Vercel Blob (slike)

Vidi [DATABASE-SETUP.md](./DATABASE-SETUP.md), korak 6. Ključ: `BLOB_READ_WRITE_TOKEN`.

---

## E-mailovi o narudžbi (Resend)

Zadano **isključeno**. [Resend](https://resend.com) ima besplatni plan; **pitaj čovjeka** prije otvaranja računa i
potvrde domene.

1. Resend → Domains: dodaj domenu trgovine i DNS zapise koje traži.
2. API Keys → novi ključ → `RESEND_API_KEY`.
3. `EMAIL_FROM`, npr. `Moja trgovina <narudzbe@moja-trgovina.hr>` (domena mora biti potvrđena); po želji
   `EMAIL_REPLY_TO`.
4. U `src/config/modules.ts` postavi `order_emails.enabled = true`.

Šalju se (svaki najviše jednom po narudžbi, zapisano u `order_emails`):

- **zaprimljeno i plaćeno**, kartična narudžba;
- **upute za uplatu** s podacima i barkodom, virman;
- **plaćeno**, kad administrator označi virman plaćenim;
- **poslano**, kad narudžba dobije status „Poslano”, s poveznicom za praćenje.

Isti modul šalje i e-mail za **zaboravljenu lozinku**. Dok je isključen, stranica „Zaboravljena lozinka” kupcu
kaže da se javi trgovini.

Neuspješan e-mail nikad ne ruši narudžbu ni potvrdu plaćanja; greška se vidi u logu i u tablici `order_emails`.
Drugi pružatelj: zamijeni tijelo funkcije `sendEmail()` u `src/lib/email/send.ts`.

---

## Što se ne može provjeriti bez pravih računa

Bez ugovora i ključeva ne mogu se isprobati: stvarno Stripe plaćanje i webhook, Teya stranica i `notify`, izrada
GLS / BOX NOW pošiljke i naljepnice, BOX NOW karta (traži partner ID), GLS praćenje, slanje e-maila, upload u Blob.
Logika oko njih (potpisi, iznosi, statusi, idempotentnost) pokrivena je unit testovima (`npm test`).
