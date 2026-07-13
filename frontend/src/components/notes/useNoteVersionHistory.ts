import { useMemo, useState } from "react";
import { useNoteVersionsQuery, type useNoteMutations } from "../../hooks/useApiQueries";
import type { DraftNoteBlock } from "./NoteBlockEditor";
import { blocksFromBody } from "./NoteBlockEditor";
import { noteToForm, type NoteFormState } from "./notesPageHelpers";
import type { NoteRecord, NoteVersionRecord } from "./noteTypes";

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

  const restoreSelectedVersion = () => {
    if (!versionHistoryNoteId || !selectedVersion) return;
    const confirmed = window.confirm(`Restore “${selectedVersion.title}” from ${formatDate(selectedVersion.createdAt)}? This will save the current note as a version first.`);
    if (!confirmed) return;
    restoreNoteVersion.mutate({ noteId: versionHistoryNoteId, versionId: selectedVersion.id }, {
      onSuccess: () => {
        const restored = selectedVersion;
        setForm({ ...noteToForm({ ...(versionHistoryNote ?? {} as NoteRecord), id: versionHistoryNoteId, title: restored.title, body: restored.body ?? "", contentType: restored.contentType, tags: restored.tags ?? [] }) });
        setDraftBlocks(blocksFromBody(restored.body ?? ""));
        setEditingNoteId(versionHistoryNoteId);
      },
    });
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
