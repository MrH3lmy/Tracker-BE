import { useEffect, useState } from 'react';
import { Badge, Button, Field, Input, Popover, PopoverContent, PopoverTrigger } from '../ui';
import { Check, Eye, Pencil, Trash2, X } from '../ui/icons';
import {
  readSavedViews,
  removeSavedView,
  renameSavedView,
  upsertSavedView,
  writeSavedViews,
  type SavedTaskView,
} from './savedTaskViews';

export interface TaskSavedViewsProps {
  serializedFilters: string;
  onApply: (params: string) => void;
  disabled?: boolean;
}

/**
 * Saved views promoted from "a collapsible inside the filters popover" to a first-class toolbar
 * control (issue #304 §7: they have to stay discoverable without overwhelming the page). Storage
 * is unchanged - still `localStorage`, still the same key and shape.
 */
export function TaskSavedViews({ serializedFilters, onApply, disabled = false }: TaskSavedViewsProps) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedTaskView[]>(readSavedViews);
  const [newViewName, setNewViewName] = useState('');
  const [renamingView, setRenamingView] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => writeSavedViews(views), [views]);

  const saveCurrent = () => {
    const name = newViewName.trim();
    if (!name) return;
    setViews((current) => upsertSavedView(current, { name, params: serializedFilters }));
    setNewViewName('');
  };

  const commitRename = () => {
    const to = renameValue.trim();
    if (!renamingView || !to) return;
    setViews((current) => renameSavedView(current, renamingView, to));
    setRenamingView(null);
    setRenameValue('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button aria-expanded={open} disabled={disabled}>
          <Eye className="h-4 w-4" aria-hidden />
          Views
          {views.length > 0 && <Badge variant="neutral" aria-hidden>{views.length}</Badge>}
          <span className="sr-only">{views.length === 0 ? 'no saved views' : `${views.length} saved views`}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))]" aria-label="Saved task views">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-fg">Saved views</h3>
          {views.length === 0 ? (
            <p className="text-sm text-fg-muted">No saved views yet. Set up a lens, filters and sort, then save them here to come back to this exact view.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {views.map((view) => (
                <li key={view.name}>
                  {renamingView === view.name ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        aria-label={`New name for ${view.name}`}
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                      />
                      <Button size="sm" iconOnly aria-label={`Save new name for ${view.name}`} onClick={commitRename} disabled={!renameValue.trim()}>
                        <Check className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button size="sm" variant="ghost" iconOnly aria-label="Cancel rename" onClick={() => setRenamingView(null)}>
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { onApply(view.params); setOpen(false); }}
                        className="min-h-9 min-w-0 flex-1 cursor-pointer truncate rounded-md px-2 py-1.5 text-left text-sm text-fg transition-colors duration-(--duration-fast) hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        {view.name}
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        iconOnly
                        aria-label={`Rename ${view.name}`}
                        onClick={() => { setRenamingView(view.name); setRenameValue(view.name); }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        iconOnly
                        aria-label={`Delete ${view.name}`}
                        onClick={() => setViews((current) => removeSavedView(current, view.name))}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2 border-t border-line pt-3">
            <Field label="Save current view as" htmlFor="savedTaskViewName" className="flex-1">
              <Input
                id="savedTaskViewName"
                placeholder="Ready this week"
                value={newViewName}
                onChange={(event) => setNewViewName(event.target.value)}
              />
            </Field>
            <Button variant="primary" onClick={saveCurrent} disabled={!newViewName.trim()}>Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
