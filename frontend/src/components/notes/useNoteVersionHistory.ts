import { useMemo, useState } from "react";
import type { ApiCallResult } from "../../apiClient";
import { useNoteVersionsQuery, type useNoteMutations } from "../../hooks/useApiQueries";
import type { DraftNoteBlock } from "./NoteBlockEditor";
import { blocksFromBody } from "./NoteBlockEditor";
import { noteToForm, type NoteFormState } from "./notesPageHelpers";
import type { NoteRecord, NoteVersionRecord } from "./noteTypes";

/**
 * The outcome of a restore attempt, so callers can tell "the user backed out" from "the server
 * refused" from "it worked". The page editor needs that distinction: it may only re-hydrate the
 * document - and thereby replace what is on screen - once the restore has actually succeeded.
 */
const RESTORE_FAILED = "This version could not be restored.";

export type RestoreVersionOutcome =
  | { status: "cancelled" }
  | { status: "restored"; noteId: number }
  | { status: "failed"; message: string };

interface UseNoteVersionHistoryParams {
  notes: NoteRecord[];
  restoreNoteVersion: ReturnType<typeof useNoteMutations>["restoreNoteVersion"];
  setForm: (form: NoteFormState) => void;
  setDraftBlocks: (blocks: DraftNoteBlock[]) => void;
  setEditingNoteId: (noteId: number | null) => void;
  formatDate: (value?: string) => string;
}

export function useNoteVersionHistory({ notes, restoreNoteVersion, setForm, setDraftBlocks, setEditingNoteId, formatDate }: UseNoteVersionHistoryParams) {
  const [versionHistoryNoteId, setVersionHistoryNoteId] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);

  const noteVersionsQuery = useNoteVersionsQuery(versionHistoryNoteId ?? 0, versionHistoryNoteId !== null);
  const noteVersions = useMemo<NoteVersionRecord[]>(
    () => (Array.isArray(noteVersionsQuery.data?.data) ? noteVersionsQuery.data.data : []),
    [noteVersionsQuery.data],
  );
  const selectedVersion = useMemo(() => noteVersions.find((version) => version.id === selectedVersionId) ?? noteVersions[0] ?? null, [noteVersions, selectedVersionId]);
  const versionHistoryNote = useMemo(() => notes.find((note) => note.id === versionHistoryNoteId) ?? null, [notes, versionHistoryNoteId]);

  const openVersionHistory = (note: NoteRecord) => {
    setVersionHistoryNoteId(note.id);
    setSelectedVersionId(null);
  };

  /**
   * Awaitable restore. `mutate()` returns before the request is even sent, so a caller that
   * re-hydrated straight after it could read the note back *before* the server had restored it and
   * pin the pre-restore document on screen for good. Awaiting `mutateAsync` - and reporting whether
   * it actually succeeded - is what lets the caller reload only once the restore is real.
   */
  const restoreSelectedVersion = async (): Promise<RestoreVersionOutcome> => {
    if (!versionHistoryNoteId || !selectedVersion) return { status: "cancelled" };
    const confirmed = window.confirm(`Restore \u201c${selectedVersion.title}\u201d from ${formatDate(selectedVersion.createdAt)}? This will save the current note as a version first.`);
    if (!confirmed) return { status: "cancelled" };

    const restored = selectedVersion;
    const noteId = versionHistoryNoteId;
    let result: ApiCallResult<NoteRecord>;
    try {
      result = await restoreNoteVersion.mutateAsync({ noteId, versionId: restored.id });
    } catch {
      return { status: "failed", message: RESTORE_FAILED };
    }
    // `apiJson` resolves rather than throwing for an HTTP error, so a non-ok result is a failure
    // just as much as a rejected promise is.
    // Keep the server's own words, but lead with what failed - a bare "Request failed with status
    // 500." tells the user nothing about which action it belongs to.
    if (!result?.ok) return { status: "failed", message: result?.error?.message ? `${RESTORE_FAILED} ${result.error.message}` : RESTORE_FAILED };

    setForm({ ...noteToForm({ ...(versionHistoryNote ?? {} as NoteRecord), id: noteId, title: restored.title, body: restored.body ?? "", contentType: restored.contentType, tags: restored.tags ?? [] }) });
    setDraftBlocks(blocksFromBody(restored.body ?? ""));
    setEditingNoteId(noteId);
    return { status: "restored", noteId };
  };

  return {
    versionHistoryNoteId,
    setVersionHistoryNoteId,
    selectedVersionId,
    setSelectedVersionId,
    noteVersionsQuery,
    noteVersions,
    selectedVersion,
    versionHistoryNote,
    openVersionHistory,
    restoreSelectedVersion,
  };
}
