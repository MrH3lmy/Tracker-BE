import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

const navIcons: Record<string, ReactNode> = {
  Dashboard: <path d="M3 10.8 12 3l9 7.8v8.7a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5v-8.7Z" />,
  Tasks: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  Planning: <path d="M7 3v3M17 3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 8 2 2 4-4" />,
  Matrix: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
  Calendar: <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />,
  Settings: <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.2 4.8c.1-.4.1-.8.1-1.3s0-.9-.1-1.3l2-1.5-2-3.4-2.4 1a8.7 8.7 0 0 0-2.2-1.3L15.3 3h-4l-.4 2.5a8.7 8.7 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.5c-.1.4-.1.8-.1 1.3s0 .9.1 1.3l-2 1.5 2 3.4 2.4-1c.7.5 1.4 1 2.2 1.3l.4 2.5h4l.4-2.5a8.7 8.7 0 0 0 2.2-1.3l2.4 1 2-3.4-2.1-1.5Z" />,
  Import: <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  'Error Playground': <path d="M12 8v5m0 4h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
  'Developer Tools': <path d="M8 9 4 12l4 3m8-6 4 3-4 3M14 5l-4 14" />,
};

function SidebarIcon({ label }: { label: string }) {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      {navIcons[label] ?? navIcons.Dashboard}
    </svg>
  );
}

function SidebarItem({ label, path, onClick }: { label: string; path: string; onClick?: () => void }) {
  return (
    <NavLink key={path} to={path} className={navLinkClass} onClick={onClick}>
      <SidebarIcon label={label} />
      <span>{label}</span>
    </NavLink>
  );
}

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
              <SidebarItem key={path} label={label} path={path} />
            ))}
          </nav>
          <div className="sidebar-profile" aria-label="Signed in user">
            <span className="profile-avatar" aria-hidden="true">JD</span>
            <div className="profile-copy">
              <strong>John Doe</strong>
              <span>john.doe@trackerbe.com</span>
            </div>
            <span className="profile-chevron" aria-hidden="true">⌄</span>
          </div>
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
              <SidebarItem key={path} label={label} path={path} onClick={() => setIsMobileMenuOpen(false)} />
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
