import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function RootNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Stranica nije pronađena</h1>
      <Link href="/" className={buttonVariants({ className: 'mt-8' })}>
        Na početnu
      </Link>
    </main>
  );
}
