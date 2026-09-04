import { Link } from 'react-router-dom';
import { cn } from '../ui';
import { NavGroups, type NavDensity } from './NavList';
import type { NavGroup } from './navigation';

export interface SidebarProps {
  groups: NavGroup[];
  density: NavDensity;
}

/**
 * `adaptive-navigation`: screens >= 1024px get a sidebar. Between 768 and 1023
 * it renders as a labelled rail; below 768 it is replaced entirely by the tab
 * bar, so exactly one navigation model is live at any width.
 *
 * The rail keeps visible labels rather than going icon-only -- see NavList for
 * why (`nav-label-icon`).
 */
export function Sidebar({ groups, density }: SidebarProps) {
  const isRail = density === 'rail';

  return (
    <aside
      data-density={density}
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-card py-3 md:flex',
        isRail ? 'w-(--shell-rail-w) px-1.5' : 'w-(--shell-sidebar-w) px-2',
      )}
    >
      <Link
        to="/today"
        className={cn(
          'flex min-h-11 items-center gap-2.5 rounded-md px-1.5 transition-colors duration-(--duration-fast) hover:bg-inset',
          isRail && 'justify-center',
        )}
      >
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-fg"
        >
          T
        </span>
        <span className={cn('truncate text-sm font-semibold tracking-tight text-fg', isRail && 'sr-only')}>
          Tracker
        </span>
      </Link>

      <NavGroups groups={groups} density={density} />
    </aside>
  );
}
