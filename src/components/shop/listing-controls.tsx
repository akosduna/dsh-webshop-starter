import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { PRODUCT_SORTS, type ProductSort } from '@/lib/shop/catalog';

/** Plain GET form: works without JavaScript and keeps filters in the URL. */
export function ListingControls({
  action,
  sort,
  search,
  minPrice,
  maxPrice,
  showSearch = true,
}: {
  action: string;
  sort: ProductSort;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  showSearch?: boolean;
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      {showSearch && (
        <div className="min-w-44 flex-1">
          <label htmlFor="q" className="mb-1 block text-xs text-muted-foreground">
            Pretraga
          </label>
          <Input id="q" name="q" defaultValue={search} placeholder="Naziv proizvoda…" />
        </div>
      )}
      <div className="w-24">
        <label htmlFor="min" className="mb-1 block text-xs text-muted-foreground">
          Cijena od (€)
        </label>
        <Input id="min" name="min" inputMode="decimal" defaultValue={minPrice} />
      </div>
      <div className="w-24">
        <label htmlFor="max" className="mb-1 block text-xs text-muted-foreground">
          Cijena do (€)
        </label>
        <Input id="max" name="max" inputMode="decimal" defaultValue={maxPrice} />
      </div>
      <div className="w-56">
        <label htmlFor="sort" className="mb-1 block text-xs text-muted-foreground">
          Poredaj
        </label>
        <Select id="sort" name="sort" defaultValue={sort}>
          {PRODUCT_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit">Primijeni</Button>
      <Link href={action} className="py-2 text-sm text-muted-foreground hover:text-foreground">
        Očisti
      </Link>
    </form>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  makeHref,
}: {
  page: number;
  total: number;
  pageSize: number;
  makeHref: (page: number) => string;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <nav className="mt-10 flex justify-center gap-1" aria-label="Stranice">
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          aria-current={p === page ? 'page' : undefined}
          className={
            p === page
              ? 'flex h-9 min-w-9 items-center justify-center rounded-md bg-primary px-3 text-sm text-primary-foreground'
              : 'flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm hover:bg-muted'
          }
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
