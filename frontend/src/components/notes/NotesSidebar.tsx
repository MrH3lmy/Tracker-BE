import { blocksFromBody } from "./NoteBlockEditor";
import type { NoteRecord } from "./noteTypes";
import { noteToForm } from "./notesPageHelpers";
import { Button, cn } from "../ui";

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

function NavItem({ active, onClick, className, style, children }: { active?: boolean; onClick: () => void; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'flex min-h-8 w-full items-center gap-2 rounded-md border-l-2 border-transparent px-2 py-1.5 text-left text-sm transition-colors duration-(--duration-fast)',
        active ? 'border-l-brand bg-brand-soft font-medium text-fg' : 'text-fg-muted hover:bg-inset hover:text-fg',
        className,
      )}
    >
      {children}
    </button>
  );
}

function NavSectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="mt-4 mb-2 text-xs font-semibold tracking-wide text-fg-subtle uppercase first:mt-0">{children}</h4>;
}

export function NotesSidebar({ collectionFilter, setCollectionFilter, collections, savedViews, defaultSavedViews, applySavedView, deleteSavedView, saveCurrentView, createSavedView, recentNotes, archivedNotes, setEditingNoteId, setForm, setDraftBlocks }: NotesSidebarProps) {
  const editNote = (note: NoteRecord) => {
    setEditingNoteId(note.id);
    setForm(noteToForm(note));
    setDraftBlocks(blocksFromBody(note.body ?? ""));
  };

  return (
    <aside className="flex min-w-0 flex-col rounded-xl border border-line bg-card p-4 shadow-2xs lg:sticky lg:top-4" aria-label="Notes navigation">
      <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Notes navigation</p>
      <NavSectionTitle>Collections</NavSectionTitle>
      <div className="flex flex-col gap-0.5">
        <NavItem active={!collectionFilter} onClick={() => setCollectionFilter("")}>All collections</NavItem>
        {collections.map((collection) => (
          <NavItem
            key={collection.id}
            active={collectionFilter === String(collection.id)}
            onClick={() => setCollectionFilter(String(collection.id))}
            style={{ borderLeftColor: collection.color ?? undefined }}
          >
            <span aria-hidden="true">{collection.icon ?? "📁"}</span>
            <span className="truncate">{collection.name}</span>
          </NavItem>
        ))}
      </div>
      <NavSectionTitle>Saved views</NavSectionTitle>
      <div className="flex flex-col gap-0.5">
        {defaultSavedViews.map((view) => (
          <NavItem key={view.name} onClick={() => applySavedView(view)}>{view.name}</NavItem>
        ))}
        {savedViews.map((view) => (
          <div key={view.id} className="flex items-center gap-1">
            <NavItem onClick={() => applySavedView(view)} className="flex-1">{view.name}</NavItem>
            <button
              type="button"
              className="shrink-0 rounded-md px-1.5 py-1 text-fg-subtle hover:bg-inset hover:text-critical"
              onClick={() => deleteSavedView.mutate(view.id)}
              aria-label={`Delete saved view ${view.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Button size="sm" className="mt-3" onClick={saveCurrentView} disabled={createSavedView.isPending}>Save current view</Button>
      <NavSectionTitle>Recent notes</NavSectionTitle>
      <div className="flex flex-col gap-0.5">
        {recentNotes.map((note) => <NavItem key={note.id} onClick={() => editNote(note)}><span className="truncate">{note.title}</span></NavItem>)}
      </div>
      <NavSectionTitle>Archived</NavSectionTitle>
      <div className="flex flex-col gap-0.5">
        {archivedNotes.length
          ? archivedNotes.map((note) => <NavItem key={note.id} onClick={() => editNote(note)}><span className="truncate">{note.title}</span></NavItem>)
          : <p className="px-2 py-1.5 text-sm text-fg-subtle">Tag notes with archived to show them here.</p>}
      </div>
    </aside>
  );
}
