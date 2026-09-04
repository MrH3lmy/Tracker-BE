import { NavLink } from 'react-router-dom';
import { cn } from './ui';

export interface SectionTabItem {
  path: string;
  label: string;
  /** Match this path exactly rather than as a prefix (use for the section's default/index route). */
  end?: boolean;
}

/**
 * Secondary, in-section navigation: the view switcher for a section that groups
 * several routes under one primary destination (Tasks: List/Board/Matrix/Projects,
 * Calendar: Month/Week/Day/Auto-plan).
 *
 * These are links that change the URL, not tabs that swap a panel in place, so
 * they are marked up as a <nav> of links with `aria-current="page"`. The
 * previous version put `role="tablist"`/`role="tab"` on them with no
 * `tabpanel` anywhere, which told screen readers to expect in-page panel
 * switching that never happens and suppressed the link semantics that make
 * "open in new tab" and the back button make sense.
 *
 * `nav-hierarchy`: this is deliberately visually distinct from the shell's
 * primary navigation, so the two levels never read as one.
 */
export function SectionTabs({ items, ariaLabel }: { items: SectionTabItem[]; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel}>
      <ul className="flex flex-wrap gap-0.5 rounded-lg bg-inset p-0.5">
        {items.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-8 cursor-pointer items-center rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-(--duration-fast)',
                  isActive
                    ? 'bg-card font-semibold text-fg'
                    : 'font-medium text-fg-muted hover:text-fg',
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
