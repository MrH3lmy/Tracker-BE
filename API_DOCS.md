# API Docs

## Complete task

### `PATCH /api/v1/tasks/{id}/complete`

Marks a task complete.

- Non-recurring task result:
  - `status = DONE`
  - `completedDate = now`
- Recurring task result (same-task reset strategy):
  - Recurrence metadata updated:
    - `lastCompletedDate`
    - `nextDueDate`
  - Task lifecycle reset:
    - `status = NOT_STARTED`
    - `dueDate = nextDueDate`
    - `completedDate = null`

### Supported recurrence frequencies

- `DAILY`
- `WEEKLY` (with `daysOfWeek` constraints)
- `MONTHLY` (with `dayOfMonth` constraints)
- `YEARLY` (with `annualDate` constraints)

All frequencies support `interval >= 1`.
