import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isQueryError } from '../../apiClient';
import { useProjectNotesQuery } from '../../hooks/useApiQueries';
import { NoteCard } from '../notes/NoteCard';
import { formatDate } from '../notes/notesPageHelpers';
import { NOTE_TYPE_VALUES, type NoteRecord, type NoteType } from '../notes/noteTypes';
import { formatEnumLabel } from '../../lib/enumLabels';
import { Button, EmptyState } from '../ui';
import { AlertTriangle, Plus, StickyNote } from '../ui/icons';

/**
 * A project's typed notes (issue #296). Filters by NoteType client-side against the already-small
 * per-project note list (avoids a second network round trip per filter click); "New note" hands
 * off to the global Notes page pre-filtered/pre-filled for this project rather than duplicating
 * the full create-note form here (see design-system/tracker-be/pages/notes.md).
 */
export function ProjectNotesTab({ projectId }: { projectId: number }) {
  const [typeFilter, setTypeFilter] = useState<NoteType | 'all'>('all');
  const query = useProjectNotesQuery(projectId);
  const notes = useMemo<NoteRecord[]>(() => (Array.isArray(query.data?.data) ? query.data.data : []), [query.data]);
  const filtered = typeFilter === 'all' ? notes : notes.filter((note) => note.noteType === typeFilter);
  const sorted = useMemo(() => [...filtered].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')), [filtered]);

  if (query.isLoading) {
    return <p className="text-sm text-fg-muted" role="status" aria-live="polite">Loading notes...</p>;
  }

  if (isQueryError(query.data)) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load notes"
        description="Something went wrong reaching the server."
        action={<Button size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>{query.isFetching ? 'Retrying...' : 'Retry'}</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by note type">
          <Button size="sm" variant={typeFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setTypeFilter('all')}>All</Button>
          {NOTE_TYPE_VALUES.map((type) => (
            <Button key={type} size="sm" variant={typeFilter === type ? 'primary' : 'secondary'} onClick={() => setTypeFilter(type)}>
              {formatEnumLabel(type)}
            </Button>
          ))}
        </div>
        <Link to={`/notes?projectId=${projectId}`}>
          <Button size="sm" variant="primary"><Plus className="h-4 w-4" aria-hidden />New note</Button>
        </Link>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={notes.length === 0 ? 'No project notes yet' : `No ${formatEnumLabel(typeFilter).toLowerCase()} notes`}
          description={notes.length === 0 ? 'Capture meeting notes, decisions, or research for this project.' : 'Try a different note type filter.'}
          action={notes.length === 0 ? (
            <Link to={`/notes?projectId=${projectId}`}>
              <Button size="sm" variant="primary"><Plus className="h-4 w-4" aria-hidden />Create project note</Button>
            </Link>
          ) : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              layout="row"
              subtitle={<p className="text-sm text-fg-muted">Updated {formatDate(note.updatedAt)}</p>}
              actions={<Link to={`/notes?projectId=${projectId}&q=${encodeURIComponent(note.title)}`} className="text-sm font-medium text-brand hover:underline">Open in Notes</Link>}
            />
          ))}
        </div>
      )}
    </div>
  );
}
