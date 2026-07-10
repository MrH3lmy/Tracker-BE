import { Button, EmptyState } from '../ui';
import { ListTodo, Plus } from '../ui/icons';

interface TaskEmptyStateProps {
  onAddTask: () => void;
  disabled?: boolean;
}

export function TaskEmptyState({ onAddTask, disabled = false }: TaskEmptyStateProps) {
  return (
    <div role="status" aria-live="polite">
      <EmptyState
        icon={ListTodo}
        title="No active tasks yet"
        description="Create your first task to start tracking work."
        action={
          <Button variant="primary" size="sm" onClick={onAddTask} disabled={disabled}>
            <Plus className="h-4 w-4" aria-hidden />
            Add task
          </Button>
        }
      />
    </div>
  );
}
