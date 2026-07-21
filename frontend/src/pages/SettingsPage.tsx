import { useEffect, useMemo, useState } from 'react';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { useSaveSettingsMutation, useSettingsQuery } from '../hooks/useApiQueries';
import { useTheme } from '../themeContext';
import { THEME_OPTIONS, THEME_SETTING_KEY, type AppTheme } from '../theme';
import {
  AI_FEATURES_ENABLED_KEY,
  DEFAULT_DAILY_CAPACITY_HOURS_KEY,
  EXCLUDED_WEEKDAYS_KEY,
  HABIT_REMINDER_STYLE_KEY,
  HOLIDAY_DATES_KEY,
  readHabitReminderStyle,
  SLEEP_HOURS_KEY,
  WORKING_HOURS_KEY,
  validateSettingsPayload,
  type HabitReminderStyle,
  type TimeWindow,
  type WeeklyHours,
} from '../validation/settings';
import { Badge, Button, Card, CardHeader, Checkbox, Collapsible, cn, Field, Input, PageHeader, Textarea } from '../components/ui';
import { PremiumGate } from '../components/PremiumGate';

const WEEKDAY_OPTIONS = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
  { value: 'SATURDAY', label: 'Sat' },
  { value: 'SUNDAY', label: 'Sun' },
];

const HABIT_REMINDER_STYLE_OPTIONS: { value: HabitReminderStyle; label: string; description: string }[] = [
  { value: 'silent', label: 'Silent', description: 'Track habits without interruption — no banner, no browser notification.' },
  { value: 'gentle', label: 'Gentle', description: 'A quiet in-app banner once a day. No browser notifications.' },
  { value: 'standard', label: 'Standard', description: 'An in-app banner plus one browser notification per day.' },
  { value: 'persistent', label: 'Persistent', description: 'Keeps nagging every 15 minutes (banner + browser notification) until you check in.' },
];

const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asWeeklyHours = (value: unknown): WeeklyHours => value && typeof value === 'object' && !Array.isArray(value) ? (value as WeeklyHours) : {};

