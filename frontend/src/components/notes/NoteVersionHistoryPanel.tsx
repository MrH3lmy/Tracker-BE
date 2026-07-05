import { QueryState } from "../QueryState";
import { CodePreview } from "./CodePreview";
import type { NoteRecord, NoteVersionRecord } from "./noteTypes";
import { formatDate } from "./notesPageHelpers";

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
    <section className="panel" aria-label="Version history" style={{ marginTop: "var(--space-4)", padding: "var(--space-4)" }}>
      <div className="section-header"><div><p className="eyebrow">Version history</p><h3>{versionHistoryNote?.title ?? `Note #${versionHistoryNoteId}`}</h3></div><button type="button" onClick={() => setVersionHistoryNoteId(null)}>Close</button></div>
      <QueryState isLoading={noteVersionsQuery.isLoading} isError={Boolean(noteVersionsQuery.data && !noteVersionsQuery.data.ok)} isEmpty={!noteVersionsQuery.isLoading && noteVersions.length === 0} emptyMessage="No previous versions have been saved yet." />
      {noteVersions.length ? (
        <div className="row" style={{ alignItems: "stretch", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <label className="field-stack" style={{ flex: "1 1 16rem" }}><span>Saved versions</span><select value={selectedVersion?.id ?? ""} onChange={(event) => setSelectedVersionId(Number(event.target.value))}>{noteVersions.map((version) => <option key={version.id} value={version.id}>{formatDate(version.createdAt)} · {version.title}</option>)}</select></label>
          <div className="row compact-row" style={{ alignSelf: "end" }}><button type="button" className="button-primary" disabled={!selectedVersion || restoreNoteVersion.isPending} onClick={restoreSelectedVersion}>Restore this version</button></div>
          <div className="panel" style={{ flex: "1 1 22rem", padding: "var(--space-3)" }}><p className="eyebrow">Current</p><h4>{versionHistoryNote?.title}</h4><CodePreview body={(versionHistoryNote?.body ?? "").slice(0, 1200)} contentType={versionHistoryNote?.contentType ?? "PLAIN_TEXT"} /></div>
          <div className="panel" style={{ flex: "1 1 22rem", padding: "var(--space-3)" }}><p className="eyebrow">Previous · {formatDate(selectedVersion?.createdAt)}</p><h4>{selectedVersion?.title}</h4><p className="muted">Tags: {selectedVersion?.tags?.join(", ") || "none"}</p><CodePreview body={(selectedVersion?.body ?? "").slice(0, 1200)} contentType={selectedVersion?.contentType ?? "PLAIN_TEXT"} /></div>
        </div>
      ) : null}
    </section>
  );
}
