import type { PickupPoint } from '@/db/enums';

export function PickupPointSummary({ point }: { point: PickupPoint }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <p className="font-medium">{point.name || point.id}</p>
      <p className="text-muted-foreground">
        {[point.contact?.address, point.contact?.postalCode, point.contact?.city].filter(Boolean).join(', ')}
      </p>
    </div>
  );
}
