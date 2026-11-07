-- =============================================================================
-- Demo data (neutral). Safe to re-run: rows use fixed ids + ON CONFLICT.
-- Delete or replace with your own products before going live.
-- Prices are in cents: 1990 = 19,90 €.
-- =============================================================================

update public.store_settings
   set shop_name = 'Moja trgovina',
       tagline = 'Jednostavni proizvodi za svaki dan',
       contact_email = 'info@example.com',
       contact_phone = '+385 1 000 0000',
       address = 'Ulica primjera 1, 10000 Zagreb',
       hero_title = 'Dobrodošli u našu trgovinu',
       hero_subtitle = 'Pažljivo odabrani proizvodi, brza dostava i sigurno plaćanje karticom.'
 where id = 1;

insert into public.categories (id, name, slug, description, image_url, sort_order) values
  ('10000000-0000-4000-8000-000000000001', 'Odjeća', 'odjeca', 'Udobna odjeća za svaki dan.', '/demo/kategorija-odjeca.svg', 1),
  ('10000000-0000-4000-8000-000000000002', 'Dom', 'dom', 'Sitnice koje dom čine toplijim.', '/demo/kategorija-dom.svg', 2),
  ('10000000-0000-4000-8000-000000000003', 'Dodaci', 'dodaci', 'Praktični dodaci i pokloni.', '/demo/kategorija-dodaci.svg', 3)
on conflict (id) do nothing;

insert into public.products
  (id, category_id, name, slug, description, price_cents, sku, stock_quantity, option_names, is_featured, sort_order)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'Pamučna majica', 'pamucna-majica',
   'Klasična majica od 100 % pamuka. Mekana, prozračna i jednostavna za kombiniranje.',
   1990, 'MAJ-001', 0, '{Veličina,Boja}', true, 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   'Dukserica s kapuljačom', 'dukserica-s-kapuljacom',
   'Topla dukserica s kapuljačom i džepom sprijeda. Idealna za hladnije dane.',
   4490, 'DUK-001', 0, '{Veličina}', true, 2),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
   'Vunena kapa', 'vunena-kapa',
   'Pletena kapa od mekane vune. Jedna veličina odgovara većini.',
   1590, 'KAP-001', 25, '{}', false, 3),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002',
   'Keramička šalica', 'keramicka-salica',
   'Ručno glazirana šalica od 350 ml. Smije u perilicu posuđa.',
   1290, 'SAL-001', 40, '{}', true, 4),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002',
   'Mirisna svijeća', 'mirisna-svijeca',
   'Svijeća od sojinog voska s nježnim mirisom vanilije. Gori do 40 sati.',
   1490, 'SVI-001', 30, '{}', false, 5),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002',
   'Lanena kuhinjska krpa', 'lanena-kuhinjska-krpa',
   'Upijajuća krpa od lana. Trenutno nije dostupna — primjer proizvoda bez zalihe.',
   890, 'KRP-001', 0, '{}', false, 6),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000003',
   'Platnena torba', 'platnena-torba',
   'Čvrsta platnena torba za kupovinu i svakodnevno nošenje.',
   1190, 'TOR-001', 50, '{}', true, 7),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003',
   'Bilježnica A5', 'biljeznica-a5',
   'Bilježnica s točkastim stranicama i tvrdim koricama. Samo još nekoliko komada!',
   690, 'BIL-001', 3, '{}', false, 8)
on conflict (id) do nothing;

insert into public.product_images (id, product_id, url, alt, sort_order) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '/demo/majica.svg', 'Pamučna majica', 0),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '/demo/dukserica.svg', 'Dukserica s kapuljačom', 0),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '/demo/kapa.svg', 'Vunena kapa', 0),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '/demo/salica.svg', 'Keramička šalica', 0),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', '/demo/svijeca.svg', 'Mirisna svijeća', 0),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', '/demo/krpa.svg', 'Lanena kuhinjska krpa', 0),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007', '/demo/torba.svg', 'Platnena torba', 0),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000008', '/demo/biljeznica.svg', 'Bilježnica A5', 0)
on conflict (id) do nothing;

-- Variants: majica (veličina × boja), dukserica (veličina; XL skuplja)
insert into public.product_variants (id, product_id, name, options, sku, price_cents, stock_quantity, sort_order) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'S / Bijela', '{"Veličina": "S", "Boja": "Bijela"}', 'MAJ-001-S-BI', null, 10, 1),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'M / Bijela', '{"Veličina": "M", "Boja": "Bijela"}', 'MAJ-001-M-BI', null, 12, 2),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'L / Bijela', '{"Veličina": "L", "Boja": "Bijela"}', 'MAJ-001-L-BI', null, 0, 3),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'S / Crna', '{"Veličina": "S", "Boja": "Crna"}', 'MAJ-001-S-CR', null, 8, 4),
  ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'M / Crna', '{"Veličina": "M", "Boja": "Crna"}', 'MAJ-001-M-CR', null, 5, 5),
  ('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'L / Crna', '{"Veličina": "L", "Boja": "Crna"}', 'MAJ-001-L-CR', null, 6, 6),
  ('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'S', '{"Veličina": "S"}', 'DUK-001-S', null, 4, 1),
  ('40000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', 'M', '{"Veličina": "M"}', 'DUK-001-M', null, 7, 2),
  ('40000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000002', 'L', '{"Veličina": "L"}', 'DUK-001-L', null, 7, 3),
  ('40000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000002', 'XL', '{"Veličina": "XL"}', 'DUK-001-XL', 4790, 2, 4)
on conflict (id) do nothing;

insert into public.shipping_methods (id, name, description, type, price_cents, free_over_cents, sort_order) values
  ('50000000-0000-4000-8000-000000000001', 'Dostava na adresu', 'Isporuka u 2–4 radna dana na području Hrvatske.', 'delivery', 499, 5000, 1),
  ('50000000-0000-4000-8000-000000000002', 'Osobno preuzimanje', 'Preuzimanje u trgovini nakon obavijesti da je narudžba spremna.', 'pickup', 0, null, 2)
on conflict (id) do nothing;
