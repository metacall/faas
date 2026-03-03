import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[--color-primary] text-white border border-transparent hover:bg-[--color-primary-hover] shadow-sm',
  secondary:
    'bg-[--color-elevated] text-[--color-text-primary] border border-[--color-border] hover:bg-[--color-card-header]',
  ghost:
    'bg-transparent text-[--color-text-muted] border border-transparent hover:text-[--color-text-primary] hover:bg-[--color-elevated]',
  danger:
    'bg-transparent text-[--color-status-failed] border border-[--color-status-failed] hover:bg-[--color-status-failed] hover:text-white',
  outline:
    'bg-[--color-surface] text-[--color-text-primary] border border-[--color-border] hover:bg-black hover:text-white hover:border-black',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-sm font-bold uppercase tracking-wider gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      className={clsx(
        'inline-flex items-center font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner size={size === 'sm' ? 12 : 14} />}
      {children}
    </button>
  );
}
