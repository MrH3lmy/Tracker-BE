import type { ComponentType, ReactNode } from 'react';
import { Button, cn } from '../ui';
import { Bookmark, Folder, Plus, X } from '../ui/icons';
import { NOTE_SMART_VIEWS, type NoteSmartView, type NoteSmartViewId } from './notesSmartViews';
import type { SavedViewShape } from './useNotesWorkspace';

export interface NotesSavedView extends SavedViewShape {
  id: number;
  name: string;
}

interface NotesWorkspaceNavProps {
  smartViewId: NoteSmartViewId | null;
  onSelectSmartView: (view: NoteSmartView) => void;
  collections: Array<{ id: number; name: string; color?: string | null }>;
  collectionFilter: string;
  onSelectCollection: (collectionId: string) => void;
  savedViews: NotesSavedView[];
  appliedSavedViewId: number | null;
  onApplySavedView: (view: NotesSavedView) => void;
  onDeleteSavedView: (view: NotesSavedView) => void;
  onSaveCurrentView: () => void;
  isSavingView: boolean;
  /** Rendered inside the mobile sheet so every nav choice can dismiss it. */
  onNavigate?: () => void;
}

function NavGroup({ title, children }: { title: string; children: ReactNode }) {
  const headingId = `notes-nav-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h3 id={headingId} className="px-2 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
        {title}
      </h3>
      <ul className="flex flex-col gap-0.5" aria-labelledby={headingId}>
        {children}
      </ul>
    </div>
  );
}

interface NavItemProps {
  active: boolean;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  title?: string;
  swatch?: string | null;
  onSelect: () => void;
  trailing?: ReactNode;
}

function NavItem({ active, icon: Icon, label, title, swatch, onSelect, trailing }: NavItemProps) {
  return (
    <li className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        title={title}
        aria-current={active ? 'true' : undefined}
        className={cn(
          // 44px rows on touch widths, 36px on desktop: the tool's own guidance separates the
          // native 44pt rule from the web 24x24 target-size criterion.
          'flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border-l-2 px-2 text-left text-sm transition-colors duration-(--duration-fast) lg:min-h-9',
          active
            ? 'border-l-brand bg-brand-soft font-semibold text-fg'
            : 'border-l-transparent text-fg-muted hover:bg-inset hover:text-fg',
        )}
      >
        {swatch !== undefined ? (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-line"
            style={swatch ? { backgroundColor: swatch, borderColor: swatch } : undefined}
            aria-hidden
          />
        ) : null}
        {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
        <span className="min-w-0 truncate">{label}</span>
      </button>
      {trailing}
    </li>
  );
}

/**
 * The Notes workspace navigation rail (issue #299): one flat list with three labelled groups,
 * replacing the previous tabs-inside-a-sidebar plus two collapsible teaser lists. The same
 * component is rendered inside a Drawer on small screens, so mobile users get the identical
 * navigation rather than a reduced one.
 */
export function NotesWorkspaceNav({
  smartViewId,
  onSelectSmartView,
  collections,
  collectionFilter,
  onSelectCollection,
  savedViews,
  appliedSavedViewId,
  onApplySavedView,
  onDeleteSavedView,
  onSaveCurrentView,
  isSavingView,
  onNavigate,
}: NotesWorkspaceNavProps) {
  const run = (action: () => void) => () => {
    action();
    onNavigate?.();
  };

  return (
    <nav className="flex min-w-0 flex-col gap-5" aria-label="Notes navigation">
      <NavGroup title="Smart views">
        {NOTE_SMART_VIEWS.map((view) => (
          <NavItem
            key={view.id}
            active={smartViewId === view.id && !collectionFilter}
            icon={view.icon}
            label={view.label}
            title={view.description}
            onSelect={run(() => onSelectSmartView(view))}
          />
        ))}
      </NavGroup>

      <NavGroup title="Collections">
        {collections.length === 0 ? (
          <li className="px-2 py-1.5 text-sm text-fg-subtle">
            No collections yet. Assign a note to a collection while editing it.
          </li>
        ) : (
          collections.map((collection) => (
            <NavItem
              key={collection.id}
              active={collectionFilter === String(collection.id)}
              icon={Folder}
              swatch={collection.color ?? null}
              label={collection.name}
              onSelect={run(() => onSelectCollection(String(collection.id)))}
            />
          ))
        )}
      </NavGroup>

      <NavGroup title="Saved views">
        {savedViews.length === 0 ? (
          <li className="px-2 py-1.5 text-sm text-fg-subtle">
            Save the filters you use often to come back to them in one click.
          </li>
        ) : (
          savedViews.map((view) => (
            <NavItem
              key={view.id}
              active={appliedSavedViewId === view.id}
              icon={Bookmark}
              label={view.name}
              onSelect={run(() => onApplySavedView(view))}
              trailing={
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  className="shrink-0 hover:text-critical"
                  aria-label={`Delete saved view ${view.name}`}
                  onClick={() => onDeleteSavedView(view)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </Button>
              }
            />
          ))
        )}
      </NavGroup>

      <Button size="sm" onClick={onSaveCurrentView} disabled={isSavingView} className="self-start">
        <Plus className="h-4 w-4" aria-hidden />
        Save current view
      </Button>
    </nav>
  );
}
