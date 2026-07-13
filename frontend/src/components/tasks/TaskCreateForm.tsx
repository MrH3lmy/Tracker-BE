import { forwardRef, useImperativeHandle, useReducer, useRef } from 'react';
import { isTaskStatus, TASK_STATUS_VALUES } from '../../validation/taskStatus';
import { AREA_VALUES, EFFORT_VALUES, RISK_LEVEL_VALUES } from './taskUtils';
import type { CreateTaskPayload, RiskLevel, TaskRecord } from './taskTypes';
import { Button, Checkbox, Field, Input, Select, Textarea } from '../ui';

interface TaskCreateFormState {
  title: string;
  description: string;
  status: '' | CreateTaskPayload['status'];
  dueDate: string;
  startDate: string;
  estimatedMinutes: string;
  actualMinutes: string;
  riskLevel: '' | RiskLevel;
  riskReason: string;
  track: string;
  phase: string;
  parentTaskId: string;
  important: boolean;
  area: string;
  effort: string;
  blockedReason: string;
  waitingOn: string;
  followUpDate: string;
}

type TaskCreateFormAction =
  | { type: 'field'; field: keyof TaskCreateFormState; value: string | boolean }
  | { type: 'reset'; initialState: TaskCreateFormState }
  | { type: 'parent'; parentTaskId: string }
  | { type: 'status'; status: '' | CreateTaskPayload['status'] };

const emptyState: TaskCreateFormState = {
  title: '',
  description: '',
  status: '',
  dueDate: '',
  startDate: '',
  estimatedMinutes: '',
  actualMinutes: '',
  riskLevel: '',
  riskReason: '',
  track: '',
  phase: '',
  parentTaskId: '',
  important: false,
  area: '',
  effort: '',
  blockedReason: '',
  waitingOn: '',
  followUpDate: '',
};

const toFormNumber = (value: number | undefined) => (value === undefined ? '' : String(value));

const mapRecordToFormState = (task: TaskRecord | undefined): TaskCreateFormState => {
  if (!task) return emptyState;
  return {
    title: task.title ?? '',
    description: task.description ?? '',
    status: task.status ?? '',
    dueDate: task.dueDate?.slice(0, 10) ?? '',
    startDate: task.startDate?.slice(0, 10) ?? '',
    estimatedMinutes: toFormNumber(task.estimatedMinutes),
    actualMinutes: toFormNumber(task.actualMinutes),
    riskLevel: task.riskLevel ?? '',
    riskReason: task.riskReason ?? '',
    track: task.track ?? '',
    phase: task.phase ?? '',
    parentTaskId: toFormNumber(task.parentTaskId),
    important: Boolean(task.important),
    area: task.area ?? '',
    effort: task.effort ?? '',
    blockedReason: task.blockedReason ?? '',
    waitingOn: task.waitingOn ?? '',
    followUpDate: task.followUpDate?.slice(0, 10) ?? '',
  };
};

const reducer = (state: TaskCreateFormState, action: TaskCreateFormAction): TaskCreateFormState => {
  switch (action.type) {
    case 'field':
      return { ...state, [action.field]: action.value };
    case 'parent':
      return { ...state, parentTaskId: action.parentTaskId };
    case 'status':
      return { ...state, status: action.status };
    case 'reset':
      return action.initialState;
    default:
      return state;
  }
};

const toOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export interface TaskCreateFormHandle {
  focusTitle: () => void;
  setParentTaskId: (parentTaskId: string) => void;
  setStatus: (status: '' | CreateTaskPayload['status']) => void;
}

interface TaskCreateFormProps {
  activeTasks: TaskRecord[];
  busy: boolean;
  isSubmitting: boolean;
  mode?: 'create' | 'edit';
  initialValue?: TaskRecord;
  onCancel: () => void;
  onSubmit: (payload: CreateTaskPayload, onSuccess: () => void) => void;
  onInvalidTitle: () => void;
}

