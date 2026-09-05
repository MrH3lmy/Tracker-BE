/**
 * Saved task views stay in `localStorage` under the key they have always used - issue #304 is
 * explicit that they must not move to a backend model without a demonstrated product requirement.
 * Only their *placement* changed (a discoverable "Views" menu in the toolbar instead of a
 * collapsible buried inside the filters popover); the stored shape is unchanged, so views saved
 * before this redesign keep working.
 */
export const SAVED_VIEWS_KEY = 'tracker.task.savedViews';

export interface SavedTaskView {
  name: string;
  params: string;
}

export const readSavedViews = (): SavedTaskView[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_VIEWS_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((view): view is SavedTaskView => typeof view?.name === 'string' && typeof view?.params === 'string');
  } catch {
    return [];
  }
};

export const writeSavedViews = (views: SavedTaskView[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
};

export const upsertSavedView = (views: SavedTaskView[], view: SavedTaskView): SavedTaskView[] => {
  const existingIndex = views.findIndex((candidate) => candidate.name === view.name);
  if (existingIndex === -1) return [...views, view].sort((a, b) => a.name.localeCompare(b.name));
  return views.map((candidate, index) => (index === existingIndex ? view : candidate));
};

export const renameSavedView = (views: SavedTaskView[], from: string, to: string): SavedTaskView[] => views
  .filter((view) => view.name !== to || view.name === from)
  .map((view) => (view.name === from ? { ...view, name: to } : view))
  .sort((a, b) => a.name.localeCompare(b.name));

export const removeSavedView = (views: SavedTaskView[], name: string): SavedTaskView[] => views.filter((view) => view.name !== name);
