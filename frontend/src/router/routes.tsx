import type { ReactElement } from 'react';
import { BoardPage } from '../pages/BoardPage';
import { CalendarPage } from '../pages/CalendarPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DeveloperToolsPage } from '../pages/DeveloperToolsPage';
import { ImportPage } from '../pages/ImportPage';
import { MatrixPage } from '../pages/MatrixPage';
import { NotesPage } from '../pages/NotesPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { PlanningPage } from '../pages/PlanningPage';
import { SettingsPage } from '../pages/SettingsPage';
import { TaskDetailPage } from '../pages/TaskDetailPage';
import { TasksPage } from '../pages/TasksPage';

export interface AppRoute {
  label: string;
  path: string;
  element: ReactElement;
}

export const primaryRoutes: AppRoute[] = [
  { label: 'Dashboard', path: '/dashboard', element: <DashboardPage /> },
  { label: 'Tasks', path: '/tasks', element: <TasksPage /> },
  { label: 'Board', path: '/board', element: <BoardPage /> },
  { label: 'Notes', path: '/notes', element: <NotesPage /> },
  { label: 'Planning', path: '/planning', element: <PlanningPage /> },
  { label: 'Matrix', path: '/matrix', element: <MatrixPage /> },
  { label: 'Calendar', path: '/calendar', element: <CalendarPage /> },
  { label: 'Settings', path: '/settings', element: <SettingsPage /> },
  { label: 'Import', path: '/import', element: <ImportPage /> },
];

export const developerRoutes: AppRoute[] = [
  { label: 'Error Playground', path: '/errors', element: <PlaceholderPage title="Error Playground" /> },
  { label: 'Developer Tools', path: '/developer-tools', element: <DeveloperToolsPage /> },
];

// Routes that render via the router but do not appear as sidebar tabs.
export const detailRoutes: AppRoute[] = [
  { label: 'Task Detail', path: '/tasks/:id', element: <TaskDetailPage /> },
];

export const appRoutes = [...primaryRoutes, ...developerRoutes, ...detailRoutes];

export const appTabs = primaryRoutes.map(({ label, path }) => ({ label, path }));
export const developerTabs = developerRoutes.map(({ label, path }) => ({ label, path }));
