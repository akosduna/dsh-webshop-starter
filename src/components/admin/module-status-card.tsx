import { Card } from '@/components/ui/card';
import { getAllModuleStatuses, type ModuleStatus } from '@/lib/modules';
import { cn } from '@/lib/utils';

function StatusLine({ status }: { status: ModuleStatus }) {
  if (status.state === 'ready') return <span className="text-success">✅ spremno</span>;
  if (status.state === 'disabled') return <span className="text-muted-foreground">⏸ isključeno</span>;
  return <span className="text-destructive">⚠ nedostaju ključevi: {status.missingEnv.join(', ')}</span>;
}

/** Which modules (src/config/modules.ts) are live, missing keys or switched off. */
export function ModuleStatusCard() {
  const statuses = getAllModuleStatuses();
  return (
    <Card className="p-0" data-testid="module-status">
      <div className="p-4">
        <h2 className="font-semibold">Moduli</h2>
        <p className="text-xs text-muted-foreground">
          Uključuju se u src/config/modules.ts, ključevi idu u env varijable (vidi INTEGRATIONS.md).
        </p>
      </div>
      <ul className="divide-y border-t text-sm">
        {statuses.map((s) => (
          <li key={s.id} className="grid gap-1 p-4 sm:grid-cols-[1fr_auto] sm:items-start" data-module={s.id} data-state={s.state}>
            <div>
              <p className={cn('font-medium', s.state === 'disabled' && 'text-muted-foreground')}>{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
            <p className="break-words text-xs sm:max-w-xs sm:text-right">
              <StatusLine status={s} />
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
