# Page override — Today (v2)

Source of truth: `GET /api/v1/tasks/today` → `{ date, tasks: [{ task, todayReason,
blocked }] }`, pre-ordered by the backend (overdue, then due-today, then
scheduled-today; priority desc within each group). The client only *groups*, never
re-sorts.

## Section hierarchy

Rendered top to bottom, each as its own labeled group (not a generic list):

1. **Ready to work** — `todayReason` in (OVERDUE, DUE_TODAY, SCHEDULED_TODAY) AND
   `!blocked`. This is the actionable set; it appears first because it answers the
   #1 product question ("what should I work on now").
2. **Blocked** — same task pool, `blocked === true`, shown next (not last) because
   "what's blocked / why" is the #2–#4 product question and burying it defeats the
   point. Each row uses `BlockerDisclosure` (collapsed, "Waiting for N →").
3. Within "Ready to work", sub-group by `todayReason` with a small sticky-ish
   sub-header (Overdue / Due Today / Scheduled Today) reusing the same visual
   weight as existing `CardHeader` titles — not full section Cards per reason
   (that would over-fragment a short list). Overdue sub-group gets a `critical`
   accent tick per row (reusing the existing overdue treatment already implied by
   `StatTile`'s `tone="critical"`), not a redundant "Overdue" badge on every row.

This resolves the issue's suggested heading list (Ready / Overdue / Due Today /
Scheduled Today / Blocked) into two visual tiers (actionable vs. blocked) with
reason as a secondary grouping — matches research note "project dashboard
information hierarchy" (actionable-first) and avoids a 5-way flat list that buries
the ready/blocked distinction the issue calls the most important one.

## Row anatomy

`title` · optional `important` star · one date/overdue indicator (only shown when
`todayReason === OVERDUE`, since section already conveys due/scheduled) · click
navigates to `/tasks/{id}`. Blocked rows additionally carry the collapsed
`BlockerDisclosure`. No workflow-`Status` badge in the Ready section (redundant —
section already says "actionable"); Blocked rows *do* show workflow status if it
differs from a plain NOT_STARTED, since a `WAITING` + dependency-`blocked` task is
informative and the two badges use visually distinct families (§4 MASTER rule).

## Preserved existing capabilities

`WeeklyReviewPrompt`, `HabitsTodayCard`, `TimelineCard` (today's scheduled
timeline), `RecommendationsCard` stay — they answer questions Today v2 doesn't
replace (habits, time-blocking, ranked suggestions beyond due/overdue). They move
below the new Today sections so the dependency-aware sections lead.

## Async states

- Loading: single `role="status"` line (existing `TodayPage` pattern), not a
  skeleton per section — keeps the diff small and matches current behavior.
- Empty: `date` present but `tasks` empty → `EmptyState` ("Nothing due today —
  you're clear") with a CTA to add a task, reusing the existing "new account" empty
  state pattern already in `TodayPage.tsx`.
- Error: `EmptyState` with retry, matching the existing error branch.

## Responsive

Sections stack single-column at 375px; at ≥1024px the existing two-column
(`lg:grid-cols-[2fr_1fr]`) layout is kept for the *secondary* cards (habits,
timeline, recommendations), while the new Today sections run full-width above it
since they're the primary content and dense two-column task rows don't compress
well below 1024px.
