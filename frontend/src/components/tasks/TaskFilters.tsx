import { TASK_STATUS_VALUES } from '../../validation/taskStatus';
import { formatEnumLabel } from '../../lib/enumLabels';
import type { FilterValue } from './taskTypes';
import { Button, Field, Input, Select } from '../ui';
import type { ProjectRecord } from '../projects/projectTypes';

export interface TaskFiltersProps {
  statusFilter: FilterValue;
  projectFilter: FilterValue;
  areaFilter: FilterValue;
  effortFilter: FilterValue;
  dueFrom: string;
  dueTo: string;
  activeFilterCount: number;
  areaOptions: string[];
  effortOptions: string[];
  projects: ProjectRecord[];
  disabled: boolean;
  onStatusFilterChange: (value: FilterValue) => void;
  onProjectFilterChange: (value: FilterValue) => void;
  onAreaFilterChange: (value: FilterValue) => void;
  onEffortFilterChange: (value: FilterValue) => void;
  onDueFromChange: (value: string) => void;
  onDueToChange: (value: string) => void;
  onClearAll: () => void;
}

/**
 * Secondary filters only. Search, sort and saved views moved out to the toolbar, and overdue-only
 * moved to the workspace rail: issue #304 asks which filters deserve primary visibility, and the
 * skill's "Compact Control Semantics" rule wants one home per control rather than a duplicate
 * inside a popover. Every filter here is still URL-backed and still removable as a chip.
 */
export function TaskFilters({
  statusFilter,
  projectFilter,
  areaFilter,
  effortFilter,
  dueFrom,
  dueTo,
  activeFilterCount,
  areaOptions,
  effortOptions,
  projects,
  disabled,
  onStatusFilterChange,
  onProjectFilterChange,
  onAreaFilterChange,
  onEffortFilterChange,
  onDueFromChange,
  onDueToChange,
  onClearAll,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-4" aria-label="Task filters">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">
          <strong className="font-semibold text-fg">{activeFilterCount}</strong> active filter{activeFilterCount === 1 ? '' : 's'} / sort
        </p>
        <Button size="sm" variant="ghost" onClick={onClearAll} disabled={activeFilterCount === 0}>Clear all</Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status" htmlFor="statusFilter">
          <Select id="statusFilter" value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} disabled={disabled}>
            <option value="all">All statuses</option>
            {TASK_STATUS_VALUES.map((s) => <option key={s} value={s}>{formatEnumLabel(s)}</option>)}
          </Select>
        </Field>
        <Field label="Project" htmlFor="projectFilter">
          <Select id="projectFilter" value={projectFilter} onChange={(e) => onProjectFilterChange(e.target.value)} disabled={disabled}>
            <option value="all">All projects</option>
            <option value="none">No project</option>
            {projects.map((project) => <option key={project.id} value={String(project.id)}>{project.name}</option>)}
          </Select>
        </Field>
        <Field label="Area" htmlFor="areaFilter">
          <Select id="areaFilter" value={areaFilter} onChange={(e) => onAreaFilterChange(e.target.value)} disabled={disabled}>
            <option value="all">All areas</option>
            {areaOptions.map((area) => <option key={area} value={area}>{formatEnumLabel(area)}</option>)}
          </Select>
        </Field>
        <Field label="Effort" htmlFor="effortFilter">
          <Select id="effortFilter" value={effortFilter} onChange={(e) => onEffortFilterChange(e.target.value)} disabled={disabled}>
            <option value="all">All effort</option>
            {effortOptions.map((effort) => <option key={effort} value={effort}>{formatEnumLabel(effort)}</option>)}
          </Select>
        </Field>
        <Field label="Due from" htmlFor="dueFromFilter">
          <Input id="dueFromFilter" type="date" value={dueFrom} max={dueTo || undefined} onChange={(e) => onDueFromChange(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Due to" htmlFor="dueToFilter">
          <Input id="dueToFilter" type="date" value={dueTo} min={dueFrom || undefined} onChange={(e) => onDueToChange(e.target.value)} disabled={disabled} />
        </Field>
      </div>
    </div>
  );
}
