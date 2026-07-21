import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnouncement } from '../../announcementContext';
import { parseNaturalLanguageTask, type ParsedTask } from '../../lib/naturalLanguageTaskParser';
import { AREA_VALUES, RISK_LEVEL_VALUES } from '../tasks/taskUtils';
import { RECURRENCE_FREQUENCY_VALUES, isRecurrenceFrequency, type RecurrenceFrequency } from '../../validation/recurrence';
import { useHabitMutations, useNoteMutations, useSchedulerMutations, useTaskMutations, useTasksQuery } from '../../hooks/useApiQueries';
import type { TaskRecord } from '../tasks/taskTypes';
import { Button, Checkbox, Collapsible, Dialog, Field, Input, Select, SegmentedControl, Textarea } from '../ui';
import { AlertTriangle, ListTodo, Flame, StickyNote } from '../ui/icons';

type CaptureType = 'task' | 'note' | 'habit';

const CAPTURE_TYPE_OPTIONS: { value: CaptureType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
  { value: 'habit', label: 'Habit' },
];

const TYPE_ICONS: Record<CaptureType, typeof ListTodo> = { task: ListTodo, note: StickyNote, habit: Flame };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

interface TaskFieldState {
  title: string;
  dueDate: string;
  dueTime: string;
  important: boolean;
  area: string;
  estimatedMinutes: string;
  followUpDate: string;
  riskLevel: string;
  track: string;
  phase: string;
  parentTaskId: string;
  recurrenceFrequency: '' | RecurrenceFrequency;
}

const emptyTaskFields: TaskFieldState = {
  title: '',
  dueDate: '',
  dueTime: '',
  important: false,
  area: '',
  estimatedMinutes: '',
  followUpDate: '',
  riskLevel: '',
  track: '',
  phase: '',
  parentTaskId: '',
  recurrenceFrequency: '',
};

const applyParseToFields = (fields: TaskFieldState, touched: Set<string>, parsed: ParsedTask): TaskFieldState => ({
  ...fields,
  title: touched.has('title') ? fields.title : parsed.title,
  dueDate: touched.has('dueDate') ? fields.dueDate : (parsed.dueDate ?? ''),
  dueTime: touched.has('dueTime') ? fields.dueTime : (parsed.dueTime ?? ''),
  important: touched.has('important') ? fields.important : parsed.important,
  area: touched.has('area') ? fields.area : (parsed.area ?? ''),
  estimatedMinutes: touched.has('estimatedMinutes') ? fields.estimatedMinutes : (parsed.estimatedMinutes !== undefined ? String(parsed.estimatedMinutes) : ''),
});

