'use client';

import { useState, useTransition } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

/**
 * Two-step destructive action without a browser confirm(): the first click
 * asks "Sigurno?", the second runs the action.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmText = 'Sigurno?',
  ...props
}: Omit<ButtonProps, 'onClick'> & {
  onConfirm: () => Promise<void> | void;
  confirmText?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <Button type="button" variant="outline" {...props} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{confirmText}</span>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => startTransition(async () => {
          await onConfirm();
          setAsking(false);
        })}
      >
        Da
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)}>
        Ne
      </Button>
    </span>
  );
}
