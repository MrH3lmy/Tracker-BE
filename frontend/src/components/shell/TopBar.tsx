import { Link, useNavigate } from 'react-router-dom';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { Button, cn } from '../ui';
import { MenuIcon, PanelLeftClose, PanelLeftOpen, Plus, Search } from '../ui/icons';
import { Breadcrumbs } from './Breadcrumbs';
import { AccountMenu } from './AccountMenu';
import type { Crumb } from './navigation';
import type { AuthUser } from '../../authContext';

export interface TopBarProps {
  crumbs: Crumb[];
  user: AuthUser | null;
  onLogout: () => void;
  onQuickAdd?: () => void;
  onOpenMoreSheet: () => void;
  isMoreSheetOpen: boolean;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  notificationSlot?: ReactNode;
}

/**
 * `search-accessible`: search must be reachable from the top bar rather than
 * buried in a list. It was previously the seventh of nine sidebar items. The
 * field submits to the existing /search route, so the deep link is unchanged and
 * the URL still carries the query.
 */
function SearchField() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = term.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
  };

  return (
    <form role="search" onSubmit={handleSubmit} className="hidden min-w-0 flex-1 md:block">
      <label htmlFor="shell-search" className="sr-only">
        Search tasks, notes and projects
      </label>
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden
        />
        <input
          id="shell-search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search"
          className="h-9 w-full rounded-md border border-line-control bg-card pr-3 pl-8 text-sm text-fg placeholder:text-fg-subtle focus-visible:border-brand"
        />
      </div>
    </form>
  );
}

export function TopBar({
  crumbs,
  user,
  onLogout,
  onQuickAdd,
  onOpenMoreSheet,
  isMoreSheetOpen,
  onToggleSidebar,
  isSidebarCollapsed,
  notificationSlot,
}: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-(--z-sticky) flex h-(--shell-topbar-h) shrink-0 items-center gap-2 border-b border-line bg-card px-3 sm:px-4',
      )}
    >
      {/* Below lg the sidebar is gone, so the sheet is the way into everything
          that is not on the tab bar. */}
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        className="md:hidden"
        onClick={onOpenMoreSheet}
        aria-expanded={isMoreSheetOpen}
        aria-controls="shell-more-sheet"
        aria-label="Open navigation menu"
      >
        <MenuIcon className="h-5 w-5" aria-hidden />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        iconOnly
        // `hidden` would lose to Button's base `inline-flex`; a variant wins.
        className="max-lg:hidden"
        onClick={onToggleSidebar}
        aria-expanded={!isSidebarCollapsed}
        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isSidebarCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" aria-hidden />
        ) : (
          <PanelLeftClose className="h-4 w-4" aria-hidden />
        )}
      </Button>

      <div className="min-w-0 shrink">
        <Breadcrumbs crumbs={crumbs} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <SearchField />
        {/* Search still needs to be one tap away where the field does not fit. */}
        <Link
          to="/search"
          aria-label="Search"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors duration-(--duration-fast) hover:bg-inset hover:text-fg md:hidden"
        >
          <Search className="h-5 w-5" aria-hidden />
        </Link>
        {onQuickAdd && (
          <Button
            variant="primary"
            size="sm"
            className="max-lg:hidden"
            onClick={onQuickAdd}
            title="Quick add (Ctrl+K)"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Quick add
          </Button>
        )}
        {notificationSlot}
        {user && <AccountMenu user={user} onLogout={onLogout} />}
      </div>
    </header>
  );
}
