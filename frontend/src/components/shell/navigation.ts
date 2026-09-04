import type { ComponentType } from 'react';
import {
  AlertTriangle,
  Calendar,
  Flame,
  Import,
  LayoutDashboard,
  ListTodo,
  Search,
  Settings,
  StickyNote,
  TrendingUp,
  Wrench,
} from '../ui/icons';
import { CALENDAR_VIEW_TABS, TASK_VIEW_TABS, appTabs, detailRoutes, developerTabs } from '../../router/routes';

export type NavIcon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

export interface NavItem {
  label: string;
  path: string;
  icon: NavIcon;
}

export interface NavGroup {
  /** Rendered as a group heading; also the accessible name of the group's <nav>. */
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_ICONS: Record<string, NavIcon> = {
  Today: LayoutDashboard,
  Tasks: ListTodo,
  Habits: Flame,
  Notes: StickyNote,
  Calendar: Calendar,
  Insights: TrendingUp,
  Search: Search,
  Settings: Settings,
  Import: Import,
  'Error Playground': AlertTriangle,
  'Developer Tools': Wrench,
};

/**
 * `nav-hierarchy`: primary and secondary navigation must be clearly separated.
 * The previous shell listed all nine destinations as one flat run, which mixed
 * the places work *lives* with the tools that configure it. These two groups are
 * the separation; they are labelled, not merely spaced apart.
 */
const WORKSPACE_LABELS = ['Today', 'Tasks', 'Habits', 'Notes', 'Calendar', 'Insights'];

const toNavItem = ({ label, path }: { label: string; path: string }): NavItem => ({
  label,
  path,
  icon: NAV_ICONS[label] ?? LayoutDashboard,
});

/** Where work lives. */
export const workspaceNavItems: NavItem[] = appTabs
  .filter(({ label }) => WORKSPACE_LABELS.includes(label))
  .map(toNavItem);

/** Tools that act on the workspaces rather than holding work themselves. */
export const manageNavItems: NavItem[] = appTabs
  .filter(({ label }) => !WORKSPACE_LABELS.includes(label))
  .map(toNavItem);

export const developerNavItems: NavItem[] = developerTabs.map(toNavItem);

export function buildNavGroups(includeDeveloper: boolean): NavGroup[] {
  const groups: NavGroup[] = [
    { id: 'workspaces', label: 'Workspaces', items: workspaceNavItems },
    { id: 'manage', label: 'Manage', items: manageNavItems },
  ];
  if (includeDeveloper && developerNavItems.length > 0) {
    groups.push({ id: 'developer', label: 'Developer', items: developerNavItems });
  }
  return groups;
}

/**
 * `bottom-nav-limit`: max five items, each with an icon *and* a visible label.
 * `bottom-nav-top-level`: destinations only -- the previous bar spent one of its
 * five slots on the Quick add action, which is why Quick add is now a separate
 * button rather than a tab.
 *
 * Habits keeps a slot because a habit check-in is the highest-frequency,
 * shortest-dwell interaction in the product, which is exactly what a tab bar is
 * for. Calendar and Insights are long-dwell destinations and sit one tap away
 * behind "More".
 */
const MOBILE_TAB_LABELS = ['Today', 'Tasks', 'Habits', 'Notes'];

export const mobileTabItems: NavItem[] = MOBILE_TAB_LABELS.map(
  (label) => workspaceNavItems.find((item) => item.label === label),
).filter((item): item is NavItem => Boolean(item));

/** True when `pathname` is `routePath` or a descendant of it. */
export const pathMatchesRoute = (pathname: string, routePath: string) =>
  pathname === routePath || pathname.startsWith(`${routePath}/`);

export interface Crumb {
  label: string;
  /** Omitted for the trailing crumb, which is the current page. */
  path?: string;
}

const SECTION_TABS_BY_ROOT: Record<string, { path: string; label: string; end?: boolean }[]> = {
  '/tasks': TASK_VIEW_TABS,
  '/calendar': CALENDAR_VIEW_TABS,
};

/**
 * `breadcrumb-web`: routes three levels deep (`/tasks/projects/:id`, `/notes/:id`)
 * need orientation. The previous shell showed only a single route label, so a
 * project detail page was indistinguishable from the projects list.
 *
 * Crumbs are derived from routes that already exist -- this adds orientation, it
 * does not change the IA.
 */
export function buildBreadcrumbs(pathname: string, recordLabel?: string): Crumb[] {
  const allTabs = [...appTabs, ...developerTabs];
  const root = allTabs.find(({ path }) => pathMatchesRoute(pathname, path));
  if (!root) {
    // Detail routes that hang off no primary tab (e.g. /weekly-review) still
    // need a name; fall back to the route table rather than mislabelling them.
    const detail = detailRoutes.find(({ path }) => pathMatchesRoute(pathname, path));
    return [{ label: recordLabel ?? detail?.label ?? 'Tracker' }];
  }

  const crumbs: Crumb[] = [{ label: root.label, path: root.path }];
  const sectionTabs = SECTION_TABS_BY_ROOT[root.path] ?? [];

  // Deepest matching section tab, so /tasks/projects/7 picks "Projects".
  const section = sectionTabs
    .filter((tab) => !tab.end && pathMatchesRoute(pathname, tab.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (section) crumbs.push({ label: section.label, path: section.path });

  const deepest = section?.path ?? root.path;
  if (pathname !== deepest && recordLabel) crumbs.push({ label: recordLabel });

  // A crumb pointing at the page you are already on is not a link.
  const last = crumbs[crumbs.length - 1];
  if (last?.path === pathname) delete last.path;
  return crumbs;
}
