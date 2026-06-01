import { forwardRef, useImperativeHandle, useReducer, useRef } from 'react';
import { isTaskStatus, TASK_STATUS_VALUES } from '../../validation/taskStatus';
import { AREA_VALUES, EFFORT_VALUES, RISK_LEVEL_VALUES } from './taskUtils';
import type { CreateTaskPayload, RiskLevel, TaskRecord } from './taskTypes';
import styles from './TaskCreateForm.module.css';

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
  | { type: 'reset' }
  | { type: 'parent'; parentTaskId: string }
  | { type: 'status'; status: '' | CreateTaskPayload['status'] };

const initialState: TaskCreateFormState = {
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

const reducer = (state: TaskCreateFormState, action: TaskCreateFormAction): TaskCreateFormState => {
  switch (action.type) {
    case 'field':
      return { ...state, [action.field]: action.value };
    case 'parent':
      return { ...state, parentTaskId: action.parentTaskId };
    case 'status':
      return { ...state, status: action.status };
    case 'reset':
      return initialState;
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
  isCreating: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateTaskPayload, onSuccess: () => void) => void;
  onInvalidTitle: () => void;
}

export const TaskCreateForm = forwardRef<TaskCreateFormHandle, TaskCreateFormProps>(function TaskCreateForm({ activeTasks, busy, isCreating, onCancel, onCreate, onInvalidTitle }, ref) {
  const [form, dispatch] = useReducer(reducer, initialState);
  const titleRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusTitle: () => titleRef.current?.focus(),
    setParentTaskId: (parentTaskId: string) => dispatch({ type: 'parent', parentTaskId }),
    setStatus: (status: '' | CreateTaskPayload['status']) => dispatch({ type: 'status', status }),
  }));

  const setField = (field: keyof TaskCreateFormState, value: string | boolean) => dispatch({ type: 'field', field, value });

  const submitCreate = () => {
    if (!form.title.trim()) {
      onInvalidTitle();
      titleRef.current?.focus();
      return;
    }
    onCreate({
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
    }, () => dispatch({ type: 'reset' }));
  };

  return (
    <section className={`panel ${styles.panel}`} aria-labelledby="create-task-title">
      <div>
        <p className="eyebrow">Quick capture</p>
        <h3 id="create-task-title">Create task</h3>
      </div>
      <div className={styles.grid}>
        <label htmlFor="taskTitle">Title</label>
        <input id="taskTitle" ref={titleRef} placeholder="Draft launch checklist" value={form.title} onChange={(e) => setField('title', e.target.value)} disabled={busy} aria-invalid={!form.title.trim()} />
        <label htmlFor="taskDescription">Description</label>
        <textarea id="taskDescription" placeholder="Add context, acceptance criteria, or notes" value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={busy} rows={3} />
        <label htmlFor="taskStatus">Status</label>
        <select id="taskStatus" value={form.status} onChange={(e) => { const nextStatus = e.target.value; setField('status', isTaskStatus(nextStatus) ? nextStatus : ''); }} disabled={busy}>
          <option value="">(no status)</option>
          {TASK_STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label htmlFor="taskStartDate">Start date</label>
        <input id="taskStartDate" type="date" value={form.startDate} max={form.dueDate || undefined} onChange={(e) => setField('startDate', e.target.value)} disabled={busy} />
        <label htmlFor="taskDueDate">Due date</label>
        <input id="taskDueDate" type="date" value={form.dueDate} min={form.startDate || undefined} onChange={(e) => setField('dueDate', e.target.value)} disabled={busy} />
        <label htmlFor="taskEstimatedMinutes">Estimated minutes</label>
        <input id="taskEstimatedMinutes" type="number" min="0" step="15" placeholder="120" value={form.estimatedMinutes} onChange={(e) => setField('estimatedMinutes', e.target.value)} disabled={busy} />
        <label htmlFor="taskActualMinutes">Actual minutes</label>
        <input id="taskActualMinutes" type="number" min="0" step="15" placeholder="90" value={form.actualMinutes} onChange={(e) => setField('actualMinutes', e.target.value)} disabled={busy} />
        <label htmlFor="taskRiskLevel">Risk level</label>
        <select id="taskRiskLevel" value={form.riskLevel} onChange={(e) => setField('riskLevel', e.target.value as '' | RiskLevel)} disabled={busy}>
          <option value="">(default low)</option>
          {RISK_LEVEL_VALUES.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>
        <label htmlFor="taskRiskReason">Risk reason</label>
        <input id="taskRiskReason" placeholder="Dependency, uncertainty, or schedule concern" value={form.riskReason} onChange={(e) => setField('riskReason', e.target.value)} disabled={busy} maxLength={500} />
        <label htmlFor="taskTrack">Track</label>
        <input id="taskTrack" placeholder="Product, marketing, migration" value={form.track} onChange={(e) => setField('track', e.target.value)} disabled={busy} maxLength={120} />
        <label htmlFor="taskPhase">Phase</label>
        <input id="taskPhase" placeholder="Discovery, build, launch" value={form.phase} onChange={(e) => setField('phase', e.target.value)} disabled={busy} maxLength={120} />
        <label htmlFor="taskParentTask">Parent task</label>
        <select id="taskParentTask" value={form.parentTaskId} onChange={(e) => setField('parentTaskId', e.target.value)} disabled={busy}>
          <option value="">No parent</option>
          {activeTasks.map((task) => <option key={`parent-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}
        </select>
        <label htmlFor="taskImportant">Important</label>
        <input id="taskImportant" type="checkbox" checked={form.important} onChange={(e) => setField('important', e.target.checked)} disabled={busy} />
        <label htmlFor="taskArea">Area</label>
        <select id="taskArea" value={form.area} onChange={(e) => setField('area', e.target.value)} disabled={busy}>
          <option value="">(default personal)</option>
          {AREA_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <label htmlFor="taskEffort">Effort</label>
        <select id="taskEffort" value={form.effort} onChange={(e) => setField('effort', e.target.value)} disabled={busy}>
          <option value="">(default medium)</option>
          {EFFORT_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <label htmlFor="taskBlockedReason">Blocked reason</label>
        <input id="taskBlockedReason" placeholder="Why this task is blocked" value={form.blockedReason} onChange={(e) => setField('blockedReason', e.target.value)} disabled={busy} />
        <label htmlFor="taskWaitingOn">Waiting on</label>
        <input id="taskWaitingOn" placeholder="Person, vendor, or event" value={form.waitingOn} onChange={(e) => setField('waitingOn', e.target.value)} disabled={busy} />
        <label htmlFor="taskFollowUpDate">Follow-up date</label>
        <input id="taskFollowUpDate" type="date" value={form.followUpDate} min={form.startDate || undefined} onChange={(e) => setField('followUpDate', e.target.value)} disabled={busy} />
      </div>
      <div className={styles.actions}>
        <button className="button-primary" type="button" onClick={submitCreate} disabled={busy}>{isCreating ? 'Creating...' : 'Create task'}</button>
        <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </section>
  );
});
