/**
 * The convert-to-task draft shape, shared by the library's note cards and the note page
 * (issue #299 follow-up). Lives outside the dialog component so both callers can build one
 * without importing a React component.
 */
export interface ConvertTaskDraft {
  noteId: number;
  sourceText: string;
  title: string;
  dueDate: string;
  status: string;
  area: string;
  effort: string;
  parentTaskId: string;
  /**
   * Set only when converting a persisted structured action item - carries the real
   * `note_blocks.id` so the backend's idempotent (note, block) conversion applies
   * (issues #287/#296). Free-text conversion leaves it unset and always creates a new task.
   */
  noteBlockId?: number;
}

export function emptyConvertDraft(noteId: number, sourceText: string, noteBlockId?: number): ConvertTaskDraft {
  const trimmed = sourceText.trim();
  return {
    noteId,
    sourceText: trimmed,
    title: trimmed.slice(0, 255),
    dueDate: '',
    status: '',
    area: 'PERSONAL',
    effort: 'MEDIUM',
    parentTaskId: '',
    noteBlockId,
  };
}
