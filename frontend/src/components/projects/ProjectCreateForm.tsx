import { forwardRef, useImperativeHandle, useReducer, useRef } from 'react';
import { AREA_VALUES } from '../tasks/taskUtils';
import { PROJECT_STATUS_VALUES, type CreateProjectPayload, type ProjectRecord, type ProjectStatus } from './projectTypes';
import { formatEnumLabel } from '../../lib/enumLabels';
import { Button, Field, Input, Select, Textarea } from '../ui';

interface ProjectCreateFormState {
  name: string;
  description: string;
  status: '' | ProjectStatus;
  startDate: string;
  targetDate: string;
  area: string;
  goal: string;
}

const emptyState: ProjectCreateFormState = {
  name: '',
  description: '',
  status: '',
  startDate: '',
  targetDate: '',
  area: '',
  goal: '',
};

const mapRecordToFormState = (project: ProjectRecord | undefined): ProjectCreateFormState => {
  if (!project) return emptyState;
  return {
    name: project.name ?? '',
    description: project.description ?? '',
    status: project.status ?? '',
    startDate: project.startDate?.slice(0, 10) ?? '',
    targetDate: project.targetDate?.slice(0, 10) ?? '',
    area: project.area ?? '',
    goal: project.goal ?? '',
  };
};

type Action = { type: 'field'; field: keyof ProjectCreateFormState; value: string } | { type: 'reset'; initialState: ProjectCreateFormState };

const reducer = (state: ProjectCreateFormState, action: Action): ProjectCreateFormState => {
  if (action.type === 'reset') return action.initialState;
  return { ...state, [action.field]: action.value };
};

export interface ProjectCreateFormHandle {
  focusName: () => void;
}

interface ProjectCreateFormProps {
  busy: boolean;
  isSubmitting: boolean;
  mode?: 'create' | 'edit';
  initialValue?: ProjectRecord;
  onCancel: () => void;
  onSubmit: (payload: CreateProjectPayload, onSuccess: () => void) => void;
  onInvalidName: () => void;
}

export const ProjectCreateForm = forwardRef<ProjectCreateFormHandle, ProjectCreateFormProps>(function ProjectCreateForm(
  { busy, isSubmitting, mode = 'create', initialValue, onCancel, onSubmit, onInvalidName },
  ref,
) {
  const [form, dispatch] = useReducer(reducer, initialValue, mapRecordToFormState);
  const nameRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusName: () => nameRef.current?.focus(),
  }));

  const setField = (field: keyof ProjectCreateFormState, value: string) => dispatch({ type: 'field', field, value });

  const submitForm = () => {
    if (!form.name.trim()) {
      onInvalidName();
      nameRef.current?.focus();
      return;
    }
    onSubmit({
      name: form.name.trim(),
      description: form.description || undefined,
      status: form.status || undefined,
      startDate: form.startDate || undefined,
      targetDate: form.targetDate || undefined,
      area: form.area || undefined,
      goal: form.goal || undefined,
    }, () => dispatch({ type: 'reset', initialState: emptyState }));
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name" htmlFor="projectName">
        <Input id="projectName" ref={nameRef} placeholder="Website relaunch" value={form.name} onChange={(e) => setField('name', e.target.value)} disabled={busy} aria-invalid={!form.name.trim()} />
      </Field>
      <Field label="Description" htmlFor="projectDescription">
        <Textarea id="projectDescription" placeholder="What this project covers" value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={busy} rows={3} className="min-h-0" />
      </Field>
      <Field label="Goal" htmlFor="projectGoal">
        <Textarea id="projectGoal" placeholder="What success looks like" value={form.goal} onChange={(e) => setField('goal', e.target.value)} disabled={busy} rows={2} className="min-h-0" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status" htmlFor="projectStatus">
          <Select id="projectStatus" value={form.status} onChange={(e) => setField('status', e.target.value)} disabled={busy}>
            <option value="">(default planning)</option>
            {PROJECT_STATUS_VALUES.map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
          </Select>
        </Field>
        <Field label="Area" htmlFor="projectArea">
          <Select id="projectArea" value={form.area} onChange={(e) => setField('area', e.target.value)} disabled={busy}>
            <option value="">(none)</option>
            {AREA_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
        </Field>
        <Field label="Start date" htmlFor="projectStartDate">
          <Input id="projectStartDate" type="date" value={form.startDate} max={form.targetDate || undefined} onChange={(e) => setField('startDate', e.target.value)} disabled={busy} />
        </Field>
        <Field label="Target date" htmlFor="projectTargetDate">
          <Input id="projectTargetDate" type="date" value={form.targetDate} min={form.startDate || undefined} onChange={(e) => setField('targetDate', e.target.value)} disabled={busy} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={submitForm} disabled={busy}>
          {mode === 'edit' ? (isSubmitting ? 'Saving...' : 'Save changes') : (isSubmitting ? 'Creating...' : 'Create project')}
        </Button>
      </div>
    </div>
  );
});
