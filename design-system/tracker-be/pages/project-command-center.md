# Page override — Project Command Center (`/tasks/projects/:id`)

Replaces the current 3-tab (Overview/Milestones/Tasks) `ProjectDetailPage` with 6
tabs: **Overview · Today · Tasks · Milestones · Notes · Activity**.

## Navigation

Reuse the existing `Tabs`/`TabsList`/`TabsTrigger` (Radix) — no new nav component.
`TabsList` gets `overflow-x-auto flex-nowrap` (currently it's a flex row with no
overflow handling, fine for 3 items but 6 labels don't fit 375px). Active-tab
convention unchanged (`bg-card` chip inside `bg-inset` track). URL stays a single
route with in-page tab state (matches current behavior — no per-tab sub-routes,
keeps deep-linking to the project simple); a tab is chosen via `?tab=` query param
so a link into e.g. Activity from the dashboard/global Notes page can land directly
on the right tab and survive a refresh.

## Overview tab

Keeps the existing Progress card + 4-stat grid + milestone list (already good —
per MASTER §2 verdict) and adds, above the milestone list:

1. **Command row** — three linkable summary tiles: **Ready** (count, → Tasks tab
   filtered to ready), **Blocked** (count, → Tasks tab filtered to blocked, or a
   direct BlockerDisclosure preview of the top 1-2 blocked tasks), **Overdue**
   (existing stat, now also a link). Computed client-side from
   `GET /projects/{id}/tasks` (`ready`/`blocked` fields) — no new backend call.
2. **Recent activity** — last 3 rows from `GET /projects/{id}/activity?size=3`,
   using the same `ActivityTimelineItem` as the Activity tab, with "View all →".
3. **Recent notes** — last 3 from `GET /projects/{id}/notes` (client-side slice by
   `updatedAt` desc), each showing `NoteTypeBadge` + title, "View all →" into Notes
   tab.

This directly answers all six Overview questions from the issue without adding a
single new backend endpoint.

## Today tab

Renders `GET /projects/{id}/today` through the *same* section components as Today
v2 (`TodaySections`, shared component — see `pages/today.md`), parameterized by
project so the ready/blocked/reason semantics are identical, never re-implemented.
Omits the habits/timeline/recommendations cards (those are cross-project, not
meaningful scoped to one project).

## Tasks tab

Existing task-row list, now rendering `ReadinessBadge` + collapsed
`BlockerDisclosure` per row (reusing Phase 2 primitives) instead of just a status
Badge. Supports being pre-filtered via the Overview command-row links (`?tab=
tasks&readiness=ready|blocked`, client-side filter only — no new backend query
param needed since the project's task list is already small enough to filter
in-memory, consistent with "avoid N+1 / new endpoints unless a defect requires
it").

## Notes tab

`GET /projects/{id}/notes`, optional `type` filter row (chips using
`NoteTypeBadge` outline style, "All" + 7 types), "New note" opens the existing
`CreateNoteDrawer` pre-filled with this `projectId`. See `pages/notes.md`.

## Milestones tab

Unchanged (already good).

## Activity tab

`GET /projects/{id}/activity` (paginated), see `pages/activity.md`.
