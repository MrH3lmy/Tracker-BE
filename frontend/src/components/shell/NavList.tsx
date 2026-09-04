import { NavLink } from 'react-router-dom';
import { cn } from '../ui';
import type { NavGroup, NavItem } from './navigation';

export type NavDensity = 'full' | 'rail';

interface NavItemLinkProps {
  item: NavItem;
  density: NavDensity;
  onNavigate?: () => void;
}

/**
 * `nav-label-icon`: navigation items carry an icon *and* a visible text label --
 * icon-only navigation harms discoverability. The previous shell hid its labels
 * in `sr-only` spans once collapsed; the rail here keeps a real, visible
 * micro-label under each icon instead, so the rule holds in both densities.
 *
 * `nav-state-active`: the active item is marked by an accent rail, a background
 * change *and* a weight change, so the current location is never signalled by
 * colour alone (`color-not-only`). `aria-current="page"` comes from NavLink.
 */
function NavItemLink({ item, density, onNavigate }: NavItemLinkProps) {
  const { icon: Icon, label, path } = item;
  const isRail = density === 'rail';

  return (
    <NavLink
      to={path}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-md text-sm transition-colors duration-(--duration-fast)',
          // web-target-size / touch-target-size: every nav row clears 44px tall.
          isRail ? 'min-h-11 flex-col justify-center gap-1 px-1 py-1.5' : 'min-h-11 gap-2.5 px-2.5 py-2',
          isActive
            ? 'bg-brand-soft font-semibold text-brand'
            : 'font-medium text-fg-muted hover:bg-inset hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Non-colour redundancy for the active state. */}
          <span
            aria-hidden
            className={cn(
              'absolute rounded-full bg-brand transition-opacity duration-(--duration-fast)',
              isRail ? 'inset-x-3 top-0 h-0.5' : 'inset-y-1.5 left-0 w-0.5',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon className={cn('shrink-0', isRail ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden />
          <span
            className={cn(
              'w-full min-w-0 truncate',
              isRail && 'text-center text-[10px] leading-tight font-medium',
            )}
            title={label}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export interface NavGroupsProps {
  groups: NavGroup[];
  density: NavDensity;
  onNavigate?: () => void;
}

export function NavGroups({ groups, density, onNavigate }: NavGroupsProps) {
  const isRail = density === 'rail';

  return (
    <div className={cn('flex flex-col', isRail ? 'gap-3' : 'gap-5')}>
      {groups.map((group, index) => (
        <nav key={group.id} aria-label={group.label} className="flex flex-col gap-0.5">
          {isRail ? (
            // The rail has no room for a heading, but the group still needs an
            // accessible name, which aria-label on <nav> already provides. A
            // hairline keeps the visual separation the label carries at full width.
            index > 0 && <span aria-hidden className="mx-3 mb-1 h-px bg-line" />
          ) : (
            <h2 className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
              {group.label}
            </h2>
          )}
          {group.items.map((item) => (
            <NavItemLink key={item.path} item={item} density={density} onNavigate={onNavigate} />
          ))}
        </nav>
      ))}
    </div>
  );
}