export function QuickCaptureModal({ open, onOpenChange, initialDate }: { open: boolean; onOpenChange: (open: boolean) => void; initialDate?: string }) {
  const navigate = useNavigate();
  const { announce } = useAnnouncement();
  const [type, setType] = useState<CaptureType>('task');
  const [rawInput, setRawInput] = useState('');
  const [taskFields, setTaskFields] = useState<TaskFieldState>(emptyTaskFields);
  const touchedFieldsRef = useRef<Set<string>>(new Set());
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [habitTitle, setHabitTitle] = useState('');
  const [habitArea, setHabitArea] = useState('');
  const [habitImportant, setHabitImportant] = useState(false);
  const rawInputRef = useRef<HTMLInputElement>(null);

  const { createTask } = useTaskMutations();
  const { createNote } = useNoteMutations();
  const { createHabit } = useHabitMutations();
  const { scheduleTask } = useSchedulerMutations();
  const activeTasksQuery = useTasksQuery('active');
  const activeTasks = useMemo<TaskRecord[]>(() => {
    const data = activeTasksQuery.data?.data;
    return Array.isArray(data) ? (data as TaskRecord[]) : [];
  }, [activeTasksQuery.data]);

  const parsed = useMemo(() => (type === 'task' && rawInput.trim() ? parseNaturalLanguageTask(rawInput) : null), [type, rawInput]);
  const showUncertainNotice = Boolean(parsed && !parsed.confident);

  useEffect(() => {
    if (parsed) setTaskFields((current) => applyParseToFields(current, touchedFieldsRef.current, parsed));
  }, [parsed]);

  const resetAll = () => {
    setRawInput('');
    setTaskFields(emptyTaskFields);
    touchedFieldsRef.current = new Set();
    setMoreOptionsOpen(false);
    setNoteTitle('');
    setNoteBody('');
    setHabitTitle('');
    setHabitArea('');
    setHabitImportant(false);
  };

  const close = () => {
    onOpenChange(false);
    resetAll();
  };

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => rawInputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill reacting to the modal being opened from a specific calendar day, not state sync.
    if (open && initialDate) setTaskFields((current) => ({ ...current, dueDate: initialDate }));
  }, [open, initialDate]);

  const setTaskField = <K extends keyof TaskFieldState>(field: K, value: TaskFieldState[K]) => {
    touchedFieldsRef.current.add(field);
    setTaskFields((current) => ({ ...current, [field]: value }));
  };

  const busy = createTask.isPending || createNote.isPending || createHabit.isPending;

  const submitTask = () => {
    if (!taskFields.title.trim()) {
      rawInputRef.current?.focus();
      return;
    }
    const estimatedMinutes = taskFields.estimatedMinutes ? Number(taskFields.estimatedMinutes) : undefined;
    createTask.mutate(
      {
        title: taskFields.title.trim(),
        dueDate: taskFields.dueDate || undefined,
        important: taskFields.important,
        area: taskFields.area || undefined,
        estimatedMinutes,
        followUpDate: taskFields.followUpDate || undefined,
        riskLevel: taskFields.riskLevel || undefined,
        track: taskFields.track || undefined,
        phase: taskFields.phase || undefined,
        parentTaskId: taskFields.parentTaskId ? Number(taskFields.parentTaskId) : undefined,
        recurrence: taskFields.recurrenceFrequency ? { frequency: taskFields.recurrenceFrequency, interval: 1 } : undefined,
      },
      {
        onSuccess: (result) => {
          if (!result.ok) return;
          const createdTaskId = isRecord(result.data) && typeof result.data.id === 'number' ? result.data.id : undefined;
          // Task.dueDate is date-only; a parsed/entered time-of-day is placed on the
          // calendar via the scheduler rather than invented as a field Task doesn't have.
          if (createdTaskId !== undefined && taskFields.dueDate && taskFields.dueTime) {
            scheduleTask.mutate({
              taskId: createdTaskId,
              body: { scheduledDate: taskFields.dueDate, startTime: taskFields.dueTime, durationMinutes: estimatedMinutes ?? 30 },
            });
          }
          announce(`Task "${taskFields.title.trim()}" created.`);
          close();
        },
      },
    );
  };

  const submitNote = () => {
    if (!noteTitle.trim()) return;
    createNote.mutate(
      { title: noteTitle.trim(), body: noteBody, contentType: 'PLAIN_TEXT' },
      {
        onSuccess: (result) => {
          if (!result.ok) return;
          announce(`Note "${noteTitle.trim()}" created.`);
          close();
          navigate('/notes');
        },
      },
    );
  };

  const submitHabit = () => {
    if (!habitTitle.trim()) return;
    createHabit.mutate(
      {
        title: habitTitle.trim(),
        area: habitArea || undefined,
        important: habitImportant,
        reminderEnabled: false,
        recurrence: { frequency: 'DAILY', interval: 1 },
      },
      {
        onSuccess: (result) => {
          if (!result.ok) return;
          announce(`Habit "${habitTitle.trim()}" created.`);
          close();
        },
      },
    );
  };

  const submit = () => {
    if (type === 'task') submitTask();
    else if (type === 'note') submitNote();
    else submitHabit();
  };

  const TypeIcon = TYPE_ICONS[type];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) close(); else onOpenChange(true); }}
      title="Quick capture"
      description="Create a task, note, or habit without leaving what you're doing."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            <TypeIcon className="h-4 w-4" aria-hidden />
            {busy ? 'Creating...' : `Create ${type}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl aria-label="What to capture" value={type} onValueChange={setType} options={CAPTURE_TYPE_OPTIONS} />

        {type === 'task' && (
          <>
            <Field label="Type naturally" htmlFor="quickCaptureRaw" hint='Try "Finish payment service tomorrow 4pm #work !important 90m"'>
              <Input
                id="quickCaptureRaw"
                ref={rawInputRef}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="What needs to happen?"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              />
            </Field>

            {showUncertainNotice && (
              <p className="flex items-center gap-1.5 rounded-md bg-caution/10 px-3 py-2 text-xs text-caution" role="status">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Double-check the parsed date and title below before saving -- the wording was ambiguous.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Title" htmlFor="quickCaptureTitle" className="col-span-2">
                <Input id="quickCaptureTitle" value={taskFields.title} onChange={(e) => setTaskField('title', e.target.value)} disabled={busy} aria-invalid={!taskFields.title.trim()} />
              </Field>
              <Field label="Due date" htmlFor="quickCaptureDueDate">
                <Input id="quickCaptureDueDate" type="date" value={taskFields.dueDate} onChange={(e) => setTaskField('dueDate', e.target.value)} disabled={busy} />
              </Field>
              <Field label="Due time" htmlFor="quickCaptureDueTime">
                <Input id="quickCaptureDueTime" type="time" value={taskFields.dueTime} onChange={(e) => setTaskField('dueTime', e.target.value)} disabled={busy} />
              </Field>
              <Field label="Project / area" htmlFor="quickCaptureArea">
                <Select id="quickCaptureArea" value={taskFields.area} onChange={(e) => setTaskField('area', e.target.value)} disabled={busy}>
                  <option value="">(default personal)</option>
                  {AREA_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
                </Select>
              </Field>
              <div className="flex items-end">
                <Checkbox id="quickCaptureImportant" label="Important" checked={taskFields.important} onChange={(e) => setTaskField('important', e.target.checked)} disabled={busy} />
              </div>
            </div>

            <Collapsible title="More options" open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Estimate (minutes)" htmlFor="quickCaptureEstimate">
                  <Input id="quickCaptureEstimate" type="number" min="0" step="15" value={taskFields.estimatedMinutes} onChange={(e) => setTaskField('estimatedMinutes', e.target.value)} disabled={busy} />
                </Field>
                <Field label="Repeats" htmlFor="quickCaptureRecurrence">
                  <Select id="quickCaptureRecurrence" value={taskFields.recurrenceFrequency} onChange={(e) => { const next = e.target.value; setTaskField('recurrenceFrequency', isRecurrenceFrequency(next) ? next : ''); }} disabled={busy}>
                    <option value="">Does not repeat</option>
                    {RECURRENCE_FREQUENCY_VALUES.map((freq) => <option key={freq} value={freq}>{freq}</option>)}
                  </Select>
                </Field>
                <Field label="Follow-up date" htmlFor="quickCaptureFollowUp">
                  <Input id="quickCaptureFollowUp" type="date" value={taskFields.followUpDate} onChange={(e) => setTaskField('followUpDate', e.target.value)} disabled={busy} />
                </Field>
                <Field label="Risk level" htmlFor="quickCaptureRisk">
                  <Select id="quickCaptureRisk" value={taskFields.riskLevel} onChange={(e) => setTaskField('riskLevel', e.target.value)} disabled={busy}>
                    <option value="">(default low)</option>
                    {RISK_LEVEL_VALUES.map((level) => <option key={level} value={level}>{level}</option>)}
                  </Select>
                </Field>
                <Field label="Track" htmlFor="quickCaptureTrack">
                  <Input id="quickCaptureTrack" value={taskFields.track} onChange={(e) => setTaskField('track', e.target.value)} disabled={busy} maxLength={120} />
                </Field>
                <Field label="Phase" htmlFor="quickCapturePhase">
                  <Input id="quickCapturePhase" value={taskFields.phase} onChange={(e) => setTaskField('phase', e.target.value)} disabled={busy} maxLength={120} />
                </Field>
                <Field label="Parent task" htmlFor="quickCaptureParent" className="col-span-2">
                  <Select id="quickCaptureParent" value={taskFields.parentTaskId} onChange={(e) => setTaskField('parentTaskId', e.target.value)} disabled={busy}>
                    <option value="">No parent</option>
                    {activeTasks.map((task) => <option key={task.id} value={task.id}>#{task.id} {task.title}</option>)}
                  </Select>
                </Field>
              </div>
              <p className="mt-3 text-xs text-fg-subtle">Dependencies can be added afterward from the task's detail page.</p>
            </Collapsible>
          </>
        )}

        {type === 'note' && (
          <>
            <Field label="Title" htmlFor="quickCaptureNoteTitle">
              <Input id="quickCaptureNoteTitle" ref={rawInputRef} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="What's this about?" disabled={busy} aria-invalid={!noteTitle.trim()} />
            </Field>
            <Field label="Body" htmlFor="quickCaptureNoteBody">
              <Textarea id="quickCaptureNoteBody" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={5} disabled={busy} />
            </Field>
          </>
        )}

        {type === 'habit' && (
          <>
            <Field label="Title" htmlFor="quickCaptureHabitTitle">
              <Input id="quickCaptureHabitTitle" ref={rawInputRef} value={habitTitle} onChange={(e) => setHabitTitle(e.target.value)} placeholder="Drink water, read, stretch..." disabled={busy} aria-invalid={!habitTitle.trim()} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category" htmlFor="quickCaptureHabitArea">
                <Select id="quickCaptureHabitArea" value={habitArea} onChange={(e) => setHabitArea(e.target.value)} disabled={busy}>
                  <option value="">(default personal)</option>
                  {AREA_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
                </Select>
              </Field>
              <div className="flex items-end">
                <Checkbox id="quickCaptureHabitImportant" label="Important" checked={habitImportant} onChange={(e) => setHabitImportant(e.target.checked)} disabled={busy} />
              </div>
            </div>
            <p className="text-xs text-fg-subtle">Starts as a daily habit -- adjust the schedule anytime from the Habits page.</p>
          </>
        )}
      </div>
    </Dialog>
  );
}
