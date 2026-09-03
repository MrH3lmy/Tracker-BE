import { Link } from 'react-router-dom';
import { Button } from '../ui';
import { FolderKanban, Link2 } from '../ui/icons';

interface NotesContextBannerProps {
  projectName?: string;
  projectId?: string;
  linkedTaskId?: string;
  linkedTaskTitle?: string;
  onClearProject: () => void;
}

/**
 * Entering Notes through `?projectId=` or `?taskId=` used to look like an unexplained short list
 * with a filter chip somewhere below. This states the scope up front and gives an obvious way out
 * (issue #299), so the global Notes page and Project Command Center -> Notes read as one system.
 */
export function NotesContextBanner({
  projectName,
  projectId,
  linkedTaskId,
  linkedTaskTitle,
  onClearProject,
}: NotesContextBannerProps) {
  if (!projectId && !linkedTaskId) return null;

  return (
    <section
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line border-l-2 border-l-brand bg-brand-soft/50 px-4 py-3"
      aria-label="Notes context"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {projectId ? (
          <FolderKanban className="h-5 w-5 shrink-0 text-brand" aria-hidden />
        ) : (
          <Link2 className="h-5 w-5 shrink-0 text-brand" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">
            {projectId ? projectName ?? `Project #${projectId}` : linkedTaskTitle ?? `Task #${linkedTaskId}`}
          </p>
          <p className="text-[13px] text-fg-muted">
            {projectId
              ? 'Showing notes that belong to this project.'
              : 'Showing notes linked to this task, in sticky order.'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {projectId ? (
          <Link to={`/tasks/projects/${projectId}`} className="text-sm font-medium text-brand hover:underline">
            Open project
          </Link>
        ) : null}
        {linkedTaskId ? (
          <Link className="text-sm font-medium text-brand hover:underline" to="/notes">
            Show all notes
          </Link>
        ) : (
          <Button size="sm" onClick={onClearProject}>
            Show all notes
          </Button>
        )}
      </div>
    </section>
  );
}
