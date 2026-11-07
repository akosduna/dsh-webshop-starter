import { AlertTriangle } from 'lucide-react';

/** Layout for legal pages. Text inside [UPIŠI …] markers must be replaced by the shop owner. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-8 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
        <p>
          <strong>Predložak.</strong> Ovaj tekst je primjer i nije pravni savjet. Vlasnik trgovine
          mora zamijeniti sve oznake <mark>[UPIŠI …]</mark>, provjeriti tekst s pravnikom ili
          računovođom i nakon toga ukloniti ovu napomenu.
        </p>
      </div>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Zadnja izmjena: {updated}</p>
      <div className="prose-legal mt-6">{children}</div>
    </article>
  );
}

/** Highlighted placeholder, e.g. <Fill>naziv tvrtke</Fill> → [UPIŠI naziv tvrtke]. */
export function Fill({ children }: { children: React.ReactNode }) {
  return <mark>[UPIŠI {children}]</mark>;
}
