import type { ReactElement } from 'react';
import type { SectionTabItem } from '../components/SectionTabs';
import { BoardPage } from '../pages/BoardPage';
import { CalendarPage } from '../pages/CalendarPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DeveloperToolsPage } from '../pages/DeveloperToolsPage';
import { HabitAnalysisPage } from '../pages/HabitAnalysisPage';
import { HabitsPage } from '../pages/HabitsPage';
import { ImportPage } from '../pages/ImportPage';
import { InsightsPage } from '../pages/InsightsPage';
import { MatrixPage } from '../pages/MatrixPage';
import { NotesPage } from '../pages/NotesPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { PlanningPage } from '../pages/PlanningPage';
import { SchedulerPage } from '../pages/SchedulerPage';
import { SettingsPage } from '../pages/SettingsPage';
import { TaskDetailPage } from '../pages/TaskDetailPage';
import { TasksPage } from '../pages/TasksPage';

export interface AppRoute {
  label: string;
  path: string;
  element: ReactElement;
}

/** Tasks section: List / Board / Matrix are views of the same task data, not separate products. */
export const TASK_VIEW_TABS: SectionTabItem[] = [
  { path: '/tasks', label: 'List', end: true },
  { path: '/tasks/board', label: 'Board' },
  { path: '/tasks/matrix', label: 'Matrix' },
];

/** Calendar section: Month / Day / Auto-plan absorb the old standalone Calendar, Scheduler, and Planning pages. */
export const CALENDAR_VIEW_TABS: SectionTabItem[] = [
  { path: '/calendar', label: 'Month', end: true },
  { path: '/calendar/day', label: 'Day' },
  { path: '/calendar/auto-plan', label: 'Auto-plan' },
];

// One entry per primary sidebar tab, pointing at that section's default view.
export const primaryRoutes: AppRoute[] = [
  { label: 'Today', path: '/today', element: <DashboardPage /> },
  { label: 'Tasks', path: '/tasks', element: <TasksPage /> },
  { label: 'Habits', path: '/habits', element: <HabitsPage /> },
  { label: 'Notes', path: '/notes', element: <NotesPage /> },
  { label: 'Calendar', path: '/calendar', element: <CalendarPage /> },
  { label: 'Insights', path: '/insights', element: <InsightsPage /> },
  { label: 'Settings', path: '/settings', element: <SettingsPage /> },
  { label: 'Import', path: '/import', element: <ImportPage /> },
];

// Additional views within a section. Reachable by URL and via each section's
// in-page SectionTabs, but not listed individually in the sidebar.
export const sectionRoutes: AppRoute[] = [
  { label: 'Tasks Board', path: '/tasks/board', element: <BoardPage /> },
  { label: 'Tasks Matrix', path: '/tasks/matrix', element: <MatrixPage /> },
  { label: 'Calendar Day', path: '/calendar/day', element: <SchedulerPage /> },
  { label: 'Calendar Auto-plan', path: '/calendar/auto-plan', element: <PlanningPage /> },
];

export const developerRoutes: AppRoute[] = [
  { label: 'Error Playground', path: '/errors', element: <PlaceholderPage title="Error Playground" /> },
  { label: 'Developer Tools', path: '/developer-tools', element: <DeveloperToolsPage /> },
];

// Routes that render via the router but do not appear as sidebar tabs.
export const detailRoutes: AppRoute[] = [
  { label: 'Task Detail', path: '/tasks/:id', element: <TaskDetailPage /> },
  { label: 'Habit Analysis', path: '/habits/analysis', element: <HabitAnalysisPage /> },
];

// Old top-level routes that moved under a section. Kept working via redirect
// so bookmarks and saved links don't break.
export const legacyRedirects: { from: string; to: string }[] = [
  { from: '/dashboard', to: '/today' },
  { from: '/board', to: '/tasks/board' },
  { from: '/matrix', to: '/tasks/matrix' },
  { from: '/planning', to: '/calendar/auto-plan' },
  { from: '/scheduler', to: '/calendar/day' },
];

export const appRoutes = [...primaryRoutes, ...sectionRoutes, ...developerRoutes, ...detailRoutes];

export const appTabs = primaryRoutes.map(({ label, path }) => ({ label, path }));
export const developerTabs = developerRoutes.map(({ label, path }) => ({ label, path }));
