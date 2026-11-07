import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ProductGrid } from '@/components/shop/product-card';
import { ProductImage } from '@/components/ui/product-image';
import { getCategoryTree, getProducts, getStoreSettings } from '@/lib/shop/catalog';

export default async function HomePage() {
  const [settings, categories, featured] = await Promise.all([
    getStoreSettings(),
    getCategoryTree(),
    getProducts({ featuredOnly: true, pageSize: 8 }),
  ]);

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-xl bg-accent px-6 py-16 sm:px-12 sm:py-24">
        <div className="relative max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-accent-foreground sm:text-5xl">
            {settings?.hero_title || 'Dobrodošli u našu trgovinu'}
          </h1>
          {settings?.hero_subtitle && (
            <p className="mt-4 text-lg text-muted-foreground">{settings.hero_subtitle}</p>
          )}
          <Link href="/proizvodi" className={buttonVariants({ size: 'lg', className: 'mt-8' })}>
            Pogledaj ponudu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 sm:h-[28rem] sm:w-[28rem]"
        />
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Izdvojeno</h2>
          <Link href="/proizvodi" className="text-sm text-primary hover:underline">
            Svi proizvodi
          </Link>
        </div>
        <ProductGrid products={featured.products} />
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Kategorije</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/kategorije/${c.slug}`}
                className="group overflow-hidden rounded-lg border bg-card"
              >
                <div className="relative aspect-[8/5] bg-muted">
                  <ProductImage
                    src={c.image_url}
                    alt={c.name}
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="font-medium">{c.name}</p>
                  {c.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
