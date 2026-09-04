import { useMemo, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../ui';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileTabBar } from './MobileTabBar';
import { MoreSheet } from './MoreSheet';
import { useMediaQuery } from './useMediaQuery';
import { useRouteFocus } from './useRouteFocus';
import { buildBreadcrumbs, buildNavGroups } from './navigation';
import type { AuthUser } from '../../authContext';

/** Matches Tailwind's `lg`. Below this the sidebar renders as a labelled rail. */
const FULL_SIDEBAR_QUERY = '(min-width: 1024px)';

export interface AppShellProps {
  user: AuthUser | null;
  onLogout: () => void;
  includeDeveloper: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMoreSheetOpen: boolean;
  onMoreSheetOpenChange: (open: boolean) => void;
  onQuickAdd?: () => void;
  notificationSlot?: ReactNode;
  announce: (message: string) => void;
  announcement: string;
  /** Set by routes that paint their own full-bleed layout (e.g. the Tasks board). */
  routeOwnsPageLayout: boolean;
  children: ReactNode;
}

/**
 * The global authenticated application shell.
 *
 * Navigation model, by width:
 *   >= 1024px  full sidebar (collapsible to a labelled rail) + top bar
 *   768-1023   labelled rail + top bar
 *   < 768px    top bar + five-item bottom tab bar + "More" sheet
 *
 * Exactly one navigation mechanism is live at each width (`avoid-mixed-patterns`),
 * and its placement does not change between pages (`navigation-consistency`).
 */
export function AppShell({
  user,
  onLogout,
  includeDeveloper,
  isSidebarCollapsed,
  onToggleSidebar,
  isMoreSheetOpen,
  onMoreSheetOpenChange,
  onQuickAdd,
  notificationSlot,
  announce,
  announcement,
  routeOwnsPageLayout,
  children,
}: AppShellProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const hasFullSidebar = useMediaQuery(FULL_SIDEBAR_QUERY);

  const groups = useMemo(() => buildNavGroups(includeDeveloper), [includeDeveloper]);
  const crumbs = useMemo(() => buildBreadcrumbs(location.pathname), [location.pathname]);
  const routeLabel = crumbs[crumbs.length - 1]?.label ?? 'Tracker';

  useRouteFocus(mainRef, announce, routeLabel);

  return (
    <div className="flex min-h-dvh bg-canvas text-fg">
      {/* skip-links: first thing in the tab order, visible once focused. */}
      <a
        href="#tracker-main"
        className="sr-only rounded-md focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-(--z-toast) focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-fg"
      >
        Skip to content
      </a>

      <Sidebar groups={groups} density={hasFullSidebar && !isSidebarCollapsed ? 'full' : 'rail'} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          crumbs={crumbs}
          user={user}
          onLogout={onLogout}
          onQuickAdd={onQuickAdd}
          onOpenMoreSheet={() => onMoreSheetOpenChange(true)}
          isMoreSheetOpen={isMoreSheetOpen}
          onToggleSidebar={onToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          notificationSlot={notificationSlot}
        />

        <main
          id="tracker-main"
          ref={mainRef}
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1 focus:outline-none',
            // fixed-element-offset: reserve the tab bar (and the FAB above it)
            // so the last row of content is never trapped underneath.
            'pb-[calc(var(--shell-tabbar-h)+env(safe-area-inset-bottom)+4.5rem)] md:pb-0',
            // container-width: one consistent measure for every route that does
            // not paint its own layout.
            !routeOwnsPageLayout && 'mx-auto w-full max-w-6xl px-4 py-5 sm:px-6',
          )}
        >
          {children}
        </main>

        {/* Named so it is distinguishable from the per-page busy/status regions
            that feature surfaces render (`contextual-live-badge-updates`). */}
        <div
          className="sr-only"
          role="status"
          aria-label="Application announcements"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </div>
      </div>

      <MobileTabBar
        onOpenMoreSheet={() => onMoreSheetOpenChange(true)}
        isMoreSheetOpen={isMoreSheetOpen}
        onQuickAdd={onQuickAdd}
      />

      <MoreSheet
        open={isMoreSheetOpen}
        onOpenChange={onMoreSheetOpenChange}
        groups={groups}
        user={user}
        onLogout={onLogout}
      />
    </div>
  );
}
