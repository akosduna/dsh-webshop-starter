/**
 * Seed: store settings, the five shipping methods and (unless --no-demo) a
 * neutral demo catalog + one blog post.
 *
 *   npm run db:seed            # settings + shipping + demo
 *   npm run db:seed -- --no-demo
 *
 * Safe to re-run: fixed ids + ON CONFLICT DO NOTHING, so it never overwrites
 * changes made in the admin. Prices are in cents (1990 = 19,90 €).
 */
import { loadEnvConfig } from '@next/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { normalizePgConnectionString } from '../src/lib/db-connection';
import * as schema from '../src/db/schema';

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL nije postavljen. Pokrenite `vercel env pull .env.local` (vidi DATABASE-SETUP.md).');
  process.exit(1);
}

const withDemo = !process.argv.includes('--no-demo');

const cat = (n: number) => `10000000-0000-4000-8000-00000000000${n}`;
const prod = (n: number) => `20000000-0000-4000-8000-00000000000${n}`;

async function main() {
  const pool = new Pool({ connectionString: normalizePgConnectionString(url!), max: 1 });
  const db = drizzle({ client: pool, schema });

  try {
    await db
      .insert(schema.storeSettings)
      .values({
        id: 1,
        shop_name: 'Moja trgovina',
        tagline: 'Jednostavni proizvodi za svaki dan',
        contact_email: 'info@example.com',
        contact_phone: '+385 1 000 0000',
        address: 'Ulica primjera 1, 10000 Zagreb',
        hero_title: 'Dobrodošli u našu trgovinu',
        hero_subtitle: 'Pažljivo odabrani proizvodi, brza dostava i sigurno plaćanje.',
      })
      .onConflictDoNothing();

    // Carrier methods are shown at checkout only when their module is ready (src/config/modules.ts).
    await db
      .insert(schema.shippingMethods)
      .values([
        {
          id: '50000000-0000-4000-8000-000000000001',
          name: 'Dostava na adresu',
          description: 'Isporuka u 2–4 radna dana na području Hrvatske.',
          type: 'delivery',
          price_cents: 499,
          free_over_cents: 5000,
          sort_order: 1,
        },
        {
          id: '50000000-0000-4000-8000-000000000002',
          name: 'Osobno preuzimanje',
          description: 'Preuzimanje u trgovini nakon obavijesti da je narudžba spremna.',
          type: 'pickup',
          price_cents: 0,
          sort_order: 2,
        },
        {
          id: '50000000-0000-4000-8000-000000000003',
          name: 'GLS dostava na adresu',
          description: 'GLS isporuka u 1–3 radna dana.',
          type: 'gls_address',
          price_cents: 499,
          free_over_cents: 5000,
          countries: ['HR'],
          sort_order: 3,
        },
        {
          id: '50000000-0000-4000-8000-000000000004',
          name: 'GLS paketomat ili ParcelShop',
          description: 'Preuzimanje u odabranom GLS paketomatu ili ParcelShopu.',
          type: 'gls_parcel',
          price_cents: 349,
          free_over_cents: 5000,
          sort_order: 4,
        },
        {
          id: '50000000-0000-4000-8000-000000000005',
          name: 'BOX NOW paketomat',
          description: 'Preuzimanje u odabranom BOX NOW paketomatu, 0–24 h.',
          type: 'boxnow',
          price_cents: 299,
          free_over_cents: 5000,
          max_subtotal_cents: 20000,
          sort_order: 5,
        },
      ])
      .onConflictDoNothing();

    if (withDemo) await seedDemo(db);
    console.log(withDemo ? 'Seed gotov (postavke, dostava, demo katalog, blog).' : 'Seed gotov (postavke, dostava).');
  } finally {
    await pool.end();
  }
}

