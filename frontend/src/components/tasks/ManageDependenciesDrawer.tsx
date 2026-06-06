import type { TaskRecord } from './taskTypes';
import filterStyles from './TaskFilters.module.css';

interface ManageDependenciesDrawerProps {
  activeTasks: TaskRecord[];
  busy: boolean;
  dependencyTaskId: string;
  dependencyBlocksTaskId: string;
  setDependencyTaskId: (value: string) => void;
  setDependencyBlocksTaskId: (value: string) => void;
  submitDependency: () => void;
  onClose: () => void;
}

export function ManageDependenciesDrawer({ activeTasks, busy, dependencyTaskId, dependencyBlocksTaskId, setDependencyTaskId, setDependencyBlocksTaskId, submitDependency, onClose }: ManageDependenciesDrawerProps) {
  const dependencyDisabled = busy || !dependencyTaskId || !dependencyBlocksTaskId || dependencyTaskId === dependencyBlocksTaskId;

  return (
    <div className="dependency-drawer-backdrop" role="presentation">
      <aside className="panel dependency-drawer" role="dialog" aria-modal="true" aria-labelledby="dependency-links-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Dependency links</p>
            <h3 id="dependency-links-title">Add a blocker relationship</h3>
            <p>Choose the task that is waiting, then the task that blocks it.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close dependency manager">Close</button>
        </div>
        <form
          className={filterStyles.toolbar}
          onSubmit={(event) => {
            event.preventDefault();
            submitDependency();
          }}
        >
          <label htmlFor="dependencyTaskId">
            <span>Waiting task</span>
            <select id="dependencyTaskId" value={dependencyTaskId} onChange={(event) => setDependencyTaskId(event.target.value)} disabled={busy}>
              <option value="">Select task...</option>
              {activeTasks.map((task) => <option key={`wait-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}
            </select>
          </label>
          <label htmlFor="dependencyBlocksTaskId">
            <span>Blocked by</span>
            <select id="dependencyBlocksTaskId" value={dependencyBlocksTaskId} onChange={(event) => setDependencyBlocksTaskId(event.target.value)} disabled={busy}>
              <option value="">Select blocker...</option>
              {activeTasks.map((task) => <option key={`blocks-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}
            </select>
          </label>
          <button type="submit" className="button-primary" disabled={dependencyDisabled}>Link dependency</button>
        </form>
      </aside>
    </div>
  );
}
