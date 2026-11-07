'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/form';

type ActionResult = { error?: string; success?: string } | null;

/**
 * Runs a (bound) server action and shows its result inline. With
 * `confirmText` the first click asks "…?" and the second runs it (no browser confirm()).
 */
export function ActionButton({
  action,
  confirmText,
  children,
  variant = 'outline',
  ...props
}: Omit<ButtonProps, 'onClick' | 'action'> & {
  action: () => Promise<ActionResult>;
  confirmText?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<ActionResult>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      setAsking(false);
      setResult(await action());
    });

  return (
    <div className="space-y-2">
      {asking ? (
        <span className="inline-flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground">{confirmText}</span>
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={run}>
            Da
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)}>
            Ne
          </Button>
        </span>
      ) : (
        <Button
          type="button"
          variant={variant}
          disabled={pending || props.disabled}
          {...props}
          onClick={() => (confirmText ? setAsking(true) : run())}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {children}
        </Button>
      )}
      {result?.error && <FormMessage type="error">{result.error}</FormMessage>}
      {result?.success && <FormMessage type="success">{result.success}</FormMessage>}
    </div>
  );
}
