import { NavLink } from 'react-router-dom';
import { cn } from '../ui';
import { MoreHorizontal, Plus } from '../ui/icons';
import { mobileTabItems } from './navigation';

export interface MobileTabBarProps {
  onOpenMoreSheet: () => void;
  isMoreSheetOpen: boolean;
  onQuickAdd?: () => void;
}

const tabClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    // touch-target-size: 44px minimum on every tab.
    'relative flex min-h-11 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[11px] font-medium transition-colors duration-(--duration-fast)',
    isActive ? 'font-semibold text-brand' : 'text-fg-muted',
  );

/**
 * The single navigation mechanism below `lg`.
 *
 * The previous shell ran three at once -- this bar, a full duplicate of the
 * sidebar list rendered inline under the header, and each section's in-page
 * tabs -- which `avoid-mixed-patterns` warns against directly. The inline
 * duplicate is gone; everything not on this bar lives in one "More" sheet.
 *
 * `bottom-nav-top-level`: this bar holds destinations only. Quick add used to
 * take one of the five slots; it is now the FAB below, so all five slots
 * navigate.
 */
export function MobileTabBar({ onOpenMoreSheet, isMoreSheetOpen, onQuickAdd }: MobileTabBarProps) {
  return (
    <>
      {onQuickAdd && (
        <button
          type="button"
          onClick={onQuickAdd}
          aria-label="Quick add"
          title="Quick add"
          className={cn(
            'fixed right-4 z-(--z-sticky) flex h-14 w-14 cursor-pointer items-center justify-center rounded-full',
            'bg-brand text-brand-fg shadow-lg transition-colors duration-(--duration-fast) hover:bg-brand-hover md:hidden',
            // safe-area-awareness: clear the tab bar and the gesture bar.
            'bottom-[calc(var(--shell-tabbar-h)+env(safe-area-inset-bottom)+1rem)]',
          )}
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      )}

      <nav
        aria-label="Primary"
        className={cn(
          'fixed inset-x-0 bottom-0 z-(--z-sticky) flex items-stretch gap-0.5 border-t border-line bg-card px-1 md:hidden',
          'h-[calc(var(--shell-tabbar-h)+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]',
        )}
      >
        {mobileTabItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={tabClassName}>
            {({ isActive }) => (
              <>
                {/* nav-state-active without relying on colour alone. */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-2 top-0 h-0.5 rounded-full bg-brand transition-opacity duration-(--duration-fast)',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={onOpenMoreSheet}
          aria-expanded={isMoreSheetOpen}
          aria-controls="shell-more-sheet"
          className={cn(
            'relative flex min-h-11 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[11px] font-medium transition-colors duration-(--duration-fast)',
            isMoreSheetOpen ? 'font-semibold text-brand' : 'text-fg-muted',
          )}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
          More
        </button>
      </nav>
    </>
  );
}
