import { useEffect, useMemo, useState } from 'react';
import { TASK_STATUS_VALUES } from '../../validation/taskStatus';
import type { FilterValue, TaskSortValue } from './taskTypes';
import styles from './TaskFilters.module.css';

const SAVED_VIEWS_KEY = 'tracker.task.savedViews';

interface SavedTaskView {
  name: string;
  params: string;
}

interface TaskFiltersProps {
  search: string;
  statusFilter: FilterValue;
  areaFilter: FilterValue;
  effortFilter: FilterValue;
  dueFrom: string;
  dueTo: string;
  overdueOnly: boolean;
  sort: TaskSortValue;
  activeFilterCount: number;
  areaOptions: string[];
  effortOptions: string[];
  disabled: boolean;
  serializedFilters: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: FilterValue) => void;
  onAreaFilterChange: (value: FilterValue) => void;
  onEffortFilterChange: (value: FilterValue) => void;
  onDueFromChange: (value: string) => void;
  onDueToChange: (value: string) => void;
  onOverdueOnlyChange: (value: boolean) => void;
  onSortChange: (value: TaskSortValue) => void;
  onClearAll: () => void;
  onApplySavedView: (params: string) => void;
  showSearch?: boolean;
}

const readSavedViews = (): SavedTaskView[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_VIEWS_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((view): view is SavedTaskView => typeof view?.name === 'string' && typeof view?.params === 'string');
  } catch {
    return [];
  }
};

const writeSavedViews = (views: SavedTaskView[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
};

export function TaskFilters({ search, statusFilter, areaFilter, effortFilter, dueFrom, dueTo, overdueOnly, sort, activeFilterCount, areaOptions, effortOptions, disabled, serializedFilters, onSearchChange, onStatusFilterChange, onAreaFilterChange, onEffortFilterChange, onDueFromChange, onDueToChange, onOverdueOnlyChange, onSortChange, onClearAll, onApplySavedView, showSearch = true }: TaskFiltersProps) {
  const [savedViews, setSavedViews] = useState<SavedTaskView[]>(readSavedViews);
  const [viewName, setViewName] = useState('');
  const [selectedViewName, setSelectedViewName] = useState('');
  const selectedView = useMemo(() => savedViews.find((view) => view.name === selectedViewName), [savedViews, selectedViewName]);

  useEffect(() => writeSavedViews(savedViews), [savedViews]);

  const saveCurrentView = () => {
    const trimmedName = viewName.trim();
    if (!trimmedName) return;
    setSavedViews((views) => {
      const nextView = { name: trimmedName, params: serializedFilters };
      const existingIndex = views.findIndex((view) => view.name === trimmedName);
      if (existingIndex === -1) return [...views, nextView].sort((a, b) => a.name.localeCompare(b.name));
      return views.map((view, index) => (index === existingIndex ? nextView : view));
    });
    setSelectedViewName(trimmedName);
    setViewName('');
  };

  const renameSelectedView = () => {
    const trimmedName = viewName.trim();
    if (!selectedView || !trimmedName) return;
    setSavedViews((views) => views
      .filter((view) => view.name !== trimmedName || view.name === selectedView.name)
      .map((view) => (view.name === selectedView.name ? { ...view, name: trimmedName } : view))
      .sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedViewName(trimmedName);
    setViewName('');
  };

  const deleteSelectedView = () => {
    if (!selectedView) return;
    setSavedViews((views) => views.filter((view) => view.name !== selectedView.name));
    setSelectedViewName('');
  };

  return (
    <div className={`task-filter-panel ${styles.panel}`} aria-label="Task filters">
      <div className={styles.summary}><strong>{activeFilterCount}</strong> active filter{activeFilterCount === 1 ? '' : 's'} / sort</div>
      <div className={styles.toolbar}>
        {showSearch && (
          <label className={styles.search} htmlFor="taskSearch">
            <span>Search</span>
            <input id="taskSearch" placeholder="Title, description, or area" value={search} onChange={(e) => onSearchChange(e.target.value)} disabled={disabled} />
          </label>
        )}
        <label htmlFor="statusFilter">
          <span>Status</span>
          <select id="statusFilter" value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} disabled={disabled}>
            <option value="all">All statuses</option>
            {TASK_STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label htmlFor="areaFilter">
          <span>Area</span>
          <select id="areaFilter" value={areaFilter} onChange={(e) => onAreaFilterChange(e.target.value)} disabled={disabled}>
            <option value="all">All areas</option>
            {areaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
        </label>
        <label htmlFor="effortFilter">
          <span>Effort</span>
          <select id="effortFilter" value={effortFilter} onChange={(e) => onEffortFilterChange(e.target.value)} disabled={disabled}>
            <option value="all">All effort</option>
            {effortOptions.map((effort) => <option key={effort} value={effort}>{effort}</option>)}
          </select>
        </label>
        <label htmlFor="dueFromFilter">
          <span>Due from</span>
          <input id="dueFromFilter" type="date" value={dueFrom} max={dueTo || undefined} onChange={(e) => onDueFromChange(e.target.value)} disabled={disabled} />
        </label>
        <label htmlFor="dueToFilter">
          <span>Due to</span>
          <input id="dueToFilter" type="date" value={dueTo} min={dueFrom || undefined} onChange={(e) => onDueToChange(e.target.value)} disabled={disabled} />
        </label>
        <label htmlFor="sortFilter">
          <span>Sort by</span>
          <select id="sortFilter" value={sort} onChange={(e) => onSortChange(e.target.value as TaskSortValue)} disabled={disabled}>
            <option value="position">Board position</option>
            <option value="priorityScore">Priority score (high first)</option>
            <option value="dueDate">Due date (soonest first)</option>
            <option value="createdDate">Created date (newest first)</option>
            <option value="effort">Effort (low first)</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </label>
        <label className={styles.checkboxFilter} htmlFor="overdueFilter">
          <span>Overdue</span>
          <input id="overdueFilter" type="checkbox" checked={overdueOnly} onChange={(e) => onOverdueOnlyChange(e.target.checked)} disabled={disabled} />
          <small>Only overdue tasks</small>
        </label>
        <div className={styles.actions}><button type="button" onClick={onClearAll} disabled={activeFilterCount === 0}>Clear all</button></div>
      </div>
      <details className={styles.savedViews}>
        <summary>Saved views</summary>
        <div className={styles.savedViewsContent} aria-label="Saved task views">
          <label htmlFor="savedTaskView">
            <span>Saved view</span>
            <select id="savedTaskView" value={selectedViewName} onChange={(e) => setSelectedViewName(e.target.value)} disabled={disabled}>
              <option value="">Select a saved view</option>
              {savedViews.map((view) => <option key={view.name} value={view.name}>{view.name}</option>)}
            </select>
          </label>
          <label htmlFor="savedTaskViewName" className={styles.search}>
            <span>View name</span>
            <input id="savedTaskViewName" placeholder="My focused view" value={viewName} onChange={(e) => setViewName(e.target.value)} disabled={disabled} />
          </label>
          <div className={`${styles.actions} ${styles.savedViewActions}`}>
            <button type="button" onClick={() => selectedView && onApplySavedView(selectedView.params)} disabled={disabled || !selectedView}>Apply</button>
            <button type="button" onClick={saveCurrentView} disabled={disabled || !viewName.trim()}>Save current</button>
            <button type="button" onClick={renameSelectedView} disabled={disabled || !selectedView || !viewName.trim()}>Rename</button>
            <button type="button" onClick={deleteSelectedView} disabled={disabled || !selectedView}>Delete</button>
          </div>
        </div>
      </details>
    </div>
  );
}