export const TaskCreateForm = forwardRef<TaskCreateFormHandle, TaskCreateFormProps>(function TaskCreateForm({ activeTasks, busy, isSubmitting, mode = 'create', initialValue, onCancel, onSubmit, onInvalidTitle }, ref) {
  const [form, dispatch] = useReducer(reducer, initialValue, mapRecordToFormState);
  const titleRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusTitle: () => titleRef.current?.focus(),
    setParentTaskId: (parentTaskId: string) => dispatch({ type: 'parent', parentTaskId }),
    setStatus: (status: '' | CreateTaskPayload['status']) => dispatch({ type: 'status', status }),
  }));

  const setField = (field: keyof TaskCreateFormState, value: string | boolean) => dispatch({ type: 'field', field, value });

  const submitForm = () => {
    if (!form.title.trim()) {
      onInvalidTitle();
      titleRef.current?.focus();
      return;
    }
    onSubmit({
      title: form.title.trim(),
      description: form.description || undefined,
      dueDate: form.dueDate || undefined,
      startDate: form.startDate || undefined,
      estimatedMinutes: toOptionalNumber(form.estimatedMinutes),
      actualMinutes: toOptionalNumber(form.actualMinutes),
      riskLevel: form.riskLevel || undefined,
      riskReason: form.riskReason || undefined,
      track: form.track || undefined,
      phase: form.phase || undefined,
      parentTaskId: toOptionalNumber(form.parentTaskId),
      important: form.important,
      area: form.area || undefined,
      effort: form.effort || undefined,
      blockedReason: form.blockedReason || undefined,
      waitingOn: form.waitingOn || undefined,
      followUpDate: form.followUpDate || undefined,
      status: form.status || undefined,
    }, () => dispatch({ type: 'reset', initialState: emptyState }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <Field label="Title" htmlFor="taskTitle">
          <Input id="taskTitle" ref={titleRef} placeholder="Draft launch checklist" value={form.title} onChange={(e) => setField('title', e.target.value)} disabled={busy} aria-invalid={!form.title.trim()} />
        </Field>
        <Field label="Description" htmlFor="taskDescription">
          <Textarea id="taskDescription" placeholder="Add context, acceptance criteria, or notes" value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={busy} rows={3} className="min-h-0" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor="taskStatus">
            <Select id="taskStatus" value={form.status} onChange={(e) => { const nextStatus = e.target.value; setField('status', isTaskStatus(nextStatus) ? nextStatus : ''); }} disabled={busy}>
              <option value="">(no status)</option>
              {TASK_STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Parent task" htmlFor="taskParentTask">
            <Select id="taskParentTask" value={form.parentTaskId} onChange={(e) => setField('parentTaskId', e.target.value)} disabled={busy}>
              <option value="">No parent</option>
              {activeTasks.filter((task) => task.id !== initialValue?.id).map((task) => <option key={`parent-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}
            </Select>
          </Field>
          <Field label="Start date" htmlFor="taskStartDate">
            <Input id="taskStartDate" type="date" value={form.startDate} max={form.dueDate || undefined} onChange={(e) => setField('startDate', e.target.value)} disabled={busy} />
          </Field>
          <Field label="Due date" htmlFor="taskDueDate">
            <Input id="taskDueDate" type="date" value={form.dueDate} min={form.startDate || undefined} onChange={(e) => setField('dueDate', e.target.value)} disabled={busy} />
          </Field>
          <Field label="Estimated minutes" htmlFor="taskEstimatedMinutes">
            <Input id="taskEstimatedMinutes" type="number" min="0" step="15" placeholder="120" value={form.estimatedMinutes} onChange={(e) => setField('estimatedMinutes', e.target.value)} disabled={busy} />
          </Field>
          <Field label="Actual minutes" htmlFor="taskActualMinutes">
            <Input id="taskActualMinutes" type="number" min="0" step="15" placeholder="90" value={form.actualMinutes} onChange={(e) => setField('actualMinutes', e.target.value)} disabled={busy} />
          </Field>
          <Field label="Area" htmlFor="taskArea">
            <Select id="taskArea" value={form.area} onChange={(e) => setField('area', e.target.value)} disabled={busy}>
              <option value="">(default personal)</option>
              {AREA_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Effort" htmlFor="taskEffort">
            <Select id="taskEffort" value={form.effort} onChange={(e) => setField('effort', e.target.value)} disabled={busy}>
              <option value="">(default medium)</option>
              {EFFORT_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Risk level" htmlFor="taskRiskLevel">
            <Select id="taskRiskLevel" value={form.riskLevel} onChange={(e) => setField('riskLevel', e.target.value as '' | RiskLevel)} disabled={busy}>
              <option value="">(default low)</option>
              {RISK_LEVEL_VALUES.map((level) => <option key={level} value={level}>{level}</option>)}
            </Select>
          </Field>
          <Field label="Follow-up date" htmlFor="taskFollowUpDate">
            <Input id="taskFollowUpDate" type="date" value={form.followUpDate} min={form.startDate || undefined} onChange={(e) => setField('followUpDate', e.target.value)} disabled={busy} />
          </Field>
        </div>
        <Field label="Risk reason" htmlFor="taskRiskReason">
          <Input id="taskRiskReason" placeholder="Dependency, uncertainty, or schedule concern" value={form.riskReason} onChange={(e) => setField('riskReason', e.target.value)} disabled={busy} maxLength={500} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Track" htmlFor="taskTrack">
            <Input id="taskTrack" placeholder="Product, marketing, migration" value={form.track} onChange={(e) => setField('track', e.target.value)} disabled={busy} maxLength={120} />
          </Field>
          <Field label="Phase" htmlFor="taskPhase">
            <Input id="taskPhase" placeholder="Discovery, build, launch" value={form.phase} onChange={(e) => setField('phase', e.target.value)} disabled={busy} maxLength={120} />
          </Field>
          <Field label="Blocked reason" htmlFor="taskBlockedReason">
            <Input id="taskBlockedReason" placeholder="Why this task is blocked" value={form.blockedReason} onChange={(e) => setField('blockedReason', e.target.value)} disabled={busy} />
          </Field>
          <Field label="Waiting on" htmlFor="taskWaitingOn">
            <Input id="taskWaitingOn" placeholder="Person, vendor, or event" value={form.waitingOn} onChange={(e) => setField('waitingOn', e.target.value)} disabled={busy} />
          </Field>
        </div>
        <Checkbox
          id="taskImportant"
          label="Mark as important"
          checked={form.important}
          onChange={(e) => setField('important', e.target.checked)}
          disabled={busy}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={submitForm} disabled={busy}>
          {mode === 'edit' ? (isSubmitting ? 'Saving...' : 'Save changes') : (isSubmitting ? 'Creating...' : 'Create task')}
        </Button>
      </div>
    </div>
  );
});
