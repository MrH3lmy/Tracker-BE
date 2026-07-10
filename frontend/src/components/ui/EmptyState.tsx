import type { ComponentType, ReactNode } from 'react';
import { cn } from './cn';

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-inset text-fg-muted">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
