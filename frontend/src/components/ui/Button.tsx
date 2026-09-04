import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-hover',
  // Flat Design: an outlined control is defined by its border, so it uses
  // --color-line-control (verified >= 3:1, WCAG 1.4.11) rather than the
  // decorative divider colour, and carries no shadow.
  secondary: 'border-line-control bg-card text-fg hover:bg-inset',
  ghost: 'bg-transparent text-fg-muted hover:bg-inset hover:text-fg',
  danger: 'bg-critical text-white hover:opacity-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 py-0 text-[13px]',
  md: 'h-9 px-3.5 py-0 text-sm',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 p-0',
  md: 'h-9 w-9 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', iconOnly = false, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-0 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent font-medium transition-[background-color,border-color,color] duration-(--duration-fast) disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        iconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
        className,
      )}
      {...rest}
    />
  );
});