async function seedDemo(db: ReturnType<typeof drizzle<typeof schema>>) {
  await db
    .insert(schema.categories)
    .values([
      { id: cat(1), name: 'Odjeća', slug: 'odjeca', description: 'Udobna odjeća za svaki dan.', image_url: '/demo/kategorija-odjeca.svg', sort_order: 1 },
      { id: cat(2), name: 'Dom', slug: 'dom', description: 'Sitnice koje dom čine toplijim.', image_url: '/demo/kategorija-dom.svg', sort_order: 2 },
      { id: cat(3), name: 'Dodaci', slug: 'dodaci', description: 'Praktični dodaci i pokloni.', image_url: '/demo/kategorija-dodaci.svg', sort_order: 3 },
    ])
    .onConflictDoNothing();

  const products = [
    { n: 1, c: 1, name: 'Pamučna majica', slug: 'pamucna-majica', description: 'Klasična majica od 100 % pamuka. Mekana, prozračna i jednostavna za kombiniranje.', price: 1990, sku: 'MAJ-001', stock: 0, options: ['Veličina', 'Boja'], featured: true, image: '/demo/majica.svg' },
    { n: 2, c: 1, name: 'Dukserica s kapuljačom', slug: 'dukserica-s-kapuljacom', description: 'Topla dukserica s kapuljačom i džepom sprijeda. Idealna za hladnije dane.', price: 4490, sku: 'DUK-001', stock: 0, options: ['Veličina'], featured: true, image: '/demo/dukserica.svg' },
    { n: 3, c: 1, name: 'Vunena kapa', slug: 'vunena-kapa', description: 'Pletena kapa od mekane vune. Jedna veličina odgovara većini.', price: 1590, sku: 'KAP-001', stock: 25, options: [], featured: false, image: '/demo/kapa.svg' },
    { n: 4, c: 2, name: 'Keramička šalica', slug: 'keramicka-salica', description: 'Ručno glazirana šalica od 350 ml. Smije u perilicu posuđa.', price: 1290, sku: 'SAL-001', stock: 40, options: [], featured: true, image: '/demo/salica.svg' },
    { n: 5, c: 2, name: 'Mirisna svijeća', slug: 'mirisna-svijeca', description: 'Svijeća od sojinog voska s nježnim mirisom vanilije. Gori do 40 sati.', price: 1490, sku: 'SVI-001', stock: 30, options: [], featured: false, image: '/demo/svijeca.svg' },
    { n: 6, c: 2, name: 'Lanena kuhinjska krpa', slug: 'lanena-kuhinjska-krpa', description: 'Upijajuća krpa od lana. Trenutno nije dostupna — primjer proizvoda bez zalihe.', price: 890, sku: 'KRP-001', stock: 0, options: [], featured: false, image: '/demo/krpa.svg' },
    { n: 7, c: 3, name: 'Platnena torba', slug: 'platnena-torba', description: 'Čvrsta platnena torba za kupovinu i svakodnevno nošenje.', price: 1190, sku: 'TOR-001', stock: 50, options: [], featured: true, image: '/demo/torba.svg' },
    { n: 8, c: 3, name: 'Bilježnica A5', slug: 'biljeznica-a5', description: 'Bilježnica s točkastim stranicama i tvrdim koricama. Samo još nekoliko komada!', price: 690, sku: 'BIL-001', stock: 3, options: [], featured: false, image: '/demo/biljeznica.svg' },
  ];

  await db
    .insert(schema.products)
    .values(
      products.map((p) => ({
        id: prod(p.n),
        category_id: cat(p.c),
        name: p.name,
        slug: p.slug,
        description: p.description,
        price_cents: p.price,
        sku: p.sku,
        stock_quantity: p.stock,
        option_names: p.options,
        is_featured: p.featured,
        sort_order: p.n,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(schema.productImages)
    .values(
      products.map((p) => ({
        id: `30000000-0000-4000-8000-00000000000${p.n}`,
        product_id: prod(p.n),
        url: p.image,
        alt: p.name,
        sort_order: 0,
      })),
    )
    .onConflictDoNothing();

  // Majica: Veličina × Boja; dukserica: Veličina (XL is more expensive).
  const variants: {
    p: number;
    name: string;
    options: Record<string, string>;
    sku: string;
    price: number | null;
    stock: number;
  }[] = [
    { p: 1, name: 'S / Bijela', options: { Veličina: 'S', Boja: 'Bijela' }, sku: 'MAJ-001-S-BI', price: null, stock: 10 },
    { p: 1, name: 'M / Bijela', options: { Veličina: 'M', Boja: 'Bijela' }, sku: 'MAJ-001-M-BI', price: null, stock: 12 },
    { p: 1, name: 'L / Bijela', options: { Veličina: 'L', Boja: 'Bijela' }, sku: 'MAJ-001-L-BI', price: null, stock: 0 },
    { p: 1, name: 'S / Crna', options: { Veličina: 'S', Boja: 'Crna' }, sku: 'MAJ-001-S-CR', price: null, stock: 8 },
    { p: 1, name: 'M / Crna', options: { Veličina: 'M', Boja: 'Crna' }, sku: 'MAJ-001-M-CR', price: null, stock: 5 },
    { p: 1, name: 'L / Crna', options: { Veličina: 'L', Boja: 'Crna' }, sku: 'MAJ-001-L-CR', price: null, stock: 6 },
    { p: 2, name: 'S', options: { Veličina: 'S' }, sku: 'DUK-001-S', price: null, stock: 4 },
    { p: 2, name: 'M', options: { Veličina: 'M' }, sku: 'DUK-001-M', price: null, stock: 7 },
    { p: 2, name: 'L', options: { Veličina: 'L' }, sku: 'DUK-001-L', price: null, stock: 7 },
    { p: 2, name: 'XL', options: { Veličina: 'XL' }, sku: 'DUK-001-XL', price: 4790, stock: 2 },
  ];

  await db
    .insert(schema.productVariants)
    .values(
      variants.map((v, i) => ({
        id: `40000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        product_id: prod(v.p),
        name: v.name,
        options: v.options,
        sku: v.sku,
        price_cents: v.price,
        stock_quantity: v.stock,
        sort_order: i + 1,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(schema.blogPosts)
    .values({
      id: '60000000-0000-4000-8000-000000000001',
      title: 'Kako odabrati savršenu šalicu',
      slug: 'kako-odabrati-savrsenu-salicu',
      excerpt: 'Veličina, materijal i oblik: tri stvari na koje vrijedi paziti prije kupnje.',
      content: [
        '<p>Dobra šalica je mala svakodnevna radost. Evo na što obratiti pažnju.</p>',
        '<h2>Veličina</h2>',
        '<p>Za espresso je dovoljno 80–100 ml, a za čaj ili kavu s mlijekom birajte 300–350 ml.</p>',
        '<h2>Materijal</h2>',
        '<ul><li><strong>Keramika</strong> dugo drži toplinu.</li><li><strong>Porculan</strong> je tanji i elegantniji.</li></ul>',
        '<p>Pogledajte našu <a href="/proizvodi/keramicka-salica">keramičku šalicu</a>.</p>',
      ].join(''),
      cover_image_url: '/demo/salica.svg',
      status: 'published',
      meta_description: 'Savjeti za odabir šalice: veličina, materijal i oblik.',
      published_at: new Date('2026-01-15T09:00:00Z'),
    })
    .onConflictDoNothing();
}

main().catch((error) => {
  console.error('Seed nije uspio:', error instanceof Error ? error.message : error);
  process.exit(1);
});
