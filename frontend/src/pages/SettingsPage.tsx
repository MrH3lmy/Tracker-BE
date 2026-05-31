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

  return <div><h2>Settings</h2><div className="row"><button onClick={() => settingsQuery.refetch()} disabled={settingsQuery.isFetching}>{settingsQuery.isFetching ? 'Loading...' : 'GET settings'}</button><button onClick={() => bodyValidation.parsed && saveMutation.mutate(bodyValidation.parsed)} disabled={!canSubmit}>{saveMutation.isPending ? 'Saving...' : 'PUT settings'}</button></div><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="text-block" />{bodyValidation.errors.map((error) => <p key={error} className="error">{error}</p>)}<QueryState isLoading={settingsQuery.isLoading} isError={Boolean((settingsQuery.data && !settingsQuery.data.ok) || saveMutation.data && !saveMutation.data.ok)} isEmpty={false} /><RequestInspector result={saveMutation.data ?? settingsQuery.data ?? null} /></div>;
}
