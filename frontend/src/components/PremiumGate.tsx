import type { ReactNode } from 'react';
import { useAuth } from '../authContext';
import { Badge, Button, cn } from './ui';
import { Sparkles } from './ui/icons';

export interface PremiumGateProps {
  /** What renders once the user's tier is PREMIUM (or always, while ignoring the gate entirely). */
  children: ReactNode;
  /** Short feature name shown in the lock badge, e.g. "Calendar export". */
  label?: string;
  /** One-line blurb shown under the lock badge explaining what upgrading unlocks. */
  description?: string;
  className?: string;
}

/**
 * Wraps a feature that requires a PREMIUM tier. FREE users see the wrapped
 * content dimmed and non-interactive behind a "Premium" badge and a
 * disabled "Upgrade" button (no checkout flow exists yet). PREMIUM users
 * see the children rendered normally, with no wrapper at all.
 */
export function PremiumGate({ children, label = 'Premium feature', description = 'Upgrade to Premium to unlock this feature.', className }: PremiumGateProps) {
  const { user } = useAuth();
  const isPremium = user?.tier === 'PREMIUM';

  if (isPremium) return <>{children}</>;

  return (
    <div className={cn('relative isolate overflow-hidden rounded-lg', className)}>
      <div aria-hidden="true" className="pointer-events-none opacity-40 grayscale select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-canvas/85 p-4 text-center backdrop-blur-[1px]">
        <Badge variant="brand" className="gap-1">
          <Sparkles className="h-3 w-3" aria-hidden />
          {label}
        </Badge>
        <p className="max-w-[18rem] text-xs text-fg-muted">{description}</p>
        <Button size="sm" variant="primary" disabled title="Upgrades aren't available yet">
          Upgrade to Premium
        </Button>
      </div>
    </div>
  );
}
