import { TaskRow, type TaskRowActions } from './TaskRow';
import type { TaskTreeNode } from './taskTypes';

export interface TaskListViewProps extends TaskRowActions {
  tasks: TaskTreeNode[];
  /** projectId -> project name, resolved once from the already-cached projects query (no N+1). */
  projectNames: Map<number, string>;
  label: string;
}

interface TaskBranchProps {
  tasks: TaskTreeNode[];
  depth: number;
  projectNames: Map<number, string>;
  actions: TaskRowActions;
}

function TaskBranch({ tasks, depth, projectNames, actions }: TaskBranchProps) {
  return (
    <>
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          depth={depth}
          projectName={task.projectId === undefined ? undefined : projectNames.get(task.projectId)}
          {...actions}
        >
          {task.subtasks.length > 0 && (
            <ul className="divide-y divide-line border-t border-line" aria-label={`Subtasks of ${task.title}`}>
              <TaskBranch tasks={task.subtasks} depth={depth + 1} projectNames={projectNames} actions={actions} />
            </ul>
          )}
        </TaskRow>
      ))}
    </>
  );
}

/**
 * A real `<ul>`/`<li>` list, not a `role="table"` grid of `div`s: the page's own design-system
 * override (`pages/tasks-workspace.md`, "Avoid: Div soup with no semantics") rules that out, and
 * the fixed 7-column grid it replaced is what forced horizontal scrolling on phones. Subtasks stay
 * nested inside their parent's `<li>`, so the hierarchy survives as structure and not just indent.
 */
export function TaskListView({ tasks, projectNames, label, ...actions }: TaskListViewProps) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card" aria-label={label}>
      <TaskBranch tasks={tasks} depth={0} projectNames={projectNames} actions={actions} />
    </ul>
  );
}
