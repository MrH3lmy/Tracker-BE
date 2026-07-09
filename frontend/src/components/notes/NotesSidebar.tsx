import styles from "./NotesPage.module.css";
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

export function NotesSidebar({ collectionFilter, setCollectionFilter, collections, savedViews, defaultSavedViews, applySavedView, deleteSavedView, saveCurrentView, createSavedView, recentNotes, archivedNotes, setEditingNoteId, setForm, setDraftBlocks }: NotesSidebarProps) {
  const editNote = (note: NoteRecord) => {
    setEditingNoteId(note.id);
    setForm(noteToForm(note));
    setDraftBlocks(blocksFromBody(note.body ?? ""));
  };

  return (
    <aside className={`page-card ${styles.stickyPanel}`} aria-label="Notes navigation">
      <p className="eyebrow">Notes navigation</p>
      <h3 className={styles.navSectionTitle}>Collections</h3>
      <div className={styles.navList}>
        <button type="button" className={`${styles.navItem} ${!collectionFilter ? styles.navItemActive : ""}`} onClick={() => setCollectionFilter("")}>All collections</button>
        {collections.map((collection) => (
          <button key={collection.id} type="button" className={`${styles.navItem} ${collectionFilter === String(collection.id) ? styles.navItemActive : ""}`} onClick={() => setCollectionFilter(String(collection.id))} style={{ borderLeftColor: collection.color ?? "#38bdf8" }}>
            <span aria-hidden="true">{collection.icon ?? "📁"}</span>
            <span>{collection.name}</span>
          </button>
        ))}
      </div>
      <h4 className={styles.navSectionTitle}>Saved views</h4>
      <div className={styles.navList}>
        {defaultSavedViews.map((view) => (
          <button key={view.name} type="button" className={styles.navItem} onClick={() => applySavedView(view)}>{view.name}</button>
        ))}
        {savedViews.map((view) => (
          <span key={view.id} className={`${styles.navItemRow} ${styles.centerRow}`}>
            <button type="button" className={`${styles.navItem} ${styles.sidebarButtonGrow}`} onClick={() => applySavedView(view)}>{view.name}</button>
            <button type="button" className="link-button" onClick={() => deleteSavedView.mutate(view.id)} aria-label={`Delete saved view ${view.name}`}>×</button>
          </span>
        ))}
      </div>
      <button type="button" className={`secondary-action ${styles.sidebarAction}`} onClick={saveCurrentView} disabled={createSavedView.isPending}>Save current view</button>
      <h4 className={styles.navSectionTitle}>Recent notes</h4>
      <div className={styles.navList}>
        {recentNotes.map((note) => <button key={note.id} type="button" className={styles.navItem} onClick={() => editNote(note)}>{note.title}</button>)}
      </div>
      <h4 className={styles.navSectionTitle}>Archived</h4>
      <div className={styles.navList}>
        {archivedNotes.length ? archivedNotes.map((note) => <button key={note.id} type="button" className={styles.navItem} onClick={() => editNote(note)}>{note.title}</button>) : <p className={styles.navEmpty}>Tag notes with archived to show them here.</p>}
      </div>
    </aside>
  );
}
