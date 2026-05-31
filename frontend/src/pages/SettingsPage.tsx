import { useEffect, useMemo, useState } from 'react';
import { RequestInspector } from '../components/RequestInspector';
import { QueryState } from '../components/QueryState';
import { useSaveSettingsMutation, useSettingsQuery } from '../hooks/useApiQueries';
import { validateSettingsPayload } from '../validation/settings';

export function SettingsPage() {
  const settingsQuery = useSettingsQuery(true);
  const saveMutation = useSaveSettingsMutation();
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

      <section className="page-card diagnostics-card" aria-labelledby="settings-diagnostics-title">
        <h3 id="settings-diagnostics-title">Request diagnostics</h3>
        <p className="muted">Latest settings load or save request, including payload and parsed response.</p>
        <RequestInspector result={saveMutation.data ?? settingsQuery.data ?? null} />
      </section>
    </div>
  );
}
