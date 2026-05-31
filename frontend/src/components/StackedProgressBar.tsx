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
    <div className="stacked-progress-card">
      <div className="progress-label-row">
        <span className="progress-label">{label}</span>
        <span className="progress-percentage">{totalLabel ?? `${formatCount(total)} total`}</span>
      </div>
      <div className="stacked-progress-track" role="img" aria-label={`${label}. ${accessibleSummary}`}>
        {total > 0 ? visibleSegments.map((segment) => {
          const percentage = (segment.value / total) * 100;

          return (
            <span
              key={segment.label}
              className={`stacked-progress-segment stacked-progress-segment-${segment.variant ?? 'primary'}`}
              style={{ width: `${percentage}%` }}
              title={`${segment.label}: ${formatCount(segment.value)} (${formatPercentage(percentage)})`}
            />
          );
        }) : <span className="stacked-progress-empty">No data</span>}
      </div>
      <ul className="stacked-progress-legend" aria-label={`${label} legend`}>
        {visibleSegments.map((segment) => {
          const percentage = total > 0 ? (segment.value / total) * 100 : 0;

          return (
            <li key={segment.label}>
              <span className={`legend-swatch stacked-progress-segment-${segment.variant ?? 'primary'}`} aria-hidden="true" />
              <span>{segment.label}</span>
              <strong>{formatCount(segment.value)}</strong>
              <span className="legend-percentage">{formatPercentage(percentage)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
