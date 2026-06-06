interface TaskEmptyStateProps {
  onAddTask: () => void;
  disabled?: boolean;
}

export function TaskEmptyState({ onAddTask, disabled = false }: TaskEmptyStateProps) {
  return (
    <div className="task-empty-state" role="status" aria-live="polite">
      <div className="task-empty-state__illustration" aria-hidden="true">
        <span className="task-empty-state__icon">✓</span>
        <span className="task-empty-state__card task-empty-state__card--back" />
        <span className="task-empty-state__card task-empty-state__card--front" />
      </div>
      <div className="task-empty-state__copy">
        <h4>No active tasks yet</h4>
        <p>Create your first task to start tracking work.</p>
      </div>
      <button className="button-primary task-empty-state__button" type="button" onClick={onAddTask} disabled={disabled}>
        Add task
      </button>
    </div>
  );
}
