import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { appRoutes, appTabs, developerTabs, type AppRoute } from './router/routes';
import { useHabitMutations, useHabitsQuery, useSettingsQuery } from './hooks/useApiQueries';
import { useHabitReminders } from './hooks/useHabitReminders';
import type { HabitRecord } from './components/habits/habitTypes';
import { AnnouncementContext } from './announcementContext';
import { AuthProvider, useAuth } from './authContext';
import { ThemeContext } from './themeContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import {
  applyDocumentTheme,
  DEFAULT_THEME,
  type AppTheme,
  persistStoredTheme,
  readStoredTheme,
  readThemeFromSettings,
} from './theme';
import { Badge, Button, cn } from './components/ui';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  Check,
  ChevronsLeft,
  Clock,
  Grid2x2,
  Import,
  LayoutDashboard,
  ListTodo,
  Loader2,
  MenuIcon,
  Plus,
  Settings,
  StickyNote,
  Wrench,
  X,
} from './components/ui/icons';

const UNAUTHENTICATED_PATHS = new Set(['/login', '/register']);

const isDevMode = import.meta.env.DEV;
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'tracker.sidebar.collapsed';

const readStoredSidebarCollapsed = () => {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const pathMatchesRoute = (pathname: string, routePath: string) => pathname === routePath || pathname.startsWith(`${routePath}/`);

const routeIsDeveloperRoute = ({ path }: AppRoute) => developerTabs.some((tab) => pathMatchesRoute(path, tab.path));

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

const navIcons: Record<string, IconComponent> = {
  Dashboard: LayoutDashboard,
  Tasks: ListTodo,
  Notes: StickyNote,
  Planning: CalendarDays,
  Matrix: Grid2x2,
  Calendar: Calendar,
  Settings: Settings,
  Import: Import,
  'Error Playground': AlertTriangle,
  'Developer Tools': Wrench,
};

function SidebarItem({ label, path, collapsed = false, onClick }: { label: string; path: string; collapsed?: boolean; onClick?: () => void }) {
  const Icon = navIcons[label] ?? LayoutDashboard;
  return (
    <NavLink
      to={path}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-(--duration-fast)',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-brand-soft text-brand' : 'text-fg-muted hover:bg-inset hover:text-fg',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className={cn(collapsed && 'sr-only')}>{label}</span>
    </NavLink>
  );
}

function DeveloperNavSection({ isActive, collapsed, tabs }: { isActive: boolean; collapsed: boolean; tabs: typeof developerTabs }) {
  if (tabs.length === 0) return null;

  return (
    <details className="group" open={isActive}>
      <summary className={cn(
        'flex cursor-pointer list-none items-center gap-1 rounded-md px-2.5 py-2 text-xs font-semibold tracking-wide text-fg-subtle uppercase select-none hover:text-fg-muted [&::-webkit-details-marker]:hidden',
        collapsed && 'justify-center px-0',
      )}>
        <span className={cn(collapsed && 'sr-only')}>Developer</span>
        {collapsed && <Wrench className="h-4 w-4" aria-hidden />}
      </summary>
      <nav className="mt-1 flex flex-col gap-0.5" aria-label="Developer and admin navigation">
        {tabs.map(({ label, path }) => (
          <SidebarItem key={path} label={label} path={path} collapsed={collapsed} />
        ))}
      </nav>
    </details>
  );
}

function HabitReminderToasts({ habits, onCheckIn, onDismiss }: { habits: HabitRecord[]; onCheckIn: (id: number) => void; onDismiss: (id: number) => void }) {
  if (habits.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 z-(--z-toast) flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" role="region" aria-label="Habit reminders">
      {habits.map((habit) => (
        <div
          key={habit.id}
          className="flex items-start gap-3 rounded-xl border border-line bg-glass p-3.5 shadow-lg backdrop-blur-(--blur-panel)"
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">{habit.title}</p>
            <p className="text-xs text-fg-muted">Reminder: time to check in</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="primary" size="sm" iconOnly aria-label={`Check in ${habit.title}`} title="Check in" onClick={() => onCheckIn(habit.id)}>
              <Check className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" iconOnly aria-label={`Dismiss reminder for ${habit.title}`} title="Dismiss" onClick={() => onDismiss(habit.id)}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readStoredSidebarCollapsed);
  const [theme, setThemeState] = useState<AppTheme>(() => readStoredTheme() ?? DEFAULT_THEME);
  const [announcement, setAnnouncement] = useState('');
  const settingsQuery = useSettingsQuery(true);
  const hasSyncedSavedTheme = useRef(false);
  const habitsQuery = useHabitsQuery();
  const { checkIn: checkInHabit } = useHabitMutations();
  const habits = useMemo<HabitRecord[]>(() => {
    const data = habitsQuery.data?.data;
    return Array.isArray(data) ? (data as HabitRecord[]) : [];
  }, [habitsQuery.data]);
  const { dueHabits, dismiss: dismissReminder } = useHabitReminders(habits);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    persistStoredTheme(nextTheme);
    applyDocumentTheme(nextTheme);
  }, []);

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
    } catch {
      // Ignore storage failures so the desktop sidebar toggle still works in-memory.
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (hasSyncedSavedTheme.current || !settingsQuery.data?.ok) return undefined;
    hasSyncedSavedTheme.current = true;
    const savedTheme = readThemeFromSettings(settingsQuery.data.data);
    if (!savedTheme || savedTheme === theme) return undefined;

    const themeSync = window.setTimeout(() => setTheme(savedTheme), 0);
    return () => window.clearTimeout(themeSync);
  }, [setTheme, settingsQuery.data, theme]);

  const themeContextValue = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);
  const announcementContextValue = useMemo(() => ({ message: announcement, announce: setAnnouncement }), [announcement]);
  const visibleDeveloperTabs = isDevMode ? developerTabs : [];
  const visibleAppRoutes = isDevMode ? appRoutes : appRoutes.filter((route) => !routeIsDeveloperRoute(route));
  const isDeveloperRouteActive = visibleDeveloperTabs.some(({ path }) => pathMatchesRoute(location.pathname, path));
  const routeOwnsPageLayout = location.pathname.startsWith('/tasks');
  const hideGlobalQuickAdd = routeOwnsPageLayout || location.pathname.startsWith('/habits');
  const activeRouteLabel = [...appTabs, ...visibleDeveloperTabs].find(({ path }) => pathMatchesRoute(location.pathname, path))?.label ?? 'Dashboard';

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <AnnouncementContext.Provider value={announcementContextValue}>
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-(--z-toast) focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-fg"
          href="#task-tracker-main"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen bg-canvas text-fg">
          <aside
            className={cn(
              'sticky top-0 z-(--z-sticky) hidden h-screen shrink-0 flex-col border-r border-line bg-card px-3 py-4 lg:flex',
              isSidebarCollapsed ? 'w-16' : 'w-60',
            )}
            aria-label="Primary navigation"
          >
            <div className={cn('mb-6 flex items-center gap-2.5 px-1.5', isSidebarCollapsed && 'flex-col gap-2 px-0')}>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-fg"
                aria-hidden="true"
              >
                T
              </span>
              {!isSidebarCollapsed && <h1 className="truncate text-[15px] font-semibold tracking-tight">Tracker</h1>}
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={cn('text-fg-subtle', !isSidebarCollapsed && 'ml-auto')}
                aria-expanded={!isSidebarCollapsed}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
              >
                <ChevronsLeft className={cn('h-4 w-4 transition-transform duration-(--duration-base)', isSidebarCollapsed && 'rotate-180')} aria-hidden />
              </Button>
            </div>
            <nav className="flex flex-col gap-0.5" aria-label="Primary app navigation">
              {appTabs.map(({ label, path }) => (
                <SidebarItem key={path} label={label} path={path} collapsed={isSidebarCollapsed} />
              ))}
            </nav>
            <div className="mt-auto pt-4">
              <DeveloperNavSection isActive={isDeveloperRouteActive} collapsed={isSidebarCollapsed} tabs={visibleDeveloperTabs} />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-(--z-sticky) flex h-14 shrink-0 items-center gap-3 border-b border-line bg-card px-4 sm:px-6">
              <Button
                variant="ghost"
                iconOnly
                className="lg:hidden"
                aria-controls="mobile-navigation"
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setIsMobileMenuOpen((open) => !open)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" aria-hidden /> : <MenuIcon className="h-5 w-5" aria-hidden />}
              </Button>
              <h2 className="truncate text-[15px] font-semibold tracking-tight">{activeRouteLabel}</h2>
              <div className="ml-auto flex items-center gap-2">
                {!hideGlobalQuickAdd && (
                  <NavLink
                    to="/tasks"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-medium text-brand-fg hover:bg-brand-hover"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Quick add
                  </NavLink>
                )}
              </div>
            </header>

            <nav
              id="mobile-navigation"
              className={cn('flex-col gap-0.5 border-b border-line bg-card p-3 lg:hidden', isMobileMenuOpen ? 'flex' : 'hidden')}
              aria-label="Mobile navigation"
            >
              {appTabs.map(({ label, path }) => (
                <SidebarItem key={path} label={label} path={path} onClick={() => setIsMobileMenuOpen(false)} />
              ))}
              {visibleDeveloperTabs.map(({ label, path }) => (
                <SidebarItem key={path} label={label} path={path} onClick={() => setIsMobileMenuOpen(false)} />
              ))}
            </nav>

            <main
              id="task-tracker-main"
              className={cn('min-w-0 flex-1 focus:outline-none', !routeOwnsPageLayout && 'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6')}
              tabIndex={-1}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                {visibleAppRoutes.map((route) => <Route key={route.path} path={route.path} element={route.element} />)}
                {!isDevMode && developerTabs.map(({ path }) => (
                  <Route key={`redirect-${path}`} path={`${path}/*`} element={<Navigate to="/dashboard" replace />} />
                ))}
              </Routes>
            </main>
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
          </div>
        </div>
        <HabitReminderToasts
          habits={dueHabits}
          onCheckIn={(id) => { checkInHabit.mutate(id); dismissReminder(id); }}
          onDismiss={dismissReminder}
        />
      </AnnouncementContext.Provider>
    </ThemeContext.Provider>
  );
}
