import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { QueryState } from '../components/QueryState';
import { useSaveSettingsMutation, useSettingsQuery } from '../hooks/useApiQueries';
import { useTheme } from '../themeContext';
import { isAppTheme, THEME_OPTIONS, THEME_SETTING_KEY } from '../theme';
import { AI_FEATURES_ENABLED_KEY, DEFAULT_DAILY_CAPACITY_HOURS_KEY, EXCLUDED_WEEKDAYS_KEY, HOLIDAY_DATES_KEY, validateSettingsPayload } from '../validation/settings';
import { Badge, Button, Card, CardHeader, Checkbox, Collapsible, Field, Input, PageHeader, Select, Textarea } from '../components/ui';

const WEEKDAY_OPTIONS = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
  { value: 'SATURDAY', label: 'Sat' },
  { value: 'SUNDAY', label: 'Sun' },
];

const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function SettingsPage() {
  const settingsQuery = useSettingsQuery(true);
  const saveMutation = useSaveSettingsMutation();
  const { theme, setTheme } = useTheme();
  const [body, setBody] = useState('{}');
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  // Errors must stay visible even while the Advanced section is collapsed.
  useEffect(() => {
    if (hasValidationErrors) setAdvancedOpen(true);
  }, [hasValidationErrors]);

  const updateSettingBody = (updates: Record<string, unknown>) => {
    setBody(JSON.stringify({ ...currentSettings, ...updates }, null, 2));
  };

  const handleThemeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextTheme = event.target.value;
    if (!isAppTheme(nextTheme)) return;

    setTheme(nextTheme);
    const updatedSettings = { ...currentSettings, [THEME_SETTING_KEY]: nextTheme };
    setBody(JSON.stringify(updatedSettings, null, 2));
    saveMutation.mutate(updatedSettings);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Adjust workspace defaults; the same values are stored as JSON under the hood."
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
            <p className="mt-3 text-xs text-fg-subtle">
              Saved as <code>{EXCLUDED_WEEKDAYS_KEY}</code>, <code>{HOLIDAY_DATES_KEY}</code>, and <code>{DEFAULT_DAILY_CAPACITY_HOURS_KEY}</code>.
            </p>
          </section>

          <section className="rounded-lg border border-line p-4">
            <Checkbox
              id="aiFeaturesEnabled"
              label="Enable AI-assisted note features"
              checked={aiFeaturesEnabled}
              onChange={(event) => updateSettingBody({ [AI_FEATURES_ENABLED_KEY]: event.target.checked })}
            />
            <p className="mt-2 text-xs text-fg-subtle">
              Saved as <code>{AI_FEATURES_ENABLED_KEY}</code>. Leave disabled for offline or privacy-sensitive environments; note AI suggestions require user review and never auto-create tasks.
            </p>
          </section>

          <section className="rounded-lg border border-line p-4">
            <Field label="Interface theme" htmlFor="themeSelector">
              <Select id="themeSelector" value={theme} onChange={handleThemeChange} disabled={saveMutation.isPending} className="max-w-xs">
                {THEME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Field>
            <p className="mt-2 text-xs text-fg-subtle">
              Saved as <code>{THEME_SETTING_KEY}</code>. {THEME_OPTIONS.find((option) => option.value === theme)?.description}
            </p>
          </section>

          <Collapsible
            title="Advanced: raw settings JSON"
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
            badge={hasValidationErrors ? <Badge variant="critical">{bodyValidation.errors.length} issue{bodyValidation.errors.length === 1 ? '' : 's'}</Badge> : undefined}
          >
            <div className="flex flex-col gap-3">
              <p className="text-sm text-fg-muted">Edit application settings as JSON directly. Structured controls above write into this payload.</p>
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

          <QueryState isLoading={settingsQuery.isLoading} isError={Boolean((settingsQuery.data && !settingsQuery.data.ok) || (saveMutation.data && !saveMutation.data.ok))} isEmpty={false} successMessage={saveMutation.data?.ok ? 'Settings saved successfully.' : undefined} />
        </div>
      </Card>
    </div>
  );
}
