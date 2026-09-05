# Board redesign — screenshots

Captured from the **running application** (Vite dev server against a local
stand-in API serving `/api/v1/board-columns`, `/api/v1/tasks` and
`/api/v1/tasks/{id}/move`), driven by Playwright at `deviceScaleFactor: 2`.

Design: `../../pages/board.md` · Research: `../../research/board-kanban/`

The fixture is deliberately awkward rather than tidy: five columns with very
different task counts (5 / 3 / 2 / 2 / 0), three blocked tasks spread across
three different columns, two overdue tasks, one important task, recurring tasks
with streaks, tasks with and without scores, subtask counts, and one long title
that has to wrap.

| File | Breakpoint | Theme | State |
|---|---|---|---|
| `board-1440-light.png` | 1440 | Light | Populated board — uneven column counts, blocked and overdue, one empty column |
| `board-1440-dark.png` | 1440 | Dark | Same, dark |
| `board-1024-light.png` | 1024 | Light | Desktop, narrower — sidebar plus three-and-a-peek columns |
| `board-768-light.png` | 768 | Light | Tablet — labelled rail plus two full columns and a peek |
| `board-375-light.png` | 375 | Light | Mobile — sticky column switcher carrying per-column blocked counts, one column shown |
| `board-375-dark.png` | 375 | Dark | Same, dark |
| `board-1440-light-blockers.png` | 1440 | Light | Blocker disclosures expanded — inline, no nested card surface |
| `board-1440-light-move-menu.png` | 1440 | Light | The move menu: the single-pointer, keyboard-operable alternative to dragging |
| `board-1440-light-dragging.png` | 1440 | Light | Drag in flight — ghosted source, floating overlay, tinted + dashed drop target |
| `board-1440-dark-dragging.png` | 1440 | Dark | Same, dark |
| `board-1440-light-loading.png` | 1440 | Light | The board-shaped loading skeleton (`aria-busy`), reserving the real layout |
| `board-1440-light-filtered.png` | 1440 | Light | `?focus=work` restored from the URL |
