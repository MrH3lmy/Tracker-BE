import { blocksFromBody } from "./NoteBlockEditor";
import type { NoteRecord } from "./noteTypes";
import { noteToForm } from "./notesPageHelpers";

interface NotesSidebarProps {
  collectionFilter: string;
  setCollectionFilter: (value: string) => void;
  collections: Array<{ id: number; name: string; color?: string | null; icon?: string | null }>;
  savedViews: Array<{ id: number; name: string; filters: Record<string, unknown>; sortField: string; sortDirection: string; viewType: string }>;
  defaultSavedViews: Array<{ name: string; filters: Record<string, unknown>; sortField: string; sortDirection: string; viewType: string }>;
  applySavedView: (view: { filters: Record<string, unknown>; sortField: string; sortDirection: string; viewType: string }) => void;
  deleteSavedView: { mutate: (id: number) => void };
  saveCurrentView: () => void;
  createSavedView: { isPending: boolean };
  recentNotes: NoteRecord[];
  taskLinkedNotes: NoteRecord[];
  archivedNotes: NoteRecord[];
  setEditingNoteId: (id: number) => void;
  setForm: (form: ReturnType<typeof noteToForm>) => void;
  setDraftBlocks: (blocks: ReturnType<typeof blocksFromBody>) => void;
}

export function NotesSidebar({ collectionFilter, setCollectionFilter, collections, savedViews, defaultSavedViews, applySavedView, deleteSavedView, saveCurrentView, createSavedView, recentNotes, taskLinkedNotes, archivedNotes, setEditingNoteId, setForm, setDraftBlocks }: NotesSidebarProps) {
  const editNote = (note: NoteRecord) => {
    setEditingNoteId(note.id);
    setForm(noteToForm(note));
    setDraftBlocks(blocksFromBody(note.body ?? ""));
  };

  return (
    <aside className="page-card" aria-label="Notes navigation" style={{ position: "sticky", top: "var(--space-4)" }}>
      <p className="eyebrow">Notes navigation</p>
      <h3>Collections</h3>
      <button type="button" className={!collectionFilter ? "button-primary" : "secondary-action"} onClick={() => setCollectionFilter("")}>All notes</button>
      <div className="stacked-list" style={{ marginTop: "var(--space-3)" }}>
        {collections.map((collection) => (
          <button key={collection.id} type="button" className={collectionFilter === String(collection.id) ? "button-primary" : "secondary-action"} onClick={() => setCollectionFilter(String(collection.id))} style={{ justifyContent: "flex-start", borderLeft: `0.35rem solid ${collection.color ?? "#38bdf8"}` }}>
            {collection.icon ?? "📁"} {collection.name}
          </button>
        ))}
      </div>
      <h4>Saved views</h4>
      <div className="stacked-list" style={{ marginTop: "var(--space-3)" }}>
        {defaultSavedViews.map((view) => (
          <button key={view.name} type="button" className="secondary-action" onClick={() => applySavedView(view)} style={{ justifyContent: "flex-start" }}>{view.name}</button>
        ))}
        {savedViews.map((view) => (
          <span key={view.id} className="row compact-row" style={{ alignItems: "center" }}>
            <button type="button" className="secondary-action" onClick={() => applySavedView(view)} style={{ justifyContent: "flex-start", flex: 1 }}>{view.name}</button>
            <button type="button" className="link-button" onClick={() => deleteSavedView.mutate(view.id)} aria-label={`Delete saved view ${view.name}`}>×</button>
          </span>
        ))}
      </div>
      <button type="button" className="secondary-action" onClick={saveCurrentView} disabled={createSavedView.isPending} style={{ marginTop: "var(--space-3)" }}>Save current view</button>
      <h4>Recent notes</h4>
      {recentNotes.map((note) => <button key={note.id} type="button" className="link-button" onClick={() => editNote(note)}>{note.title}</button>)}
      <h4>Task-linked</h4>
      {taskLinkedNotes.length ? taskLinkedNotes.map((note) => <p key={note.id} className="muted">{note.title}</p>) : <p className="muted">No task-linked notes.</p>}
      <h4>Archived</h4>
      {archivedNotes.length ? archivedNotes.map((note) => <p key={note.id} className="muted">{note.title}</p>) : <p className="muted">Tag notes with archived to show them here.</p>}
    </aside>
  );
}
