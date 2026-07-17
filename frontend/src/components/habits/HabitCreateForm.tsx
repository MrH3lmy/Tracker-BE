import { forwardRef, useEffect, useImperativeHandle, useReducer, useRef, useState } from 'react';
import { DAY_OF_WEEK_VALUES, RECURRENCE_FREQUENCY_VALUES, isRecurrenceFrequency, type DayOfWeekValue, type RecurrenceFrequency } from '../../validation/recurrence';
import { deriveGoalType, findUnitOption, inferHabitUnit, HABIT_CATEGORY_LABELS } from './habitPresentation';
import {
  HABIT_CATEGORY_VALUES,
  HABIT_GOAL_TYPE_VALUES,
  HABIT_UNIT_OPTIONS,
  type CreateHabitPayload,
  type HabitGoalType,
  type HabitPreset,
  type HabitRecord,
  type HabitRecurrenceRecord,
} from './habitTypes';
import { Checkbox, Field, Input, Select, Textarea, cn } from '../ui';

const GOAL_TYPE_LABELS: Record<HabitGoalType, string> = {
  COMPLETE_ONCE: 'Complete once',
  COUNT: 'Count',
  DURATION: 'Duration',
};

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
  category: string;
  important: boolean;
  goalType: HabitGoalType;
  countTarget: string;
  countUnit: string;
  durationMinutes: string;
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
  category: '',
  important: false,
  goalType: 'COMPLETE_ONCE',
  countTarget: '2',
  countUnit: 'times',
  durationMinutes: '',
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
  const goalType = deriveGoalType(habit);
  return {
    title: habit.title ?? '',
    description: habit.description ?? '',
    category: habit.area ?? '',
    important: Boolean(habit.important),
    goalType,
    countTarget: goalType === 'COUNT' ? toFormNumber(habit.dailyTargetCount) || '2' : '2',
    countUnit: inferHabitUnit(habit.title).value,
    durationMinutes: goalType === 'DURATION' ? toFormNumber(habit.estimatedMinutes) : '',
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
        category: action.preset.area ?? state.category,
        goalType: action.preset.goalType,
        countTarget: action.preset.dailyTargetCount !== undefined ? String(action.preset.dailyTargetCount) : state.countTarget,
        countUnit: action.preset.unit ?? inferHabitUnit(action.preset.title).value,
        durationMinutes: '',
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

interface HabitFormErrors {
  title?: string;
  countTarget?: string;
  durationMinutes?: string;
  daysOfWeek?: string;
  dayOfMonth?: string;
  annualDate?: string;
  reminderTime?: string;
}

const validateForm = (form: HabitFormState): HabitFormErrors => {
  const errors: HabitFormErrors = {};
  if (!form.title.trim()) errors.title = 'Habit name is required.';

  if (form.goalType === 'COUNT') {
    const target = Number(form.countTarget);
    if (!form.countTarget.trim() || !Number.isFinite(target) || target < 2) errors.countTarget = 'Enter a target of at least 2.';
  }
  if (form.goalType === 'DURATION') {
    const minutes = Number(form.durationMinutes);
    if (!form.durationMinutes.trim() || !Number.isFinite(minutes) || minutes <= 0) errors.durationMinutes = 'Enter a duration in minutes.';
  }

  if (form.recurrenceFrequency === 'WEEKLY' && form.recurrenceDaysOfWeek.length === 0) {
    errors.daysOfWeek = 'Select at least one day.';
  }
  if (form.recurrenceFrequency === 'MONTHLY') {
    const day = Number(form.recurrenceDayOfMonth);
    if (!form.recurrenceDayOfMonth.trim() || !Number.isFinite(day) || day < 1 || day > 31) errors.dayOfMonth = 'Enter a day between 1 and 31.';
  }
  if (form.recurrenceFrequency === 'YEARLY') {
    const month = Number(form.recurrenceAnnualMonth);
    const day = Number(form.recurrenceAnnualDay);
    const valid = form.recurrenceAnnualMonth.trim() && form.recurrenceAnnualDay.trim()
      && Number.isFinite(month) && Number.isFinite(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31;
    if (!valid) errors.annualDate = 'Enter a valid month and day.';
  }

  if (form.reminderEnabled && !form.reminderTime) errors.reminderTime = 'Set a reminder time.';

  return errors;
};

const buildPayload = (form: HabitFormState): CreateHabitPayload => ({
  title: form.title.trim(),
  description: form.description || undefined,
  area: form.category || undefined,
  important: form.important,
  dailyTargetCount: form.goalType === 'COUNT' ? toOptionalNumber(form.countTarget) ?? 2 : 1,
  estimatedMinutes: form.goalType === 'DURATION' ? toOptionalNumber(form.durationMinutes) : undefined,
  reminderEnabled: form.reminderEnabled && Boolean(form.reminderTime),
  reminderTime: form.reminderEnabled && form.reminderTime ? form.reminderTime : undefined,
  recurrence: {
    frequency: form.recurrenceFrequency || 'DAILY',
    interval: toOptionalNumber(form.recurrenceInterval) ?? 1,
    daysOfWeek: form.recurrenceFrequency === 'WEEKLY' ? form.recurrenceDaysOfWeek : undefined,
    dayOfMonth: form.recurrenceFrequency === 'MONTHLY' ? toOptionalNumber(form.recurrenceDayOfMonth) : undefined,
    annualDate: form.recurrenceFrequency === 'YEARLY' ? formatAnnualDate(form.recurrenceAnnualMonth, form.recurrenceAnnualDay) : undefined,
  },
});

export interface HabitCreateFormHandle {
  focusTitle: () => void;
  submit: () => void;
  applyPreset: (preset: HabitPreset) => void;
}

interface HabitCreateFormProps {
  busy: boolean;
  initialValue?: HabitRecord;
  onSubmit: (payload: CreateHabitPayload, onSuccess: () => void) => void;
  onValidityChange: (valid: boolean) => void;
}

export const HabitCreateForm = forwardRef<HabitCreateFormHandle, HabitCreateFormProps>(function HabitCreateForm(
  { busy, initialValue, onSubmit, onValidityChange },
  ref,
) {
  const [form, dispatch] = useReducer(reducer, initialValue, mapRecordToFormState);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const errors = validateForm(form);
  // Only surface validation messages after a submit was attempted, so the form doesn't
  // greet the user with "required" errors before they've typed anything.
  const displayErrors = submitAttempted ? errors : ({} as HabitFormErrors);

  useEffect(() => {
    onValidityChange(Object.keys(errors).length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  useImperativeHandle(ref, () => ({
    focusTitle: () => titleRef.current?.focus(),
    applyPreset: (preset: HabitPreset) => dispatch({ type: 'applyPreset', preset }),
    submit: () => {
      if (Object.keys(validateForm(form)).length > 0) {
        setSubmitAttempted(true);
        titleRef.current?.focus();
        return;
      }
      onSubmit(buildPayload(form), () => dispatch({ type: 'reset', initialState: emptyState }));
    },
  }), [form, onSubmit]);

  const setField = (field: keyof HabitFormState, value: string | boolean) => dispatch({ type: 'field', field, value });
  const unitOption = findUnitOption(form.countUnit);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-fg">Basic information</h3>
        <Field label="Habit name" htmlFor="habitTitle" error={displayErrors.title}>
          <Input
            id="habitTitle"
            ref={titleRef}
            placeholder="Drink water, meditate, read..."
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            disabled={busy}
            aria-invalid={Boolean(displayErrors.title)}
          />
        </Field>
        <Field label="Description (optional)" htmlFor="habitDescription">
          <Textarea id="habitDescription" placeholder="Add context or motivation" value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={busy} rows={2} className="min-h-0" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" htmlFor="habitCategory">
            <Select id="habitCategory" value={form.category} onChange={(e) => setField('category', e.target.value)} disabled={busy}>
              <option value="">(default personal)</option>
              {HABIT_CATEGORY_VALUES.map((value) => <option key={value} value={value}>{HABIT_CATEGORY_LABELS[value]}</option>)}
            </Select>
          </Field>
          <div className="flex items-end pb-2">
            <Checkbox
              id="habitImportant"
              label="Mark as important"
              checked={form.important}
              onChange={(e) => setField('important', e.target.checked)}
              disabled={busy}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-5">
        <h3 className="text-sm font-semibold text-fg">Goal</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Goal type" htmlFor="habitGoalType">
            <Select
              id="habitGoalType"
              value={form.goalType}
              onChange={(e) => setField('goalType', e.target.value)}
              disabled={busy}
            >
              {HABIT_GOAL_TYPE_VALUES.map((value) => <option key={value} value={value}>{GOAL_TYPE_LABELS[value]}</option>)}
            </Select>
          </Field>
          {form.goalType === 'COUNT' && (
            <Field label="Target" htmlFor="habitCountTarget" error={displayErrors.countTarget}>
              <div className="flex gap-2">
                <Input
                  id="habitCountTarget"
                  type="number"
                  min="2"
                  step="1"
                  value={form.countTarget}
                  onChange={(e) => setField('countTarget', e.target.value)}
                  disabled={busy}
                  aria-invalid={Boolean(displayErrors.countTarget)}
                  className="w-20"
                />
                <Select
                  aria-label="Target unit"
                  value={unitOption.value}
                  onChange={(e) => setField('countUnit', e.target.value)}
                  disabled={busy}
                >
                  {HABIT_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </div>
            </Field>
          )}
          {form.goalType === 'DURATION' && (
            <Field label="Duration (minutes)" htmlFor="habitDuration" error={displayErrors.durationMinutes}>
              <Input
                id="habitDuration"
                type="number"
                min="1"
                step="1"
                placeholder="20"
                value={form.durationMinutes}
                onChange={(e) => setField('durationMinutes', e.target.value)}
                disabled={busy}
                aria-invalid={Boolean(displayErrors.durationMinutes)}
              />
            </Field>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h3 className="text-sm font-semibold text-fg">Schedule</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frequency" htmlFor="habitRecurrenceFrequency">
            <Select
              id="habitRecurrenceFrequency"
              value={form.recurrenceFrequency}
              onChange={(e) => { const next = e.target.value; setField('recurrenceFrequency', isRecurrenceFrequency(next) ? next : ''); }}
              disabled={busy}
            >
              {RECURRENCE_FREQUENCY_VALUES.map((freq) => <option key={freq} value={freq}>{freq.charAt(0) + freq.slice(1).toLowerCase()}</option>)}
            </Select>
          </Field>

          {form.recurrenceFrequency !== 'WEEKLY' && (
            <Field label="Every" htmlFor="habitRecurrenceInterval" hint={form.recurrenceFrequency === 'DAILY' ? 'days' : undefined}>
              <Input id="habitRecurrenceInterval" type="number" min="1" step="1" value={form.recurrenceInterval} onChange={(e) => setField('recurrenceInterval', e.target.value)} disabled={busy} />
            </Field>
          )}

          {form.recurrenceFrequency === 'MONTHLY' && (
            <Field label="Day of month" htmlFor="habitRecurrenceDayOfMonth" error={displayErrors.dayOfMonth}>
              <Input id="habitRecurrenceDayOfMonth" type="number" min="1" max="31" value={form.recurrenceDayOfMonth} onChange={(e) => setField('recurrenceDayOfMonth', e.target.value)} disabled={busy} aria-invalid={Boolean(displayErrors.dayOfMonth)} />
            </Field>
          )}

          {form.recurrenceFrequency === 'YEARLY' && (
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <Field label="Month" htmlFor="habitRecurrenceAnnualMonth" error={displayErrors.annualDate}>
                <Input id="habitRecurrenceAnnualMonth" type="number" min="1" max="12" value={form.recurrenceAnnualMonth} onChange={(e) => setField('recurrenceAnnualMonth', e.target.value)} disabled={busy} aria-invalid={Boolean(displayErrors.annualDate)} />
              </Field>
              <Field label="Day" htmlFor="habitRecurrenceAnnualDay">
                <Input id="habitRecurrenceAnnualDay" type="number" min="1" max="31" value={form.recurrenceAnnualDay} onChange={(e) => setField('recurrenceAnnualDay', e.target.value)} disabled={busy} aria-invalid={Boolean(displayErrors.annualDate)} />
              </Field>
            </div>
          )}

          {form.recurrenceFrequency === 'WEEKLY' && (
            <Field label="Days" error={displayErrors.daysOfWeek} className="col-span-2">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of week">
                {DAY_OF_WEEK_VALUES.map((day) => {
                  const selected = form.recurrenceDaysOfWeek.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected}
                      aria-label={day.charAt(0) + day.slice(1).toLowerCase()}
                      onClick={() => dispatch({ type: 'toggleDay', day })}
                      disabled={busy}
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold transition-colors duration-(--duration-fast) disabled:opacity-50',
                        selected ? 'border-brand bg-brand text-brand-fg' : 'border-line bg-card text-fg-muted hover:text-fg',
                      )}
                    >
                      {day.charAt(0)}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h3 className="text-sm font-semibold text-fg">Reminder</h3>
        <Checkbox
          id="habitReminderEnabled"
          label="Remind me"
          checked={form.reminderEnabled}
          onChange={(e) => setField('reminderEnabled', e.target.checked)}
          disabled={busy}
        />
        {form.reminderEnabled && (
          <Field label="Reminder time" htmlFor="habitReminderTime" error={displayErrors.reminderTime} hint={!displayErrors.reminderTime ? "You'll get an in-app notification." : undefined}>
            <Input
              id="habitReminderTime"
              type="time"
              value={form.reminderTime}
              onChange={(e) => setField('reminderTime', e.target.value)}
              disabled={busy}
              aria-invalid={Boolean(displayErrors.reminderTime)}
              className="w-40"
            />
          </Field>
        )}
      </section>
    </div>
  );
});
