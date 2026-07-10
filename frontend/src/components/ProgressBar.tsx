import { cn } from './ui/cn';

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  helperText?: string;
  valueLabel?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

const fillClasses: Record<NonNullable<ProgressBarProps['variant']>, string> = {
  primary: 'bg-brand',
  success: 'bg-positive',
  warning: 'bg-caution',
  danger: 'bg-critical',
  neutral: 'bg-fg-subtle',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

export function ProgressBar({
  label,
  value,
  max = 100,
  helperText,
  valueLabel,
  variant = 'primary',
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = clamp(Number.isFinite(value) ? value : 0, 0, safeMax);
  const percentage = (safeValue / safeMax) * 100;
  const displayedValue = valueLabel ?? formatPercentage(percentage);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="text-sm text-fg-muted tabular-nums">{displayedValue}</span>
      </div>
      {helperText && <p className="text-xs text-fg-subtle">{helperText}</p>}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-inset"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={displayedValue}
      >
        <span
          className={cn('block h-full rounded-full transition-[width] duration-(--duration-slow)', fillClasses[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
