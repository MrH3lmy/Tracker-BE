import type { TaskStatus } from '../../validation/taskStatus';
import type { BlockerWarning, TaskRecord } from './taskTypes';

interface BlockerPanelProps {
  warnings: BlockerWarning[];
  dependencyCount: number;
  activeTasks: TaskRecord[];
  busy: boolean;
  dependencyTaskId: string;
  dependencyBlocksTaskId: string;
  onDependencyTaskIdChange: (value: string) => void;
  onDependencyBlocksTaskIdChange: (value: string) => void;
  onSubmitDependency: () => void;
  onChangeStatus: (taskId: number, status: TaskStatus) => void;
  onSnoozeFollowUp: (task: TaskRecord) => void;
}

export function BlockerPanel({ warnings, dependencyCount, activeTasks, busy, dependencyTaskId, dependencyBlocksTaskId, onDependencyTaskIdChange, onDependencyBlocksTaskIdChange, onSubmitDependency, onChangeStatus, onSnoozeFollowUp }: BlockerPanelProps) {
  return (
    <>
      {warnings.length > 0 && (
        <section className="panel blocker-panel" aria-labelledby="blocker-warnings-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">Blocker radar</p>
              <h3 id="blocker-warnings-title">{warnings.length} blocker warning{warnings.length === 1 ? '' : 's'}</h3>
              <p>{dependencyCount} dependency link{dependencyCount === 1 ? '' : 's'} tracked.</p>
            </div>
          </div>
          <div className="blocker-warning-grid">
            {warnings.slice(0, 6).map((warning, index) => {
              const task = warning.taskId ? activeTasks.find((candidate) => candidate.id === warning.taskId) : undefined;
              return (
                <article className="blocker-warning-card" key={`${warning.type}-${warning.taskId ?? index}-${index}`}>
                  <p className="eyebrow">{warning.type.replaceAll('_', ' ')}</p>
                  <h4>{warning.title}</h4>
                  <p><strong>{warning.taskId ? `#${warning.taskId} ${warning.taskTitle ?? ''}` : 'Dependency chain'}</strong></p>
                  <p>{warning.message}</p>
                  <p>{warning.recommendation}</p>
                  {warning.relatedTaskIds && warning.relatedTaskIds.length > 0 && <p>Related: {warning.relatedTaskIds.map((id) => `#${id}`).join(', ')}</p>}
                  {task && (
                    <div className="task-actions">
                      <button type="button" disabled={busy} onClick={() => onChangeStatus(task.id, 'IN_PROGRESS')}>Start task</button>
                      <button type="button" disabled={busy} onClick={() => onSnoozeFollowUp(task)}>Follow up tomorrow</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel dependency-panel" aria-labelledby="dependency-links-title">
        <div>
          <p className="eyebrow">Dependency links</p>
          <h3 id="dependency-links-title">Add a blocker relationship</h3>
          <p>Choose the task that is waiting, then the task that blocks it.</p>
        </div>
        <div className="task-toolbar">
          <label htmlFor="dependencyTaskId"><span>Waiting task</span><select id="dependencyTaskId" value={dependencyTaskId} onChange={(e) => onDependencyTaskIdChange(e.target.value)} disabled={busy}><option value="">Select task...</option>{activeTasks.map((task) => <option key={`wait-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}</select></label>
          <label htmlFor="dependencyBlocksTaskId"><span>Blocked by</span><select id="dependencyBlocksTaskId" value={dependencyBlocksTaskId} onChange={(e) => onDependencyBlocksTaskIdChange(e.target.value)} disabled={busy}><option value="">Select blocker...</option>{activeTasks.map((task) => <option key={`blocks-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}</select></label>
          <button type="button" className="button-primary" onClick={onSubmitDependency} disabled={busy || !dependencyTaskId || !dependencyBlocksTaskId || dependencyTaskId === dependencyBlocksTaskId}>Link dependency</button>
        </div>
      </section>
    </>
  );
}
