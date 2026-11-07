import * as React from 'react';
import { cn } from '@/lib/utils';

const BUTTON_VARIANTS = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border bg-card hover:bg-muted',
  ghost: 'hover:bg-muted',
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
  link: 'text-primary underline-offset-4 hover:underline',
} as const;

const BUTTON_SIZES = {
  default: 'h-10 px-4',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

type ButtonStyleOptions = {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  className?: string;
};

/** Button classes, also for links styled as buttons: <Link className={buttonVariants()} />. */
export function buttonVariants({ variant, size, className }: ButtonStyleOptions = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
    BUTTON_VARIANTS[variant ?? 'default'],
    BUTTON_SIZES[size ?? 'default'],
    className,
  );
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
};

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
