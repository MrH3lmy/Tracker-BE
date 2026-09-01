# Focused interaction research

Each topic below is the "search" the issue asks for, done against real prior art +
this codebase's own constraints, resolved to one concrete decision.

## Blocked task explanation, progressive disclosure
Decision: never show a bare "BLOCKED" chip. Blocked always ships with a
`BlockerDisclosure` one interaction away: collapsed "Waiting for 2 tasks →" in dense
lists (Today, Project Tasks), auto-expanded "Waiting for:" list in single-item
contexts (Task Detail). Each blocker line is itself a link + its own status Badge —
answers "why blocked" and "what unblocks it" in the same disclosure, no second
fetch (backend already returns `blockers[].{id,title,status}`).

## Ready task, actionable status
Decision: `ready` is the **absence** of a badge in the common case (most tasks are
simply workable — that's not news) and a quiet positive `Ready` chip only in
contexts where the reader is actively triaging blocked vs. unblocked side by side
(Today's "Ready to work" section header itself carries that meaning; per-row badges
there would be redundant). Where `blocked`/`ready` sit next to a manual `Status`
badge (Task Detail, Project Tasks), `ReadinessBadge` uses a different shape/tone
family (pill outline + icon) than `taskStatusVariant` badges so the two axes never
visually merge.

## Project dashboard information hierarchy
Decision (F-pattern, top-to-bottom priority): 1) what's actionable now (ready +
blocked counts, linking to Today/Tasks), 2) risk/progress (reuse existing
`ProjectOverviewResponse` progress bar + risk badge, unchanged — it already does
this well), 3) what's next (next incomplete milestone), 4) what changed (last 3-5
activity rows + last 2-3 notes), each with a "View all →" into its tab. No vanity
counters (e.g. total lifetime tasks) get top billing — only counts that answer a
question from the issue's product goal.

## Activity timeline scanning
Decision: icon-in-circle keyed by `eventType` (create/update/complete/note/
conversion), bold summary line, relative timestamp (`Intl.RelativeTimeFormat`,
falls back to absolute on hover/title), metadata folded behind a small "Details"
disclosure rendered as a definition list (never raw JSON). Entity references
(`entityType`+`entityId`) become a link when the type is TASK or NOTE and the
route exists (`/tasks/:id`, or open the note in Notes with a filter); PROJECT
entity rows don't self-link (already on that project's page).

## Responsive tabs / mobile navigation
Decision: reuse the existing `Tabs`/`TabsList` (Radix) for the Command Center's
6 sections but make the list horizontally scrollable (`overflow-x-auto`,
`flex-nowrap`, `scrollbar` hidden but scrollable) below 768px instead of Tailwind
`flex-wrap`, which would stack labels illegibly at 6 items on a 375px screen. No
separate mobile-only dropdown component — one implementation, CSS handles both
breakpoints, consistent with "don't introduce a second navigation pattern."

## Loading / empty / error states
Decision: every new query-backed section reuses `QueryState` for the
loading/error/empty one-liner *or*, where a richer empty state teaches the next
action (Project Notes with zero notes, Activity with zero events), the existing
`EmptyState` component with an icon + actionable CTA — matching the issue's
"No project notes yet → Create project note" example. Error states always expose
a retry (`refetch()`), matching `TodayPage`'s existing error branch.

## Badge / chip accessibility
Decision: status is never color-only — every Badge/ReadinessBadge/NoteTypeBadge
pairs an icon or explicit text label with its color, per the existing `Badge`
component's own convention (it already always renders text). No badge is used as
the sole interactive affordance without a visible focus ring; badges that act as
buttons (e.g. a clickable blocker chip) render as real `<button>`/`<a>` elements.

## Task list information density
Decision: dense rows (title + at most one readiness + one date/importance
indicator) in list contexts; full detail (blockers expanded, recurrence, subtasks)
reserved for Task Detail. This mirrors the existing `TaskListView` row density and
extends it rather than redesigning task rows wholesale.

## Project cockpit dashboard
Decision: Overview is a command surface, not a report — every summary tile/section
links to its tab (Ready/Blocked counts → Tasks tab filtered; milestone → Milestones
tab; activity/notes previews → their tabs). This is what makes it a "cockpit"
rather than a stats page, directly serving the issue's product goal list.

## Keyboard focus, interactive status
Decision: reuse `Button`/`TabsTrigger`'s existing `focus-visible` ring treatment for
all new interactive elements (blocker links, disclosure triggers, activity entity
links, note-type filter chips) — no new focus style invented, so keyboard behavior
stays consistent app-wide.
