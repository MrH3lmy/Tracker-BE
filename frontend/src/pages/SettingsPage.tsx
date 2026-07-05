import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { QueryState } from '../components/QueryState';
import { useSaveSettingsMutation, useSettingsQuery } from '../hooks/useApiQueries';
import { useTheme } from '../themeContext';
import { isAppTheme, THEME_OPTIONS, THEME_SETTING_KEY } from '../theme';
import { AI_FEATURES_ENABLED_KEY, DEFAULT_DAILY_CAPACITY_HOURS_KEY, EXCLUDED_WEEKDAYS_KEY, HOLIDAY_DATES_KEY, validateSettingsPayload } from '../validation/settings';

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
    <div className="page-pattern settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Settings</h2>
          <p>Edit application settings as JSON with validation feedback before saving.</p>
        </div>
        <button type="button" className="button-primary" onClick={() => bodyValidation.parsed && saveMutation.mutate(bodyValidation.parsed)} disabled={!canSubmit}>
          {saveMutation.isPending ? 'Saving...' : 'Save settings'}
        </button>
      </header>

      <section className="page-card main-content-card config-panel" aria-labelledby="settings-content-title">
        <div className="section-header">
          <div>
            <h3 id="settings-content-title">Configuration panel</h3>
            <p className="muted">Load current settings, edit the JSON payload, then save when validation passes.</p>
          </div>
          <button type="button" className="secondary-action" onClick={() => settingsQuery.refetch()} disabled={settingsQuery.isFetching}>
            {settingsQuery.isFetching ? 'Loading...' : 'Reload settings'}
          </button>
        </div>


        <div className="calendar-settings-card" aria-label="Calendar exclusions">
          <div>
            <p className="eyebrow">Planning calendar</p>
            <h4>Calendar exclusions</h4>
            <p className="muted">Choose the non-working weekdays and one-off holidays that planning capacity should skip.</p>
          </div>
          <fieldset className="weekday-checkbox-grid">
            <legend>Excluded weekdays</legend>
            {WEEKDAY_OPTIONS.map((weekday) => (
              <label key={weekday.value} className="checkbox-pill">
                <input
                  type="checkbox"
                  checked={excludedWeekdays.includes(weekday.value)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...new Set([...excludedWeekdays, weekday.value])]
                      : excludedWeekdays.filter((value) => value !== weekday.value);
                    updateSettingBody({ [EXCLUDED_WEEKDAYS_KEY]: WEEKDAY_OPTIONS.filter((option) => next.includes(option.value)).map((option) => option.value) });
                  }}
                />
                <span>{weekday.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="calendar-settings-grid">
            <label className="field-stack" htmlFor="dailyCapacityHours">
              <span>Daily capacity hours</span>
              <input
                id="dailyCapacityHours"
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={dailyCapacityHours}
                onChange={(event) => updateSettingBody({ [DEFAULT_DAILY_CAPACITY_HOURS_KEY]: Number(event.target.value) })}
              />
            </label>
            <label className="field-stack" htmlFor="holidayDates">
              <span>Holiday dates</span>
              <textarea
                id="holidayDates"
                rows={4}
                value={holidayDates.join('\n')}
                placeholder="2026-01-01"
                onChange={(event) => updateSettingBody({ [HOLIDAY_DATES_KEY]: event.target.value.split(/\n|,/).map((value) => value.trim()).filter(Boolean) })}
              />
            </label>
          </div>
          <p className="muted">Saved as <code>{EXCLUDED_WEEKDAYS_KEY}</code>, <code>{HOLIDAY_DATES_KEY}</code>, and <code>{DEFAULT_DAILY_CAPACITY_HOURS_KEY}</code>.</p>
        </div>

        <div className="theme-selector-card">
          <label className="checkbox-pill" htmlFor="aiFeaturesEnabled">
            <input
              id="aiFeaturesEnabled"
              type="checkbox"
              checked={aiFeaturesEnabled}
              onChange={(event) => updateSettingBody({ [AI_FEATURES_ENABLED_KEY]: event.target.checked })}
            />
            <span>Enable AI-assisted note features</span>
          </label>
          <p className="muted">Saved as <code>{AI_FEATURES_ENABLED_KEY}</code>. Leave disabled for offline or privacy-sensitive environments; note AI suggestions require user review and never auto-create tasks.</p>
        </div>

        <div className="theme-selector-card">
          <label className="field-stack" htmlFor="themeSelector">
            <span>Interface theme</span>
            <select id="themeSelector" value={theme} onChange={handleThemeChange} disabled={saveMutation.isPending}>
              {THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <p className="muted">Saved as <code>{THEME_SETTING_KEY}</code>. {THEME_OPTIONS.find((option) => option.value === theme)?.description}</p>
        </div>

        <div className={`validation-banner ${hasValidationErrors ? 'invalid' : 'valid'}`} role="status">
          <strong>{hasValidationErrors ? 'JSON needs attention' : 'JSON is valid'}</strong>
          <span>{hasValidationErrors ? 'Fix the issues below before saving.' : 'Ready to submit to the settings endpoint.'}</span>
        </div>

        <label className="field-stack" htmlFor="settingsPayload">
          <span>Settings JSON</span>
          <textarea id="settingsPayload" value={body} onChange={(event) => setBody(event.target.value)} rows={14} className="text-block" aria-invalid={hasValidationErrors} />
        </label>

        {bodyValidation.errors.map((error) => <p key={error} className="error">{error}</p>)}

        <div className="save-bar">
          <div>
            <strong>Save controls</strong>
            <p className="muted">PUT the validated JSON to <code>/api/v1/settings</code>.</p>
          </div>
          <div className="row compact-row">
            <button type="button" onClick={() => settingsQuery.refetch()} disabled={settingsQuery.isFetching}>Reload</button>
            <button type="button" className="button-primary" onClick={() => bodyValidation.parsed && saveMutation.mutate(bodyValidation.parsed)} disabled={!canSubmit}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <QueryState isLoading={settingsQuery.isLoading} isError={Boolean((settingsQuery.data && !settingsQuery.data.ok) || (saveMutation.data && !saveMutation.data.ok))} isEmpty={false} successMessage={saveMutation.data?.ok ? 'Settings saved successfully.' : undefined} />
      </section>

    </div>
  );
}
