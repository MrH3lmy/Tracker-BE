# Board redesign — screenshots

Captured from the **running application**, driven by Playwright at
`deviceScaleFactor: 2`.

Two sources, both real builds of the frontend:

- The `*-real-backend` shots run against the **actual Spring backend** (packaged
  application, `local-test` profile), with real auth, the real seeded
  `board_columns`, and readiness computed server-side. See `smoke-test.md` for
  the behavioural run against that same stack.
- Every other shot runs against a local stand-in API, so the fixture can be
  shaped to exercise the design harder than a fresh database does.

Design: `../../pages/board.md` · Research: `../../research/board-kanban/`

**Containment.** Every multi-column shot below has been asserted in the browser
to satisfy `board.scrollWidth <= board.clientWidth` and
`documentElement.scrollWidth <= clientWidth`, with the rightmost column's right
edge inside the viewport, at 1440 / 1024 / 768 / 375 and with 3, 4 and 5
configured columns. See `containment.md`.

The fixture is deliberately awkward rather than tidy: five columns with very
different task counts (5 / 3 / 2 / 2 / 0), three blocked tasks spread across
three different columns, two overdue tasks, one important task, recurring tasks
with streaks, tasks with and without scores, subtask counts, and one long title
that has to wrap.

| File | Breakpoint | Theme | State |
|---|---|---|---|
| `board-1440-light.png` | 1440 | Light | Populated board — uneven column counts, blocked and overdue, one empty column |
| `board-1440-dark.png` | 1440 | Dark | Same, dark |
| `board-1024-light.png` | 1024 | Light | Desktop, narrower — five configured columns no longer fit, so the board switches to one column plus the switcher |
| `board-768-light.png` | 768 | Light | Tablet — same containment rule, single column with the switcher |
| `board-375-light.png` | 375 | Light | Mobile — sticky column switcher carrying per-column blocked counts, one column shown |
| `board-375-dark.png` | 375 | Dark | Same, dark |
| `board-1440-light-blockers.png` | 1440 | Light | Blocker disclosures expanded — inline, no nested card surface |
| `board-1440-light-move-menu.png` | 1440 | Light | The move menu: the single-pointer, keyboard-operable alternative to dragging |
| `board-1440-light-dragging.png` | 1440 | Light | Drag in flight — ghosted source, floating overlay, tinted + dashed drop target |
| `board-1440-dark-dragging.png` | 1440 | Dark | Same, dark |
| `board-1440-light-loading.png` | 1440 | Light | The board-shaped loading skeleton (`aria-busy`), reserving the real layout |
| `board-1440-light-filtered.png` | 1440 | Light | `?focus=work` restored from the URL |
| `board-1440-light-real-backend.png` | 1440 | Light | The same board against the **real Spring backend**, real auth, server-computed readiness |
| `board-375-light-real-backend.png` | 375 | Light | Mobile, against the real backend |
| `fit-1440-3col.png` | 1440 | Light | A **three**-column board: all three fit, wider tracks |
| `fit-1440-4col.png` | 1440 | Light | A **four**-column board: all four fit |
| `fit-1024-3col.png` | 1024 | Light | Three columns still fit at 1024 where five do not — the rule follows the configured count, not a breakpoint |
