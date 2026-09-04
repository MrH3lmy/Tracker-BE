import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { appRoutes, developerTabs, legacyRedirects, type AppRoute } from './router/routes';
import { useHabitMutations, useHabitsQuery, useSettingsQuery } from './hooks/useApiQueries';
import { useHabitReminders } from './hooks/useHabitReminders';
import type { HabitRecord } from './components/habits/habitTypes';
import { AnnouncementContext } from './announcementContext';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './authContext';
import { ThemeContext } from './themeContext';
import { UndoToastContext, type UndoToastContextValue } from './undoToastContext';
import { QuickCaptureContext, type QuickCaptureContextValue } from './quickCaptureContext';
import { QuickCaptureModal } from './components/quickCapture/QuickCaptureModal';
import { FocusTimerWidget } from './components/focus/FocusTimerWidget';
import { NotificationInbox } from './components/notifications/NotificationInbox';
import { AppShell } from './components/shell/AppShell';
import { pathMatchesRoute } from './components/shell/navigation';
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
import { readHabitReminderStyle } from './validation/settings';
import { Button } from './components/ui';
import { Check, Clock, Loader2, X } from './components/ui/icons';

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

const routeIsDeveloperRoute = ({ path }: AppRoute) => developerTabs.some((tab) => pathMatchesRoute(path, tab.path));

