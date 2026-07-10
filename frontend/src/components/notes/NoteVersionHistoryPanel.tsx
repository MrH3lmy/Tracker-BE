import { QueryState } from "../QueryState";
import { CodePreview } from "./CodePreview";
import type { NoteRecord, NoteVersionRecord } from "./noteTypes";
import { formatDate } from "./notesPageHelpers";
import { Button, Card, CardHeader, Field, Select } from "../ui";

interface NoteVersionHistoryPanelProps {
  versionHistoryNoteId: number | null;
  versionHistoryNote: NoteRecord | null;
  noteVersionsQuery: { isLoading: boolean; data?: { ok: boolean } };
  noteVersions: NoteVersionRecord[];
  selectedVersion: NoteVersionRecord | null;
  setSelectedVersionId: (id: number) => void;
  setVersionHistoryNoteId: (id: number | null) => void;
  restoreNoteVersion: { isPending: boolean };
  restoreSelectedVersion: () => void;
}

export function NoteVersionHistoryPanel({ versionHistoryNoteId, versionHistoryNote, noteVersionsQuery, noteVersions, selectedVersion, setSelectedVersionId, setVersionHistoryNoteId, restoreNoteVersion, restoreSelectedVersion }: NoteVersionHistoryPanelProps) {
  if (versionHistoryNoteId === null) return null;

  return (
    <Card aria-label="Version history">
      <CardHeader
        title={versionHistoryNote?.title ?? `Note #${versionHistoryNoteId}`}
        description="Version history"
        actions={<Button size="sm" onClick={() => setVersionHistoryNoteId(null)}>Close</Button>}
      />
      <QueryState isLoading={noteVersionsQuery.isLoading} isError={Boolean(noteVersionsQuery.data && !noteVersionsQuery.data.ok)} isEmpty={!noteVersionsQuery.isLoading && noteVersions.length === 0} emptyMessage="No previous versions have been saved yet." />
      {noteVersions.length ? (
        <div className="flex flex-wrap items-stretch gap-4">
          <Field label="Saved versions" htmlFor="noteVersionSelect" className="min-w-64 flex-1">
            <Select id="noteVersionSelect" value={selectedVersion?.id ?? ""} onChange={(event) => setSelectedVersionId(Number(event.target.value))}>
              {noteVersions.map((version) => <option key={version.id} value={version.id}>{formatDate(version.createdAt)} · {version.title}</option>)}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button variant="primary" disabled={!selectedVersion || restoreNoteVersion.isPending} onClick={restoreSelectedVersion}>Restore this version</Button>
          </div>
          <div className="min-w-72 flex-1 rounded-lg border border-line bg-inset/30 p-3">
            <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Current</p>
            <h4 className="mt-0.5 text-sm font-semibold text-fg">{versionHistoryNote?.title}</h4>
            <CodePreview body={(versionHistoryNote?.body ?? "").slice(0, 1200)} contentType={versionHistoryNote?.contentType ?? "PLAIN_TEXT"} />
          </div>
          <div className="min-w-72 flex-1 rounded-lg border border-line bg-inset/30 p-3">
            <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Previous · {formatDate(selectedVersion?.createdAt)}</p>
            <h4 className="mt-0.5 text-sm font-semibold text-fg">{selectedVersion?.title}</h4>
            <p className="mt-1 text-sm text-fg-muted">Tags: {selectedVersion?.tags?.join(", ") || "none"}</p>
            <CodePreview body={(selectedVersion?.body ?? "").slice(0, 1200)} contentType={selectedVersion?.contentType ?? "PLAIN_TEXT"} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}
