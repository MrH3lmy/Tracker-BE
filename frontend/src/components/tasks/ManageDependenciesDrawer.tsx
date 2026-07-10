import type { TaskRecord } from './taskTypes';
import { Button, Drawer, Field, Select } from '../ui';

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
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Add a blocker relationship"
      description="Choose the task that is waiting, then the task that blocks it."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" form="dependency-links-form" disabled={dependencyDisabled}>Link dependency</Button>
        </>
      }
    >
      <form
        id="dependency-links-form"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submitDependency();
        }}
      >
        <Field label="Waiting task" htmlFor="dependencyTaskId">
          <Select id="dependencyTaskId" value={dependencyTaskId} onChange={(event) => setDependencyTaskId(event.target.value)} disabled={busy}>
            <option value="">Select task...</option>
            {activeTasks.map((task) => <option key={`wait-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}
          </Select>
        </Field>
        <Field label="Blocked by" htmlFor="dependencyBlocksTaskId">
          <Select id="dependencyBlocksTaskId" value={dependencyBlocksTaskId} onChange={(event) => setDependencyBlocksTaskId(event.target.value)} disabled={busy}>
            <option value="">Select blocker...</option>
            {activeTasks.map((task) => <option key={`blocks-${task.id}`} value={task.id}>#{task.id} {task.title}</option>)}
          </Select>
        </Field>
      </form>
    </Drawer>
  );
}
