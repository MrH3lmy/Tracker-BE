import { NavLink } from 'react-router-dom';
import { cn } from './ui';

export interface SectionTabItem {
  path: string;
  label: string;
  /** Match this path exactly rather than as a prefix (use for the section's default/index route). */
  end?: boolean;
}

/**
 * Small in-page view switcher for a section that groups several existing pages
 * under one primary nav item (e.g. Tasks: List/Board/Matrix, Calendar: Month/Day/Auto-plan).
 */
export function SectionTabs({ items, ariaLabel }: { items: SectionTabItem[]; ariaLabel: string }) {
  return (
    <div className="flex gap-1 rounded-lg bg-inset p-1" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          role="tab"
          className={({ isActive }) => cn(
            'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast)',
            isActive ? 'bg-card text-fg shadow-2xs' : 'text-fg-muted hover:text-fg',
          )}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
