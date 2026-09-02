# Page override — Today (v2, redesigned per PR #297 review)

Source of truth: `GET /api/v1/tasks/today` → `{ date, tasks: [{ task, todayReason, blocked }] }`,
pre-ordered by the backend. The client only *groups*, never re-sorts. Implementation:
`components/tasks/TodaySections.tsx`, composed inside `pages/TodayPage.tsx`.

## Why the first version wasn't enough

The original pass added the new task data as one more `Card` above the pre-existing stat-tile /
timeline / habits stack - functionally correct, visually just "more content in the old shape."
This version replaces the outer card with two purpose-built instrument panels and demotes
everything else into a real secondary column, per the blocking review.

## Composition (implemented)

Two-column at `lg:` (`grid-cols-[minmax(0,1fr)_320px]`), single column below that:

**Primary column** (`Today's plan`):
1. **Ready to work** panel - a teal (`bg-brand-soft` header / `bg-brand` icon chip) bordered
   panel with a live `font-mono` count. Sub-grouped by `todayReason` with a colored rail dot
   (red = Overdue, teal = Due Today, neutral = Scheduled Today) plus a `(`n`)` count per group,
   ahead of any row text - the reason is legible before reading a single task title.
2. **Blocked** panel directly below, same anatomy but orange (`bg-caution-soft`/`text-caution`,
   `border-caution/40`) - a genuinely different color block, not a smaller/quieter version of the
   Ready panel, so blocked reads as its own state rather than an afterthought.
3. **Waiting / not actionable** panel below that (added per the follow-up review, issue #297):
   dependency readiness (`blocked`) and status-actionability (`ready`) are two separate backend
   fields - a `WAITING`/`BACKLOG`/manually-`BLOCKED` task can have `blocked=false` without being
   `ready`. Classifying "Ready to work" from `!blocked` alone silently mislabeled those tasks as
   actionable. This third, deliberately muted panel (`bg-inset`, neutral `fg-subtle` icon chip -
   not colored like Ready/Blocked, since it isn't an alert) keeps them visible without either
   claiming they're ready or dropping them from view.
4. Today's timeline and top recommendations stay in the primary column (still "what to do today"),
   below the three panels.

**Secondary column** (`aside`, narrower, per the review's "habits/timeline/weekly review clearly
secondary" instruction):
- Weekly review prompt, a compact 2-up Habits/Focus-time stat pair, the Habits check-in card,
  Upcoming, Waiting & Blocked, Follow-ups due.

Mobile: the grid collapses to one column, primary content first.

## Row anatomy (unchanged logic, restyled)

`title` · `important` star · overdue-only due-date badge (`font-mono`, since it's a date) ·
`ReadinessBadge` · workflow `Status` badge (only when not the default `NOT_STARTED`/`DONE`).
Blocked rows keep `BlockerDisclosure` beneath them. No visual/behavioral change to the
ready/blocked/reason **logic** - only the container styling, grouping chrome, and column
placement changed.

## Design tokens applied

Teal primary (`#0F766E` light / `#14B8A6` dark) for the Ready panel, orange caution
(`#9A3412` light / `#FB923C` dark) for the Blocked panel, `font-mono` (Fira Code) for every
numeric readout (counts, dates) so they scan as data rather than prose - see `../MASTER.md` and
`../REDESIGN-296.md`.
