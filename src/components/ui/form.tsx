import * as React from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-md border bg-card px-3 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(fieldBase, 'h-10', className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'min-h-24 py-2', className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, 'h-10', className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1 block text-sm font-medium', className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input type="checkbox" className={cn('h-4 w-4 accent-primary', className)} {...props} />
  );
}

/** Inline success / error message (instead of browser alerts). */
export function FormMessage({
  type,
  children,
}: {
  type: 'error' | 'success';
  children: React.ReactNode;
}) {
  return (
    <p
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-md px-3 py-2 text-sm',
        type === 'error'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-success/10 text-success',
      )}
    >
      {children}
    </p>
  );
}
