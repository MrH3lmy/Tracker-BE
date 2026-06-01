import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { appRoutes, appTabs } from './router/routes';
import { useSettingsQuery } from './hooks/useApiQueries';
import { AnnouncementContext } from './announcementContext';
import { ThemeContext } from './themeContext';
import {
  applyDocumentTheme,
  DEFAULT_THEME,
  type AppTheme,
  persistStoredTheme,
  readStoredTheme,
  readThemeFromSettings,
} from './theme';
import './App.css';

const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'tab active' : 'tab');

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setThemeState] = useState<AppTheme>(() => readStoredTheme() ?? DEFAULT_THEME);
  const [announcement, setAnnouncement] = useState('');
  const settingsQuery = useSettingsQuery(true);
  const hasSyncedSavedTheme = useRef(false);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    persistStoredTheme(nextTheme);
    applyDocumentTheme(nextTheme);
  }, []);

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

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

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <AnnouncementContext.Provider value={announcementContextValue}>
        <a className="skip-link" href="#task-tracker-main">Skip to content</a>
        <div className="app-shell" data-theme={theme}>
        <aside className="sidebar" aria-label="Primary navigation">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">T</span>
            <div>
              <p className="eyebrow">Tracker BE</p>
              <h1>Task Tracker</h1>
            </div>
          </div>
          <p className="sidebar-tagline">Plan work, inspect API calls, and keep execution moving.</p>
          <nav className="tabs sidebar-tabs">
            {appTabs.map(({ label, path }) => (
              <NavLink key={path} to={path} className={navLinkClass}>
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-copy">
              <p className="eyebrow">Productivity workspace</p>
              <h2>Task Tracker</h2>
              <p>Coordinate tasks, planning, calendar exports, imports, and settings from one responsive shell.</p>
            </div>
            <div className="topbar-actions">
              <NavLink to="/tasks" className="button-primary">Quick add</NavLink>
              <button
                type="button"
                className="menu-toggle"
                aria-controls="mobile-navigation"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((open) => !open)}
              >
                <span aria-hidden="true">☰</span>
                Menu
              </button>
            </div>
          </header>

          <nav
            id="mobile-navigation"
            className={`tabs mobile-tabs${isMobileMenuOpen ? ' open' : ''}`}
            aria-label="Mobile navigation"
          >
            {appTabs.map(({ label, path }) => (
              <NavLink key={path} to={path} className={navLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                {label}
              </NavLink>
            ))}
          </nav>

          <main id="task-tracker-main" className="content-area" tabIndex={-1}>
            <div className="content-card route-card">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                {appRoutes.map((route) => <Route key={route.path} path={route.path} element={route.element} />)}
              </Routes>
            </div>
          </main>
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
        </div>
      </div>
      </AnnouncementContext.Provider>
    </ThemeContext.Provider>
  );
}
