import { TASK_STATUS_VALUES } from '../../validation/taskStatus';
import type { FilterValue } from './taskTypes';

interface TaskFiltersProps {
  search: string;
  statusFilter: FilterValue;
  areaFilter: FilterValue;
  effortFilter: FilterValue;
  areaOptions: string[];
  effortOptions: string[];
  disabled: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: FilterValue) => void;
  onAreaFilterChange: (value: FilterValue) => void;
  onEffortFilterChange: (value: FilterValue) => void;
}

export function TaskFilters({ search, statusFilter, areaFilter, effortFilter, areaOptions, effortOptions, disabled, onSearchChange, onStatusFilterChange, onAreaFilterChange, onEffortFilterChange }: TaskFiltersProps) {
  return (
    <div className="task-toolbar" aria-label="Task filters">
      <label className="task-search" htmlFor="taskSearch">
        <span>Search</span>
        <input id="taskSearch" placeholder="Title, description, or area" value={search} onChange={(e) => onSearchChange(e.target.value)} />
      </label>
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
    </div>
  );
}
