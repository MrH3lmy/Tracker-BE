# Page override — Typed / project notes

*Visual note: this tab wasn't called out in the PR #297 review and needed no structural change -
it automatically inherits the new teal/orange palette, Fira Sans typography, and flat card style
from `../MASTER.md` since every component here reads the same shared `--color-*`/`--app-*`
tokens. `NoteTypeBadge` keeps its existing `lucide-react` icons (see `../REDESIGN-296.md` §2 for
why the icon library wasn't swapped to the tool's Phosphor recommendation).*

## Contract defect found and fixed (minimal, explained per the issue's scope rule)

Before this change, no endpoint ever returned a `NoteBlock`'s real database `id` to the client.
`NoteResponse` had no `blocks` field, there was no `GET /notes/{id}/blocks`, and the frontend's
block editor (`NoteBlockEditor`/`DraftNoteBlock`) is a client-only reconstruction of the note's
flat `body` text with no `id` at all - it never talked to the real `note_blocks` table. Real
`NoteBlock` rows exist only for notes created from a template or restored from a version
snapshot (`NoteTemplateService`/`NoteService.restoreBlocks`). Issue #287 added
`ConvertNoteToTaskRequest.noteBlockId` expecting the client to supply a real block id, but no
contract existed for the client to ever learn one - Phase 6 could not be implemented at all
without fixing this. Fix: added `NoteBlockResponse` and a `blocks: List<NoteBlockResponse>` field
to `NoteResponse` (`NoteService.buildResponse`/`toResponse`/`toResponseBatch`, plus a batch
repository query mirroring the existing attachments pattern). No schema change, no new endpoint,
no behavior change for notes without persisted blocks (`blocks` is simply empty).

## Note type visual treatment

`NoteTypeBadge` — outline-family Badge (matches existing `outline` variant, not a
new color per type, to avoid a 7-color chip wall):

| Type | Icon |
|---|---|
| GENERAL | `StickyNote` (existing) |
| MEETING | `Users` (new curated import) |
| RESEARCH | `Search` (existing) |
| TECHNICAL | `Wrench` (existing) |
| REQUIREMENTS | `ListChecks` (new curated import) |
| DECISION | `Flag` (existing) |
| RETROSPECTIVE | `RefreshCw` (existing) |

Two additions to `components/ui/icons.ts`'s curated re-export (`Users`,
`ListChecks`) — everything else reuses icons already in the app.

## Where it shows

- **Create/Edit** (`CreateNoteDrawer`): a project `Select` (existing `Field`+
  `Select`, options from `useProjectsQuery`, "No project" default) and a note-type
  `Select` (7 options + GENERAL default), placed together above the title field.
- **NoteCard** / list rows: `NoteTypeBadge` shown only when type !== GENERAL
  (avoids badge noise on the common case, per MASTER §4 rule 3) plus the project
  name as a small outline chip when the note belongs to a project (useful in the
  global Notes page; redundant and omitted inside a project's own Notes tab).
- **Global Notes page filters**: add a project filter (`Select`, reuses
  `NotesToolbar` layout) and a type filter row next to the existing content-type
  filter, both wired to `projectId`/`type` query params already accepted by
  `GET /api/v1/notes`.

## Structured action → task conversion

Current: `NotesPage` opens a "convert to task" modal seeded with
`selectedText`/title and calls `convertNoteToTask` → `POST /notes/{id}/
convert-selection-to-task` with no `noteBlockId`. Change:

- When the conversion is triggered **from a structured block** (a `checklist` item
  or an action-item block rendered by `NoteBlockEditor`) rather than a free-text
  selection, pass that block's `id` as `noteBlockId` in the request body.
- Because the backend is idempotent per (note, block), a block that already has a
  task link (`NoteBlockRecord.taskLinks` non-empty, or the create response returns
  the same existing link) renders **"✓ Task created"** (a small `positive` Badge +
  link to the task) instead of an actionable "Convert to task" button — makes the
  already-converted state visually obvious rather than letting the user re-click
  into a no-op.
- Free-text/title-selection conversion (no block context) is untouched — still
  omits `noteBlockId`, still always creates a new task.
- The created task inherits the note's `projectId` (backend already does this via
  the note→task write path per issue text — UI just needs to reflect it: after
  conversion, show the task's project name/badge in the success state /
  confirmation rather than a bare "Task created").