function WeeklyHoursEditor({
  legend, hint, hours, disabled, onChangeDay,
}: {
  legend: string;
  hint: string;
  hours: WeeklyHours;
  disabled: boolean;
  onChangeDay: (day: string, window: TimeWindow | undefined) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="mb-2 text-[13px] font-medium text-fg-muted">{legend}</legend>
      <p className="mb-2 text-xs text-fg-subtle">{hint}</p>
      <div className="flex flex-col gap-2">
        {WEEKDAY_OPTIONS.map((weekday) => {
          const window = hours[weekday.value];
          const enabled = Boolean(window);
          return (
            <div key={weekday.value} className="flex flex-wrap items-center gap-2">
              <Checkbox
                label={weekday.label}
                className="w-20"
                checked={enabled}
                disabled={disabled}
                onChange={(event) => onChangeDay(weekday.value, event.target.checked ? { start: '09:00', end: '17:00' } : undefined)}
              />
              <Input
                type="time"
                aria-label={`${weekday.label} ${legend} start`}
                value={window?.start ?? ''}
                disabled={disabled || !enabled}
                onChange={(event) => onChangeDay(weekday.value, { start: event.target.value, end: window?.end ?? '17:00' })}
                className="w-32"
              />
              <span className="text-xs text-fg-subtle">to</span>
              <Input
                type="time"
                aria-label={`${weekday.label} ${legend} end`}
                value={window?.end ?? ''}
                disabled={disabled || !enabled}
                onChange={(event) => onChangeDay(weekday.value, { start: window?.start ?? '09:00', end: event.target.value })}
                className="w-32"
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SettingsPage() {
  const settingsQuery = useSettingsQuery(true);
  const saveMutation = useSaveSettingsMutation();
  const { theme, setTheme } = useTheme();
  const [body, setBody] = useState('{}');
  const [advancedManuallyOpen, setAdvancedManuallyOpen] = useState(false);

  useEffect(() => {
    if (settingsQuery.data?.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the editable JSON text synchronized with the latest loaded settings payload.
      setBody(JSON.stringify(settingsQuery.data.data ?? {}, null, 2));
    }
  }, [settingsQuery.data]);

  const bodyValidation = useMemo(() => validateSettingsPayload(body), [body]);
  const canSubmit = !saveMutation.isPending && bodyValidation.errors.length === 0;
  const hasValidationErrors = bodyValidation.errors.length > 0;
  const currentSettings = bodyValidation.parsed ?? (settingsQuery.data?.ok && settingsQuery.data.data && typeof settingsQuery.data.data === 'object' && !Array.isArray(settingsQuery.data.data)
    ? settingsQuery.data.data as Record<string, unknown>
    : {});
  const excludedWeekdays = asStringArray(currentSettings[EXCLUDED_WEEKDAYS_KEY]).map((weekday) => weekday.toUpperCase());
  const holidayDates = asStringArray(currentSettings[HOLIDAY_DATES_KEY]);
  const dailyCapacityHours = asNumber(currentSettings[DEFAULT_DAILY_CAPACITY_HOURS_KEY], 6);
  const aiFeaturesEnabled = currentSettings[AI_FEATURES_ENABLED_KEY] === true;
  const workingHours = asWeeklyHours(currentSettings[WORKING_HOURS_KEY]);
  const sleepHours = asWeeklyHours(currentSettings[SLEEP_HOURS_KEY]);
  const habitReminderStyle = readHabitReminderStyle(currentSettings);

  // Errors must stay visible even while the Advanced section is collapsed.
  const advancedOpen = advancedManuallyOpen || hasValidationErrors;

  const updateSettingBody = (updates: Record<string, unknown>) => {
    setBody(JSON.stringify({ ...currentSettings, ...updates }, null, 2));
  };

  const handleThemeChange = (nextTheme: AppTheme) => {
    setTheme(nextTheme);
    const updatedSettings = { ...currentSettings, [THEME_SETTING_KEY]: nextTheme };
    setBody(JSON.stringify(updatedSettings, null, 2));
    saveMutation.mutate(updatedSettings);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Adjust your workspace defaults, scheduling preferences, and appearance."
        actions={
          <Button variant="primary" onClick={() => bodyValidation.parsed && saveMutation.mutate(bodyValidation.parsed)} disabled={!canSubmit}>
            {saveMutation.isPending ? 'Saving...' : 'Save settings'}
          </Button>
        }
        className="mb-0"
      />

      <Card aria-labelledby="settings-content-title">
        <CardHeader
          title={<span id="settings-content-title">Configuration</span>}
          description="Load current settings, adjust the controls below, then save when validation passes."
          actions={
            <Button size="sm" onClick={() => settingsQuery.refetch()} disabled={settingsQuery.isFetching}>
              {settingsQuery.isFetching ? 'Loading...' : 'Reload settings'}
            </Button>
          }
        />

        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-line p-4" aria-label="Calendar exclusions">
            <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Planning calendar</p>
            <h4 className="mt-1 text-sm font-semibold text-fg">Calendar exclusions</h4>
            <p className="mt-0.5 text-sm text-fg-muted">Choose the non-working weekdays and one-off holidays that planning capacity should skip.</p>

            <fieldset className="mt-4">
              <legend className="mb-2 text-[13px] font-medium text-fg-muted">Excluded weekdays</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((weekday) => (
                  <Checkbox
                    key={weekday.value}
                    label={weekday.label}
                    className="rounded-full border border-line px-3 py-1.5"
                    checked={excludedWeekdays.includes(weekday.value)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...new Set([...excludedWeekdays, weekday.value])]
                        : excludedWeekdays.filter((value) => value !== weekday.value);
                      updateSettingBody({ [EXCLUDED_WEEKDAYS_KEY]: WEEKDAY_OPTIONS.filter((option) => next.includes(option.value)).map((option) => option.value) });
                    }}
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Daily capacity hours" htmlFor="dailyCapacityHours">
                <Input
                  id="dailyCapacityHours"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={dailyCapacityHours}
                  onChange={(event) => updateSettingBody({ [DEFAULT_DAILY_CAPACITY_HOURS_KEY]: Number(event.target.value) })}
                />
              </Field>
              <Field label="Holiday dates" htmlFor="holidayDates" hint="One date per line, YYYY-MM-DD.">
                <Textarea
                  id="holidayDates"
                  rows={4}
                  value={holidayDates.join('\n')}
                  placeholder="2026-01-01"
                  onChange={(event) => updateSettingBody({ [HOLIDAY_DATES_KEY]: event.target.value.split(/\n|,/).map((value) => value.trim()).filter(Boolean) })}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-line p-4" aria-label="Working and sleep hours">
            <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Smart scheduling</p>
            <h4 className="mt-1 text-sm font-semibold text-fg">Working hours &amp; sleep hours</h4>
            <p className="mt-0.5 text-sm text-fg-muted">
              Used to suggest schedule slots: work/study tasks are placed within working hours, everything else avoids your sleep hours.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WeeklyHoursEditor
                legend="Working hours"
                hint="Days with no working hours are treated as non-working for suggestions."
                hours={workingHours}
                disabled={saveMutation.isPending}
                onChangeDay={(day, window) => updateSettingBody({ [WORKING_HOURS_KEY]: { ...workingHours, [day]: window } })}
              />
              <WeeklyHoursEditor
                legend="Sleep hours"
                hint="Can cross midnight (e.g. 23:00 to 07:00)."
                hours={sleepHours}
                disabled={saveMutation.isPending}
                onChangeDay={(day, window) => updateSettingBody({ [SLEEP_HOURS_KEY]: { ...sleepHours, [day]: window } })}
              />
            </div>
          </section>

          <section className="rounded-lg border border-line p-4" aria-label="Habit reminders">
            <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Habits</p>
            <h4 className="mt-1 text-sm font-semibold text-fg">Reminder style</h4>
            <p className="mt-0.5 text-sm text-fg-muted">
              Choose how habit reminders behave app-wide. Individual habits still need reminders turned on and a time set.
            </p>
            <div role="radiogroup" aria-label="Habit reminder style" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {HABIT_REMINDER_STYLE_OPTIONS.map((option) => {
                const selected = habitReminderStyle === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => updateSettingBody({ [HABIT_REMINDER_STYLE_KEY]: option.value })}
                    className={cn(
                      'flex flex-col gap-1 rounded-lg border p-3 text-left transition-[border-color,box-shadow] duration-(--duration-fast)',
                      selected ? 'border-brand shadow-(--shadow-glow-brand)' : 'border-line hover:border-line-strong',
                    )}
                  >
                    <span className="text-sm font-medium text-fg">{option.label}</span>
                    <span className="text-xs text-fg-subtle">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-line p-4">
            <Checkbox
              id="aiFeaturesEnabled"
              label="Enable AI-assisted note features"
              checked={aiFeaturesEnabled}
              onChange={(event) => updateSettingBody({ [AI_FEATURES_ENABLED_KEY]: event.target.checked })}
            />
            <p className="mt-2 text-xs text-fg-subtle">
              Leave disabled for offline or privacy-sensitive environments. AI suggestions always require your review and never auto-create tasks.
            </p>
          </section>

          <section className="rounded-lg border border-line p-4">
            <p className="mb-3 text-sm font-medium text-fg">Interface theme</p>
            <div role="radiogroup" aria-label="Interface theme" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {THEME_OPTIONS.map((option) => {
                const selected = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={saveMutation.isPending}
                    onClick={() => handleThemeChange(option.value)}
                    className={cn(
                      'flex flex-col gap-2 rounded-lg border p-3 text-left transition-[border-color,box-shadow] duration-(--duration-fast) disabled:pointer-events-none disabled:opacity-50',
                      selected ? 'border-brand shadow-(--shadow-glow-brand)' : 'border-line hover:border-line-strong',
                    )}
                  >
                    <span data-theme={option.value} className="flex h-10 items-stretch gap-1.5 overflow-hidden rounded-md border border-line bg-canvas p-1.5">
                      <span className="flex-1 rounded-sm bg-card" />
                      <span className="w-3 shrink-0 rounded-sm bg-brand" />
                    </span>
                    <span className="text-sm font-medium text-fg">{option.label}</span>
                    <span className="text-xs text-fg-subtle">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-line p-4" aria-label="Premium features">
            <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Premium</p>
            <h4 className="mt-1 text-sm font-semibold text-fg">Advanced analytics</h4>
            <p className="mt-0.5 text-sm text-fg-muted">A preview of a premium-gated feature; it unlocks automatically once your account is upgraded.</p>
            <div className="mt-4">
              <PremiumGate label="Advanced analytics" description="Unlock deeper priority insights and trend charts across your tasks.">
                <div className="rounded-md border border-line bg-card p-4 text-sm text-fg">
                  Advanced analytics preview placeholder.
                </div>
              </PremiumGate>
            </div>
          </section>

          <Collapsible
            title="Advanced → Developer configuration"
            open={advancedOpen}
            onOpenChange={setAdvancedManuallyOpen}
            badge={hasValidationErrors ? <Badge variant="critical">{bodyValidation.errors.length} issue{bodyValidation.errors.length === 1 ? '' : 's'}</Badge> : undefined}
          >
            <div className="flex flex-col gap-3">
              <p className="text-sm text-fg-muted">Edit the underlying settings payload directly as JSON. Structured controls above write into this same payload; most people never need to open this section.</p>
              <Field label="Settings JSON" htmlFor="settingsPayload">
                <Textarea
                  id="settingsPayload"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={14}
                  className="min-h-0 font-mono text-xs"
                  aria-invalid={hasValidationErrors}
                />
              </Field>
              {bodyValidation.errors.map((error) => <p key={error} className="text-sm text-critical" role="status">{error}</p>)}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <p className="text-sm text-fg-muted">PUT the validated JSON to <code>/api/v1/settings</code>.</p>
                <div className="flex gap-2">
                  <Button onClick={() => settingsQuery.refetch()} disabled={settingsQuery.isFetching}>Reload</Button>
                  <Button variant="primary" onClick={() => bodyValidation.parsed && saveMutation.mutate(bodyValidation.parsed)} disabled={!canSubmit}>
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </Collapsible>

          <QueryState isLoading={settingsQuery.isLoading} isError={isQueryError(settingsQuery.data) || isQueryError(saveMutation.data)} isEmpty={false} successMessage={saveMutation.data?.ok ? 'Settings saved successfully.' : undefined} />
        </div>
      </Card>
    </div>
  );
}
