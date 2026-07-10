import { cn } from './ui/cn';

export interface StackedProgressSegment {
  label: string;
  value: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'accent';
}

interface StackedProgressBarProps {
  label: string;
  segments: StackedProgressSegment[];
  totalLabel?: string;
}

const segmentClasses: Record<NonNullable<StackedProgressSegment['variant']>, string> = {
  primary: 'bg-brand',
  success: 'bg-positive',
  warning: 'bg-caution',
  danger: 'bg-critical',
  neutral: 'bg-fg-subtle',
  accent: 'bg-brand-hover',
};

function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

export function StackedProgressBar({ label, segments, totalLabel }: StackedProgressBarProps) {
  const visibleSegments = segments.filter((segment) => Number.isFinite(segment.value) && segment.value > 0);
  const total = visibleSegments.reduce((sum, segment) => sum + segment.value, 0);
  const accessibleSummary = total === 0
    ? 'No items to display'
    : visibleSegments
      .map((segment) => `${segment.label}: ${formatCount(segment.value)} (${formatPercentage((segment.value / total) * 100)})`)
      .join(', ');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="text-sm text-fg-muted tabular-nums">{totalLabel ?? `${formatCount(total)} total`}</span>
      </div>
      <div
        className="flex h-2 w-full items-stretch overflow-hidden rounded-full bg-inset"
        role="img"
        aria-label={`${label}. ${accessibleSummary}`}
      >
        {total > 0 ? visibleSegments.map((segment) => {
          const percentage = (segment.value / total) * 100;

          return (
            <span
              key={segment.label}
              className={segmentClasses[segment.variant ?? 'primary']}
              style={{ width: `${percentage}%` }}
              title={`${segment.label}: ${formatCount(segment.value)} (${formatPercentage(percentage)})`}
            />
          );
        }) : <span className="w-full text-center text-[10px] leading-none text-fg-subtle">No data</span>}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label={`${label} legend`}>
        {visibleSegments.map((segment) => {
          const percentage = total > 0 ? (segment.value / total) * 100 : 0;

          return (
            <li key={segment.label} className="flex items-center gap-1.5">
              <span
                className={cn('h-2 w-2 shrink-0 rounded-full', segmentClasses[segment.variant ?? 'primary'])}
                aria-hidden="true"
              />
              <span>{segment.label}</span>
              <strong className="font-semibold text-fg tabular-nums">{formatCount(segment.value)}</strong>
              <span className="text-fg-subtle tabular-nums">{formatPercentage(percentage)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
