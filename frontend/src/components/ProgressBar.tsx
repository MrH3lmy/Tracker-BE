interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  helperText?: string;
  valueLabel?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

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
    <div className={`progress-card progress-card-${variant}`}>
      <div className="progress-label-row">
        <span className="progress-label">{label}</span>
        <span className="progress-percentage">{displayedValue}</span>
      </div>
      {helperText && <p className="progress-helper">{helperText}</p>}
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={displayedValue}
      >
        <span className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
