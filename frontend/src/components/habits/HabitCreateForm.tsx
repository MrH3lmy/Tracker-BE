import { forwardRef, useImperativeHandle, useReducer, useRef } from 'react';
import { DAY_OF_WEEK_VALUES, RECURRENCE_FREQUENCY_VALUES, isRecurrenceFrequency, type DayOfWeekValue, type RecurrenceFrequency } from '../../validation/recurrence';
import { AREA_VALUES } from '../tasks/taskUtils';
import { HABIT_PRESETS, type CreateHabitPayload, type HabitPreset, type HabitRecord, type HabitRecurrenceRecord } from './habitTypes';
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

interface HabitFormState {
  title: string;
  description: string;
  area: string;
  important: boolean;
  estimatedMinutes: string;
  dailyTargetCount: string;
  reminderEnabled: boolean;
  reminderTime: string;
  recurrenceFrequency: '' | RecurrenceFrequency;
  recurrenceInterval: string;
  recurrenceDaysOfWeek: DayOfWeekValue[];
  recurrenceDayOfMonth: string;
  recurrenceAnnualMonth: string;
  recurrenceAnnualDay: string;
}

type HabitFormAction =
  | { type: 'field'; field: keyof HabitFormState; value: string | boolean }
  | { type: 'reset'; initialState: HabitFormState }
  | { type: 'toggleDay'; day: DayOfWeekValue }
  | { type: 'applyPreset'; preset: HabitPreset };

const emptyState: HabitFormState = {
  title: '',
  description: '',
  area: '',
  important: false,
  estimatedMinutes: '',
  dailyTargetCount: '1',
  reminderEnabled: false,
  reminderTime: '',
  recurrenceFrequency: 'DAILY',
  recurrenceInterval: '1',
  recurrenceDaysOfWeek: [],
  recurrenceDayOfMonth: '',
  recurrenceAnnualMonth: '',
  recurrenceAnnualDay: '',
};

const toFormNumber = (value: number | undefined) => (value === undefined ? '' : String(value));

const mapRecordToFormState = (habit: HabitRecord | undefined): HabitFormState => {
  if (!habit) return emptyState;
  const recurrence: HabitRecurrenceRecord | undefined = habit.recurrence;
  const annualDate = parseAnnualDate(recurrence?.annualDate);
  return {
    title: habit.title ?? '',
    description: habit.description ?? '',
    area: habit.area ?? '',
    important: Boolean(habit.important),
    estimatedMinutes: toFormNumber(habit.estimatedMinutes),
    dailyTargetCount: toFormNumber(habit.dailyTargetCount) || '1',
    reminderEnabled: Boolean(habit.reminderEnabled),
    reminderTime: habit.reminderTime ?? '',
    recurrenceFrequency: recurrence && isRecurrenceFrequency(recurrence.frequency) ? recurrence.frequency : 'DAILY',
    recurrenceInterval: toFormNumber(recurrence?.interval) || '1',
    recurrenceDaysOfWeek: recurrence?.daysOfWeek ?? [],
    recurrenceDayOfMonth: toFormNumber(recurrence?.dayOfMonth),
    recurrenceAnnualMonth: annualDate.month,
    recurrenceAnnualDay: annualDate.day,
  };
};

const reducer = (state: HabitFormState, action: HabitFormAction): HabitFormState => {
  switch (action.type) {
    case 'field':
      return { ...state, [action.field]: action.value };
    case 'toggleDay':
      return {
        ...state,
        recurrenceDaysOfWeek: state.recurrenceDaysOfWeek.includes(action.day)
          ? state.recurrenceDaysOfWeek.filter((day) => day !== action.day)
          : [...state.recurrenceDaysOfWeek, action.day],
      };
    case 'reset':
      return action.initialState;
    case 'applyPreset':
      return {
        ...state,
        title: action.preset.title,
        description: action.preset.description ?? state.description,
        area: action.preset.area ?? state.area,
        estimatedMinutes: action.preset.estimatedMinutes !== undefined ? String(action.preset.estimatedMinutes) : state.estimatedMinutes,
        dailyTargetCount: action.preset.dailyTargetCount !== undefined ? String(action.preset.dailyTargetCount) : state.dailyTargetCount,
      };
    default:
      return state;
  }
};

const toOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export interface HabitCreateFormHandle {
  focusTitle: () => void;
}

interface HabitCreateFormProps {
  busy: boolean;
  isSubmitting: boolean;
  mode?: 'create' | 'edit';
  initialValue?: HabitRecord;
  onCancel: () => void;
  onSubmit: (payload: CreateHabitPayload, onSuccess: () => void) => void;
  onInvalidTitle: () => void;
}

export const HabitCreateForm = forwardRef<HabitCreateFormHandle, HabitCreateFormProps>(function HabitCreateForm(
  { busy, isSubmitting, mode = 'create', initialValue, onCancel, onSubmit, onInvalidTitle },
  ref,
) {
  const [form, dispatch] = useReducer(reducer, initialValue, mapRecordToFormState);
  const titleRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusTitle: () => titleRef.current?.focus(),
  }));

  const setField = (field: keyof HabitFormState, value: string | boolean) => dispatch({ type: 'field', field, value });

  const submitForm = () => {
    if (!form.title.trim()) {
      onInvalidTitle();
      titleRef.current?.focus();
      return;
    }
    if (!form.recurrenceFrequency) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description || undefined,
      area: form.area || undefined,
      important: form.important,
      estimatedMinutes: toOptionalNumber(form.estimatedMinutes),
      dailyTargetCount: toOptionalNumber(form.dailyTargetCount) ?? 1,
      reminderEnabled: form.reminderEnabled && Boolean(form.reminderTime),
      reminderTime: form.reminderEnabled && form.reminderTime ? form.reminderTime : undefined,
      recurrence: {
        frequency: form.recurrenceFrequency,
        interval: toOptionalNumber(form.recurrenceInterval) ?? 1,
        daysOfWeek: form.recurrenceFrequency === 'WEEKLY' ? form.recurrenceDaysOfWeek : undefined,
        dayOfMonth: form.recurrenceFrequency === 'MONTHLY' ? toOptionalNumber(form.recurrenceDayOfMonth) : undefined,
        annualDate: form.recurrenceFrequency === 'YEARLY' ? formatAnnualDate(form.recurrenceAnnualMonth, form.recurrenceAnnualDay) : undefined,
      },
    }, () => dispatch({ type: 'reset', initialState: emptyState }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {mode === 'create' && (
          <Field label="Quick start" hint="Prefill from a common habit, then adjust as needed">
            <div className="flex flex-wrap gap-2">
              {HABIT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => dispatch({ type: 'applyPreset', preset })}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors duration-(--duration-fast) hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  <span aria-hidden>{preset.icon}</span>
                  {preset.label}
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field label="Title" htmlFor="habitTitle">
          <Input id="habitTitle" ref={titleRef} placeholder="Drink water, meditate, read..." value={form.title} onChange={(e) => setField('title', e.target.value)} disabled={busy} aria-invalid={!form.title.trim()} />
        </Field>
        <Field label="Description" htmlFor="habitDescription">
          <Textarea id="habitDescription" placeholder="Add context or motivation" value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={busy} rows={2} className="min-h-0" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Area" htmlFor="habitArea">
            <Select id="habitArea" value={form.area} onChange={(e) => setField('area', e.target.value)} disabled={busy}>
              <option value="">(default personal)</option>
              {AREA_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Estimated minutes" htmlFor="habitEstimatedMinutes">
            <Input id="habitEstimatedMinutes" type="number" min="0" step="5" placeholder="15" value={form.estimatedMinutes} onChange={(e) => setField('estimatedMinutes', e.target.value)} disabled={busy} />
          </Field>
          <Field label="Daily target count" htmlFor="habitDailyTargetCount" hint="e.g. 8 glasses of water">
            <Input id="habitDailyTargetCount" type="number" min="1" step="1" value={form.dailyTargetCount} onChange={(e) => setField('dailyTargetCount', e.target.value)} disabled={busy} />
          </Field>
        </div>
        <Checkbox
          id="habitImportant"
          label="Mark as important"
          checked={form.important}
          onChange={(e) => setField('important', e.target.checked)}
          disabled={busy}
        />
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <Checkbox
            id="habitReminderEnabled"
            label="Remind me"
            checked={form.reminderEnabled}
            onChange={(e) => setField('reminderEnabled', e.target.checked)}
            disabled={busy}
          />
          {form.reminderEnabled && (
            <Field label="Reminder time" htmlFor="habitReminderTime" hint="Shown as an in-app notification while Tracker is open">
              <Input
                id="habitReminderTime"
                type="time"
                value={form.reminderTime}
                onChange={(e) => setField('reminderTime', e.target.value)}
                disabled={busy}
                aria-invalid={form.reminderEnabled && !form.reminderTime}
                className="w-40"
              />
            </Field>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <Field label="Repeats" htmlFor="habitRecurrenceFrequency">
            <Select
              id="habitRecurrenceFrequency"
              value={form.recurrenceFrequency}
              onChange={(e) => { const next = e.target.value; setField('recurrenceFrequency', isRecurrenceFrequency(next) ? next : ''); }}
              disabled={busy}
            >
              {RECURRENCE_FREQUENCY_VALUES.map((freq) => <option key={freq} value={freq}>{freq}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Every" htmlFor="habitRecurrenceInterval">
              <Input id="habitRecurrenceInterval" type="number" min="1" step="1" value={form.recurrenceInterval} onChange={(e) => setField('recurrenceInterval', e.target.value)} disabled={busy} />
            </Field>

            {form.recurrenceFrequency === 'MONTHLY' && (
              <Field label="Day of month" htmlFor="habitRecurrenceDayOfMonth">
                <Input id="habitRecurrenceDayOfMonth" type="number" min="1" max="31" value={form.recurrenceDayOfMonth} onChange={(e) => setField('recurrenceDayOfMonth', e.target.value)} disabled={busy} />
              </Field>
            )}

            {form.recurrenceFrequency === 'YEARLY' && (
              <>
                <Field label="Month" htmlFor="habitRecurrenceAnnualMonth">
                  <Input id="habitRecurrenceAnnualMonth" type="number" min="1" max="12" value={form.recurrenceAnnualMonth} onChange={(e) => setField('recurrenceAnnualMonth', e.target.value)} disabled={busy} />
                </Field>
                <Field label="Day" htmlFor="habitRecurrenceAnnualDay">
                  <Input id="habitRecurrenceAnnualDay" type="number" min="1" max="31" value={form.recurrenceAnnualDay} onChange={(e) => setField('recurrenceAnnualDay', e.target.value)} disabled={busy} />
                </Field>
              </>
            )}

            {form.recurrenceFrequency === 'WEEKLY' && (
              <div className="col-span-2 flex flex-wrap gap-3" role="group" aria-label="Days of week">
                {DAY_OF_WEEK_VALUES.map((day) => (
                  <Checkbox
                    key={day}
                    id={`habitRecurrenceDay-${day}`}
                    label={day.slice(0, 3)}
                    checked={form.recurrenceDaysOfWeek.includes(day)}
                    onChange={() => dispatch({ type: 'toggleDay', day })}
                    disabled={busy}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={submitForm} disabled={busy}>
          {mode === 'edit' ? (isSubmitting ? 'Saving...' : 'Save changes') : (isSubmitting ? 'Creating...' : 'Create habit')}
        </Button>
      </div>
    </div>
  );
});
