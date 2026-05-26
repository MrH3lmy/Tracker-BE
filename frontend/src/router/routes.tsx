import type { ReactElement } from 'react';
import { CalendarPage } from '../pages/CalendarPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ImportPage } from '../pages/ImportPage';
import { MatrixPage } from '../pages/MatrixPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { PlanningPage } from '../pages/PlanningPage';
import { SettingsPage } from '../pages/SettingsPage';
import { TasksPage } from '../pages/TasksPage';

export interface AppRoute {
  label: string;
  path: string;
  element: ReactElement;
}

export const appRoutes: AppRoute[] = [
  { label: 'Dashboard', path: '/dashboard', element: <DashboardPage /> },
  { label: 'Tasks', path: '/tasks', element: <TasksPage /> },
  { label: 'Planning', path: '/planning', element: <PlanningPage /> },
  { label: 'Matrix', path: '/matrix', element: <MatrixPage /> },
  { label: 'Calendar', path: '/calendar', element: <CalendarPage /> },
  { label: 'Settings', path: '/settings', element: <SettingsPage /> },
  { label: 'Import', path: '/import', element: <ImportPage /> },
  { label: 'Error Playground', path: '/errors', element: <PlaceholderPage title="Error Playground" /> },
];

export const appTabs = appRoutes.map(({ label, path }) => ({ label, path }));
