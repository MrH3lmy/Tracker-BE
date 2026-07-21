import { forwardRef, useImperativeHandle, useReducer, useRef } from 'react';
import { isTaskStatus, TASK_STATUS_VALUES } from '../../validation/taskStatus';
import { DAY_OF_WEEK_VALUES, RECURRENCE_FREQUENCY_VALUES, isRecurrenceFrequency, type DayOfWeekValue, type RecurrenceFrequency } from '../../validation/recurrence';
import { AREA_VALUES, EFFORT_VALUES, RISK_LEVEL_VALUES } from './taskUtils';
import type { CreateTaskPayload, RecurrenceRuleRecord, RiskLevel, TaskRecord } from './taskTypes';
import type { ProjectRecord } from '../projects/projectTypes';
import { Button, Checkbox, Field, Input, Select, Textarea } from '../ui';

const formatAnnualDate = (month: string, day: string): string | undefined => {
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return `--${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const parseAnnualDate = (value?: string): { month: string; day: string } => {
  const match = value?.match(/^--(\d{2})-(\d{2})$/);
  if (!match) return { month: '', day: '' };
  return { month: String(Number(match[1])), day: String(Number(match[2])) };
};

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
  recurrenceFrequency: '' | RecurrenceFrequency;
  recurrenceInterval: string;
  recurrenceDaysOfWeek: DayOfWeekValue[];
  recurrenceDayOfMonth: string;
  recurrenceAnnualMonth: string;
  recurrenceAnnualDay: string;
}

type TaskCreateFormAction =
  | { type: 'field'; field: keyof TaskCreateFormState; value: string | boolean }
  | { type: 'reset'; initialState: TaskCreateFormState }
  | { type: 'parent'; parentTaskId: string }
  | { type: 'status'; status: '' | CreateTaskPayload['status'] }
  | { type: 'toggleDay'; day: DayOfWeekValue };

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
  recurrenceFrequency: '',
  recurrenceInterval: '1',
  recurrenceDaysOfWeek: [],
  recurrenceDayOfMonth: '',
  recurrenceAnnualMonth: '',
  recurrenceAnnualDay: '',
};

const toFormNumber = (value: number | undefined) => (value === undefined ? '' : String(value));

const mapRecordToFormState = (task: TaskRecord | undefined): TaskCreateFormState => {
  if (!task) return emptyState;
  const recurrence: RecurrenceRuleRecord | undefined = task.recurrence;
  const annualDate = parseAnnualDate(recurrence?.annualDate);
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
    recurrenceFrequency: recurrence && isRecurrenceFrequency(recurrence.frequency) ? recurrence.frequency : '',
    recurrenceInterval: toFormNumber(recurrence?.interval) || '1',
    recurrenceDaysOfWeek: recurrence?.daysOfWeek ?? [],
    recurrenceDayOfMonth: toFormNumber(recurrence?.dayOfMonth),
    recurrenceAnnualMonth: annualDate.month,
    recurrenceAnnualDay: annualDate.day,
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
    case 'toggleDay':
      return {
        ...state,
        recurrenceDaysOfWeek: state.recurrenceDaysOfWeek.includes(action.day)
          ? state.recurrenceDaysOfWeek.filter((day) => day !== action.day)
          : [...state.recurrenceDaysOfWeek, action.day],
      };
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
  projects?: ProjectRecord[];
  projectId?: string;
  onProjectIdChange?: (projectId: string) => void;
  busy: boolean;
  isSubmitting: boolean;
  mode?: 'create' | 'edit';
  initialValue?: TaskRecord;
  onCancel: () => void;
  onSubmit: (payload: CreateTaskPayload, onSuccess: () => void) => void;
  onInvalidTitle: () => void;
}

export const TaskCreateForm = forwardRef<TaskCreateFormHandle, TaskCreateFormProps>(function TaskCreateForm({ activeTasks, projects, projectId, onProjectIdChange, busy, isSubmitting, mode = 'create', initialValue, onCancel, onSubmit, onInvalidTitle }, ref) {
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
    const recurrence: RecurrenceRuleRecord | undefined = form.recurrenceFrequency
      ? {
          frequency: form.recurrenceFrequency,
          interval: toOptionalNumber(form.recurrenceInterval) ?? 1,
          daysOfWeek: form.recurrenceFrequency === 'WEEKLY' ? form.recurrenceDaysOfWeek : undefined,
          dayOfMonth: form.recurrenceFrequency === 'MONTHLY' ? toOptionalNumber(form.recurrenceDayOfMonth) : undefined,
          annualDate: form.recurrenceFrequency === 'YEARLY' ? formatAnnualDate(form.recurrenceAnnualMonth, form.recurrenceAnnualDay) : undefined,
        }
      : undefined;
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
      recurrence,
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
          {projects && onProjectIdChange && (
            <Field label="Project" htmlFor="taskProject">
              <Select id="taskProject" value={projectId ?? ''} onChange={(e) => onProjectIdChange(e.target.value)} disabled={busy}>
                <option value="">No project</option>
                {projects.map((project) => <option key={`project-${project.id}`} value={project.id}>{project.name}</option>)}
              </Select>
            </Field>
          )}
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
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <Field label="Repeats" htmlFor="taskRecurrenceFrequency">
            <Select
              id="taskRecurrenceFrequency"
              value={form.recurrenceFrequency}
              onChange={(e) => { const next = e.target.value; setField('recurrenceFrequency', isRecurrenceFrequency(next) ? next : ''); }}
              disabled={busy}
            >
              <option value="">Does not repeat</option>
              {RECURRENCE_FREQUENCY_VALUES.map((freq) => <option key={freq} value={freq}>{freq}</option>)}
            </Select>
          </Field>

          {form.recurrenceFrequency && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Every" htmlFor="taskRecurrenceInterval">
                <Input id="taskRecurrenceInterval" type="number" min="1" step="1" value={form.recurrenceInterval} onChange={(e) => setField('recurrenceInterval', e.target.value)} disabled={busy} />
              </Field>

              {form.recurrenceFrequency === 'WEEKLY' && (
                <div className="col-span-2 flex flex-wrap gap-3" role="group" aria-label="Days of week">
                  {DAY_OF_WEEK_VALUES.map((day) => (
                    <Checkbox
                      key={day}
                      id={`taskRecurrenceDay-${day}`}
                      label={day.slice(0, 3)}
                      checked={form.recurrenceDaysOfWeek.includes(day)}
                      onChange={() => dispatch({ type: 'toggleDay', day })}
                      disabled={busy}
                    />
                  ))}
                </div>
              )}

              {form.recurrenceFrequency === 'MONTHLY' && (
                <Field label="Day of month" htmlFor="taskRecurrenceDayOfMonth">
                  <Input id="taskRecurrenceDayOfMonth" type="number" min="1" max="31" value={form.recurrenceDayOfMonth} onChange={(e) => setField('recurrenceDayOfMonth', e.target.value)} disabled={busy} />
                </Field>
              )}

              {form.recurrenceFrequency === 'YEARLY' && (
                <>
                  <Field label="Month" htmlFor="taskRecurrenceAnnualMonth">
                    <Input id="taskRecurrenceAnnualMonth" type="number" min="1" max="12" value={form.recurrenceAnnualMonth} onChange={(e) => setField('recurrenceAnnualMonth', e.target.value)} disabled={busy} />
                  </Field>
                  <Field label="Day" htmlFor="taskRecurrenceAnnualDay">
                    <Input id="taskRecurrenceAnnualDay" type="number" min="1" max="31" value={form.recurrenceAnnualDay} onChange={(e) => setField('recurrenceAnnualDay', e.target.value)} disabled={busy} />
                  </Field>
                </>
              )}
            </div>
          )}
        </div>
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
