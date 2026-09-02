# Page override — Project Activity Timeline

*Visual note: this tab wasn't called out in the PR #297 review and needed no structural change -
it automatically inherits the new teal/orange palette, Fira Sans/Fira Code typography, and flat
card style from `../MASTER.md`. The `font-mono` numeral treatment introduced elsewhere (Today,
Project Overview) was not applied to relative timestamps here since they're prose ("12 minutes
ago"), not tabular data.*

Source: `GET /api/v1/projects/{id}/activity?page&size` — newest first, paginated
via `X-Total-Count`/`X-Has-Next` headers (same contract as the tasks list).

## Row anatomy (`ActivityTimelineItem`)

```
[icon]  <bold summary>
        <relative time>  ⌄ Details
```

- Icon keyed by `eventType`: PROJECT_CREATED/PROJECT_UPDATED → `FolderKanban`;
  TASK_CREATED → `Plus`; TASK_UPDATED → `Pencil`; TASK_COMPLETED → `CheckCircle2`
  (positive tone circle); NOTE_CREATED/NOTE_UPDATED → `StickyNote`;
  NOTE_TASK_CREATED → `ArrowRight` (represents the note→task conversion).
  All existing icons — no additions needed here.
- `summary` is the backend's own human-readable string (never re-derived from
  `metadata` client-side).
- Relative time via `Intl.RelativeTimeFormat` (e.g. "12 minutes ago", "Yesterday"
  for >20h, absolute `formatDate` beyond 6 days) with the exact timestamp in a
  `title` attribute for hover/assistive tech.
- `entityType`/`entityId` become a link when TASK (`/tasks/{entityId}`) — NOTE
  entities are not independently routable in this app yet (no `/notes/:id` deep
  link), so a NOTE row instead exposes an inline "Open in Notes" action that
  applies the note as a filter on the Notes tab/page; PROJECT rows don't self-link.
- `metadata` (a `Record<string,object>`) is never rendered as raw JSON. It's shown
  behind a small "Details" `Collapsible` as a plain key/value list with
  human-readable keys (title-cased, `_`→space) — good enough given metadata shape
  isn't contractually fixed, while still meeting "no raw JSON as primary UI."

## List behavior

Grouped by calendar day with a sticky-ish day label (`Today`, `Yesterday`, then
`formatDate`) above each cluster — this is what makes it scannable per the
"activity timeline scanning" research note, versus a flat undifferentiated list.
"Load more" button appends the next page (`X-Has-Next`) rather than numbered
pagination — matches a timeline's append-only mental model.

## Async states

`QueryState` for loading/error (with retry) on first page; `EmptyState`
("Nothing here yet — activity shows up as you create tasks, complete them, and add
notes to this project") on an empty first page; a lower-key inline "No more
activity" (not a full `EmptyState`) when a *subsequent* page comes back empty/
`X-Has-Next=false`.
