# Tracker-BE

## Recurring task completion strategy

This project uses a **same-task reset** strategy for recurring tasks:

1. Client calls `PATCH /api/v1/tasks/{id}/complete`.
2. Service marks completion timestamp for non-recurring tasks (`status=DONE`, `completedDate=now`).
3. For recurring tasks (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), service computes `nextDueDate`, stores:
   - `recurrenceRule.lastCompletedDate`
   - `recurrenceRule.nextDueDate`
4. The same task record is then reset to active continuity:
   - `status=NOT_STARTED`
   - `dueDate=nextDueDate`
   - `completedDate=null`

This keeps one canonical task row while still preserving recurrence history via the recurrence rule fields.

### Recurrence rule behavior

- `DAILY`: `nextDueDate = completionDate + interval days`
- `WEEKLY`: honors `daysOfWeek`; picks next matching day and cadence by `interval` weeks.
- `MONTHLY`: honors `dayOfMonth`; clamps to end-of-month when day exceeds month length.
- `YEARLY`: honors `annualDate`; clamps invalid leap-day years to last day of month.
