import type { TaskRecord } from '../tasks/taskTypes';
import { Button, Dialog, Field, Input, Select } from '../ui';
import type { ConvertTaskDraft } from './convertTaskDraft';


interface ConvertNoteToTaskDialogProps {
  draft: ConvertTaskDraft | null;
  onChange: (draft: ConvertTaskDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  availableTasks: TaskRecord[];
}

/**
 * Shared by the library's note cards and the note page's action items, so a structured action
 * converts identically wherever the user is standing (issue #299 follow-up).
 */
export function ConvertNoteToTaskDialog({
  draft,
  onChange,
  onClose,
  onSubmit,
  isPending,
  availableTasks,
}: ConvertNoteToTaskDialogProps) {
  return (
    <Dialog
      open={Boolean(draft)}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Convert to task"
      footer={
        <Button variant="primary" disabled={!draft?.title.trim() || isPending} onClick={onSubmit}>
          {isPending ? 'Creating…' : 'Create linked task'}
        </Button>
      }
    >
      {draft ? (
        <div className="flex flex-col gap-3">
          {draft.noteBlockId ? (
            <p className="text-sm text-fg-muted">
              Converting this action item — it can only become one task, even if you convert it again.
            </p>
          ) : null}
          <Field label="Title" htmlFor="convertTaskTitle">
            <Input id="convertTaskTitle" value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
          </Field>
          <Field label="Due date" htmlFor="convertTaskDueDate">
            <Input id="convertTaskDueDate" type="date" value={draft.dueDate} onChange={(event) => onChange({ ...draft, dueDate: event.target.value })} />
          </Field>
          <Field label="Status" htmlFor="convertTaskStatus">
            <Select id="convertTaskStatus" value={draft.status} onChange={(event) => onChange({ ...draft, status: event.target.value })}>
              <option value="">Backlog</option>
              <option value="NOT_STARTED">Not started</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="WAITING">Waiting</option>
            </Select>
          </Field>
          <Field label="Area" htmlFor="convertTaskArea">
            <Select id="convertTaskArea" value={draft.area} onChange={(event) => onChange({ ...draft, area: event.target.value })}>
              <option value="PERSONAL">Personal</option>
              <option value="WORK">Work</option>
              <option value="STUDY">Study</option>
              <option value="HEALTH">Health</option>
              <option value="FAMILY">Family</option>
            </Select>
          </Field>
          <Field label="Effort" htmlFor="convertTaskEffort">
            <Select id="convertTaskEffort" value={draft.effort} onChange={(event) => onChange({ ...draft, effort: event.target.value })}>
              <option value="QUICK">Quick</option>
              <option value="MEDIUM">Medium</option>
              <option value="DEEP_WORK">Deep work</option>
              <option value="LARGE">Large</option>
            </Select>
          </Field>
          <Field label="Linked task parent" htmlFor="convertTaskParentId">
            <Select id="convertTaskParentId" value={draft.parentTaskId} onChange={(event) => onChange({ ...draft, parentTaskId: event.target.value })}>
              <option value="">No parent</option>
              {availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </Select>
          </Field>
          <p className="text-sm text-fg-muted">Created from note text: {draft.sourceText.slice(0, 160)}</p>
        </div>
      ) : null}
    </Dialog>
  );
}
