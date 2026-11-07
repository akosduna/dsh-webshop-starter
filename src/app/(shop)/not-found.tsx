import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Stranica nije pronađena</h1>
      <p className="mt-2 text-muted-foreground">Možda je proizvod uklonjen ili je poveznica neispravna.</p>
      <Link href="/proizvodi" className={buttonVariants({ className: 'mt-8' })}>
        Pogledaj proizvode
      </Link>
    </div>
  );
}
