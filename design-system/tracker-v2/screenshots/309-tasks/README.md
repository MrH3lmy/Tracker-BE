# #309 Tasks surfaces evidence

Captured against the running app (Vite dev server, Playwright, `deviceScaleFactor: 2`)
with `/api/v1/**` stubbed. Fixtures deliberately include a **blocked** task with an
unfinished prerequisite, a **ready** task, an overdue task, a recurring task with a
streak, and a long title, so the states the redesign is about are all visible.

**Every capture reported zero horizontal page overflow.**

| File | Shows |
|---|---|
| `board-1440-light.png` / `-dark.png` | Board at 1440: column region, drag handle separate from the title link, readiness chips |
| `board-1440-light-move-menu.png` | **The WCAG 2.2 AA drag alternative** — move menu open, current column named and disabled |
| `board-768-light.png` | Board at the 768 tier |
| `board-375-light.png` / `-dark.png` | Board at 375: one column plus a switcher, no horizontal content swipe |
| `matrix-1440-light.png` / `-dark.png` | Matrix at 1440: loads on arrival, four quadrants, readiness surfaced |
| `matrix-375-light.png` | Matrix stacked at 375 |
| `detail-1440-light-blocked.png` / `-dark.png` | Task Detail: readiness first with blockers expanded, then dependencies, then the collapsible edit form |
| `detail-375-light-blocked.png` | Task Detail at 375 |