function HabitReminderToasts({
  habits,
  onCheckIn,
  onDismiss,
}: {
  habits: HabitRecord[];
  onCheckIn: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  if (habits.length === 0) return null;

  return (
    <div
      className="fixed right-4 bottom-[calc(var(--shell-tabbar-h)+env(safe-area-inset-bottom)+5.5rem)] z-(--z-toast) flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 md:bottom-4"
      role="region"
      aria-label="Habit reminders"
    >
      {habits.map((habit) => (
        <div key={habit.id} className="flex items-start gap-3 rounded-lg border border-line bg-card p-3.5 shadow-lg">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">{habit.title}</p>
            <p className="text-xs text-fg-muted">Reminder: time to check in</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="primary"
              size="sm"
              iconOnly
              aria-label={`Check in ${habit.title}`}
              title="Check in"
              onClick={() => onCheckIn(habit.id)}
            >
              <Check className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Dismiss reminder for ${habit.title}`}
              title="Dismiss"
              onClick={() => onDismiss(habit.id)}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}

// Splits unauthenticated routes (login/register, no shell, no authenticated
// data fetching) from the authenticated app. Kept outside routes.tsx since
// those entries drive the shell's navigation, which login/register must never
// appear in.
function AppRoot() {
  const location = useLocation();

  if (UNAUTHENTICATED_PATHS.has(location.pathname)) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    );
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const location = useLocation();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [quickCaptureInitialDate, setQuickCaptureInitialDate] = useState<string | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readStoredSidebarCollapsed);
  const [theme, setThemeState] = useState<AppTheme>(() => readStoredTheme() ?? DEFAULT_THEME);
  const [announcement, setAnnouncement] = useState('');
  const [undoToast, setUndoToast] = useState<{ id: number; message: string; onUndo: () => void } | null>(null);
  const undoToastTimeoutRef = useRef<number | undefined>(undefined);
  const undoToastIdRef = useRef(0);
  const settingsQuery = useSettingsQuery(isAuthenticated);
  const hasSyncedSavedTheme = useRef(false);
  const habitsQuery = useHabitsQuery(isAuthenticated);
  const { checkIn: checkInHabit } = useHabitMutations();
  const habits = useMemo<HabitRecord[]>(() => {
    const data = habitsQuery.data?.data;
    return Array.isArray(data) ? (data as HabitRecord[]) : [];
  }, [habitsQuery.data]);
  const habitReminderStyle = useMemo(
    () => readHabitReminderStyle(settingsQuery.data?.ok ? settingsQuery.data.data : undefined),
    [settingsQuery.data],
  );
  const { dueHabits, dismiss: dismissReminder } = useHabitReminders(habits, habitReminderStyle);

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
      // Ignore storage failures so the sidebar toggle still works in-memory.
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
  const announcementContextValue = useMemo(
    () => ({ message: announcement, announce: setAnnouncement }),
    [announcement],
  );
  const dismissUndoToast = useCallback(() => {
    window.clearTimeout(undoToastTimeoutRef.current);
    setUndoToast(null);
  }, []);
  const showUndo = useCallback((message: string, onUndo: () => void) => {
    window.clearTimeout(undoToastTimeoutRef.current);
    const id = ++undoToastIdRef.current;
    setUndoToast({ id, message, onUndo });
    undoToastTimeoutRef.current = window.setTimeout(() => {
      setUndoToast((current) => (current?.id === id ? null : current));
    }, 6000);
  }, []);
  const handleUndoClick = () => {
    undoToast?.onUndo();
    dismissUndoToast();
  };
  const undoToastContextValue = useMemo<UndoToastContextValue>(() => ({ showUndo }), [showUndo]);
  const openQuickCapture = useCallback((initialDate?: string) => {
    setQuickCaptureInitialDate(initialDate);
    setIsQuickCaptureOpen(true);
  }, []);
  const quickCaptureContextValue = useMemo<QuickCaptureContextValue>(() => ({ openQuickCapture }), [openQuickCapture]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCaptureShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isCaptureShortcut) return;
      event.preventDefault();
      setIsQuickCaptureOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close the mobile sheet on navigation so it never lingers over the page the
  // user just chose, including on browser back/forward (`back-stack-integrity`).
  // Adjusted during render rather than in an effect so the sheet is never
  // painted over the new route for a frame.
  const [sheetPathname, setSheetPathname] = useState(location.pathname);
  if (sheetPathname !== location.pathname) {
    setSheetPathname(location.pathname);
    setIsMoreSheetOpen(false);
  }

  const visibleAppRoutes = isDevMode ? appRoutes : appRoutes.filter((route) => !routeIsDeveloperRoute(route));
  const routeOwnsPageLayout = location.pathname.startsWith('/tasks');
  // Surfaces that already offer their own prominent create action suppress the
  // shell's, so the two never sit side by side in the same viewport.
  const hideGlobalQuickAdd =
    routeOwnsPageLayout ||
    location.pathname.startsWith('/habits') ||
    location.pathname.startsWith('/today');

  if (isAuthLoading) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center gap-2 bg-canvas text-fg-muted"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span>Restoring your session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <AnnouncementContext.Provider value={announcementContextValue}>
        <UndoToastContext.Provider value={undoToastContextValue}>
          <QuickCaptureContext.Provider value={quickCaptureContextValue}>
            <AppShell
              user={user}
              onLogout={() => void logout()}
              includeDeveloper={isDevMode}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
              isMoreSheetOpen={isMoreSheetOpen}
              onMoreSheetOpenChange={setIsMoreSheetOpen}
              onQuickAdd={hideGlobalQuickAdd ? undefined : () => setIsQuickCaptureOpen(true)}
              notificationSlot={user ? <NotificationInbox /> : undefined}
              announce={setAnnouncement}
              announcement={announcement}
              routeOwnsPageLayout={routeOwnsPageLayout}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/today" replace />} />
                {visibleAppRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={route.element} />
                ))}
                {legacyRedirects.map(({ from, to }) => (
                  <Route key={`legacy-${from}`} path={from} element={<Navigate to={to} replace />} />
                ))}
                {!isDevMode &&
                  developerTabs.map(({ path }) => (
                    <Route key={`redirect-${path}`} path={`${path}/*`} element={<Navigate to="/today" replace />} />
                  ))}
              </Routes>
            </AppShell>

            <HabitReminderToasts
              habits={dueHabits}
              onCheckIn={(id) => {
                checkInHabit.mutate(id);
                dismissReminder(id);
              }}
              onDismiss={dismissReminder}
            />
            <FocusTimerWidget />
            {undoToast && (
              <div
                className="fixed inset-x-0 bottom-[calc(var(--shell-tabbar-h)+env(safe-area-inset-bottom)+1rem)] z-(--z-toast) flex justify-center px-4 md:bottom-6"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-3 rounded-lg border border-line-control bg-card px-4 py-3 shadow-lg">
                  <span className="text-sm text-fg">{undoToast.message}</span>
                  <Button size="sm" variant="ghost" onClick={handleUndoClick}>
                    Undo
                  </Button>
                </div>
              </div>
            )}
            <QuickCaptureModal
              open={isQuickCaptureOpen}
              onOpenChange={(next) => {
                setIsQuickCaptureOpen(next);
                if (!next) setQuickCaptureInitialDate(undefined);
              }}
              initialDate={quickCaptureInitialDate}
            />
          </QuickCaptureContext.Provider>
        </UndoToastContext.Provider>
      </AnnouncementContext.Provider>
    </ThemeContext.Provider>
  );
}
