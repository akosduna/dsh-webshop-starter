import { Card } from '@/components/ui/card';

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-6">
      <Card className="space-y-6 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </Card>
    </div>
  );
}

type Param = string | string[] | undefined;

/** Same-site relative path from ?redirect= (or legacy ?next=); prevents open redirects. */
export function safeRedirectParam(params: Record<string, Param>, fallback = '/moj-racun'): string {
  const raw = params.redirect ?? params.next;
  const value = typeof raw === 'string' ? raw : '';
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : fallback;
}
