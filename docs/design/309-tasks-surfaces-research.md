# Issue #309 — Reimagining the remaining Tasks surfaces

> **Provenance / honesty note.** The **UI UX Pro Max skill was NOT installed in this session.**
> Nothing below is skill output, and no tool transcript was produced or fabricated for it. This
> document is **structured design research (UI UX Pro Max skill unavailable in session)**:
> first-principles product/UX reasoning, grounded in (a) the design foundation already committed
> to this repo — `frontend/src/styles/theme.css`, `design-system/tracker-be/MASTER.md`,
> `design-system/tracker-be/pages/tasks-workspace.md`, `design-system/tracker-be/research/interaction-notes.md`
> — and (b) the backend task contract in `src/main/java/com/taskpriority/task/api/`.
> Where the earlier #296/#304 work cited real skill results, those citations are *reused as
> already-established repo conventions*, not re-derived. Any claim below that is judgement is
> labelled as such.
>
> **Design-reference constraint honoured.** `pages/BoardPage.tsx`, `pages/MatrixPage.tsx` and
> `pages/TaskDetailPage.tsx` were deliberately **not** read or used as a reference. The reused
> primitives referenced here (`components/ui/*`, `components/tasks/TaskStateChip.tsx`,
> `components/tasks/BlockerSummary.tsx`, `components/tasks/taskLenses.ts`) come from the *new*
> `/tasks` list workspace shipped in #304, not from the legacy surfaces.

---

## 0. Scope and the constraint that shapes everything

`/tasks` (list) was already reimagined in #304. **#309 covers what is left:** the board, the
matrix, task detail/editing, and the cross-cutting concerns (dependencies, mobile, density,
accessible reorder, quick actions/focus). The single hardest constraint is not visual:

> **Readiness is backend-authoritative.** `task.ready`, `task.blocked` and `task.blockers[]`
> are computed server-side (`TaskResponse.ready`, `.blockers`, see `TaskControllerV1`) from the
> dependency graph. They are **three independent facts**, not two. A task can be
> `blocked=false, ready=false` (e.g. `WAITING`/`BACKLOG` with nothing actionable about it).
> **Never render `ready` as `!blocked`, never compute either from `status`, never
> derive them from `dependencyIds`/`blockingTaskIds` in the client.**
> `frontend/src/components/tasks/taskTypes.ts` already documents this; `taskLenses.ts` already
> exposes the correct three-way `TaskWorkState` (`ready` | `blocked` | `waiting`). Every surface
> in this document consumes that lens and nothing else.

The second axis that must never be collapsed: **workflow status** (`NOT_STARTED`/`IN_PROGRESS`/
`WAITING`/`DONE` — a *human's* declaration) is orthogonal to **readiness** (a *graph* fact).
They render as two visually distinct chip families and are never merged into one "state" pill.

---

## 1. Task execution workspace

**Research framing.** The literature on task managers splits them into two jobs that fight each
other: *management* (survey, triage, plan — many tasks, low commitment each) and *execution*
(do one thing — one task, high commitment). Tools that serve only the first produce "list
gardening": users reorganise instead of working. Tools that serve only the second lose the
ability to decide *what* to do. Tracker-BE currently biases hard toward management: every Tasks
surface is a survey surface, and the only execution affordances (`components/focus/FocusTimerWidget`,
`components/quickCapture/QuickCaptureModal`) live outside the Tasks section entirely.

**Key findings.**

1. **The expensive question is "what next", not "what exists".** The backend already answers it:
   `GET /api/v1/tasks/today` returns a *pre-ordered* list with a server-computed `todayReason`,
   and every task carries `ready`/`blocked`/`priorityScore`. Any client-side "smart sort" would
   duplicate and desynchronise that logic.
2. **Execution needs a commitment boundary.** A workspace that lets you start work without
   narrowing scope reproduces the anxiety of the full list. The pattern that works is a
   *committed set*: a small, explicitly chosen group of tasks (today's ready set), visually
   sealed off from the backlog, with the rest one click away but not on screen.
3. **Mode, not page.** Making execution a separate route splits state and forces re-orientation
   on return. Making it an overlay *mode* over the current view keeps the user's filters, scroll
   position and mental model intact.

**Direction.** Execution is a **focus mode overlay**, not a route: an opt-in surface that takes
over the content area, shows exactly one task at a time from a committed queue, and exposes only
execution verbs (complete, log time, next, defer, note). It reuses `FocusTimerWidget` rather than
inventing a timer. Entry points: the primary action on any ready task everywhere in the Tasks
section, and a "Start focus" button in the workspace header. Blocked tasks cannot enter focus
mode — the affordance is replaced by "See what's blocking this".

---

## 2. Kanban / workflow board

**Research framing.** A kanban board's value is *flow visibility*: where work piles up, what is
stalled, what is in flight. Its costs are equally well documented: (a) columns force a single
grouping dimension; (b) cards carry far less information per pixel than rows; (c) drag is the
only first-class interaction in most implementations, which is an accessibility dead end (§8);
(d) on narrow screens a multi-column board is structurally wrong — horizontal panning to reach
a column is a navigation act disguised as a scroll.

**Key findings.**

1. **The board's differentiator here is not status — it is the readiness overlay.** Tracker-BE
   knows which cards are blocked *and by what*. A column of ten "In progress" cards where four
   are blocked is the single most valuable thing this board can show, and no generic kanban tool
   can show it. Blocked-ness must be legible at card scale (≈240px wide), not on hover.
2. **Columns must be a choice.** The backend supports both `status` and `boardColumnId`
   (`PATCH /tasks/{id}/move` takes both, plus `position`). Grouping should therefore be a
   user-selectable dimension (Status | Board column | Readiness | Priority band), because the
   right grouping depends on the question being asked.
3. **Column headers are instruments.** Count, plus a blocked sub-count, plus a WIP signal, is
   more useful than a title alone — and is a natural, non-drag place to expose column actions.
4. **Cards should be one glance, not a mini task page.** Judgement: title (2-line clamp),
   readiness chip, due badge, and at most two metadata slots — anything more and the board loses
   to the list.

**Direction.** A grouping-selector board with instrumented column headers; cards render the
three-way readiness chip and, when `blocked`, an inline "Blocked by *first blocker*" line that
is a link (mirroring `BlockerSummary`'s "first blocker always visible" rule). Every drag has a
keyboard/menu equivalent (§8). Below 768px the board becomes a **column switcher**, not a
horizontally-panned canvas: a segmented control selects one column, which renders full-width as
a list.

---

## 3. Prioritization / matrix UX

**Research framing.** Eisenhower-style matrices are widely taught and poorly implemented. Their
failure modes: (a) the quadrants are *derived* from data the user already entered (importance,
due date), so a matrix that asks the user to place tasks manually is asking them to enter the
same information twice; (b) quadrants have no room, so they degrade into scroll-boxes and the
2×2 shape stops carrying meaning; (c) a 2×2 has no honest mobile form.

**Key findings.**

1. **The matrix is a lens, not a store.** Tracker-BE derives quadrants from `important` +
   `dueDate`/`overdue` and exposes `priorityScore`/`priorityCategory` from `PriorityEngine`.
   The matrix's job is to *explain* those derivations and let the user correct the inputs
   (`important`, `dueDate` — the latter has a dedicated `PATCH /tasks/{id}/due-date`), not to
   maintain its own placement state.
2. **Quadrants must be countable before they are readable.** Judgement: the primary read is
   "how is my work distributed" (four counts + proportions), the secondary read is "which tasks".
   Design for the count first, then the list inside it.
3. **Readiness reframes the matrix.** "Urgent + Important + blocked" is the highest-value cell in
   the whole product — it is the escalation list. It deserves explicit treatment, not a chip.
4. **A 2×2 does not survive 375px.** Judgement, but near-universal: shrinking a 2×2 to one column
   wide produces four stacked lists whose spatial meaning is gone. Better to *replace* the shape
   with an ordered set of labelled sections that preserves the priority ranking.

**Direction.** The matrix is a **read-and-correct lens**: quadrants are computed and labelled with
their rule ("Important, due within 7 days"), each quadrant header is an instrument (count, blocked
sub-count, share of total), and moving a task between quadrants is done by *editing the inputs*
via inline quick actions ("Mark important", "Set due date"), never by dragging into a box whose
membership the client cannot own. Below 1024px the 2×2 collapses to four ordered accordion
sections (Do first → Schedule → Delegate/Defer → Drop), highest-priority expanded by default.

---

## 4. Task detail and editing

**Research framing.** Three canonical shapes: **full page** (deep-linkable, roomy, but loses
context and makes every edit a navigation), **modal** (focused, but blocks the app and nests
badly), **side pane / peek** (keeps the list visible, supports rapid triage across many tasks,
but is cramped at small widths). Empirically, triage-heavy tools converge on the pane, and the
deciding factor is not aesthetics but *task switching cost*: reviewing 20 tasks via 20 page
navigations is the dominant cost in the whole product.

**Key findings.**

1. **Both shapes are needed, and they should share one component.** `/tasks/:id` must keep working
   (deep links, notes, external references). But in-workspace triage must not navigate away.
   The answer is one `TaskDetail` component rendered into two containers.
2. **Editing should be field-local, not form-modal.** The backend already offers granular verbs:
   `PATCH /{id}/status`, `/complete`, `/due-date`, `/parent`, `/project`, `/move`, plus
   `POST|DELETE /{id}/dependencies`. Full-record `PUT` should be the exception (long text), not
   the default path for "change the due date".
3. **Progressive disclosure by frequency, not by category.** Judgement: always-visible =
   title, status, readiness+blockers, due, effort, project; one interaction away = description,
   subtasks, dependencies, notes/attachments, recurrence; two away = risk, audit/meta.
4. **Dependencies belong in detail, not in a modal-inside-a-modal.** Adding a dependency is the
   act that changes readiness; it must be visible in the same frame as the readiness chip so the
   causal link is obvious.

**Direction.** **One detail component, two presentations.** In-workspace: a right-hand *detail
pane* (≥1024px) that opens on row/card activation, is resizable-optional, and updates the URL to
`/tasks/:id` state via a `?peek=` param or route-with-background so links stay shareable. Below
1024px the same component renders as a full-screen `Drawer`. `/tasks/:id` continues to render it
as a standalone page. Editing is inline per field with optimistic write + rollback, using the
granular PATCH endpoints; the description uses an explicit edit/save affordance.

---

## 5. Dependencies, blockers and readiness communication

This is the product's differentiator and deserves the most rigour.

**Key findings.**

1. **Three states, never two.** `ready` / `blocked` / `waiting` (neither). This is already
   encoded in `taskLenses.ts` (`TaskWorkState`) and `TaskStateChip.tsx`. Every new surface must
   consume it. The historical bug (#297) was exactly this collapse, and it recurred on `/tasks`
   before #304 — treat it as the primary regression risk of #309.
2. **Colour alone is disqualifying.** Established repo rule (from the #296 research, "Color
   Only", High severity): every readiness indicator pairs colour with an **icon and a word**.
   `TaskStateChip` already does this (`CheckCircle2`/`AlertTriangle`/`Clock` + label).
3. **"Blocked" is useless without "by what".** Established repo rule via `BlockerSummary`: the
   first blocker is always visible as a link; the remainder sit behind an operable `+n more`
   button — never hover-only, never clipped.
4. **Blocked is not an error.** It is a normal, informational state. Use the caution family
   (`--app-caution`), never the critical/destructive family, and never `role="alert"`.
5. **Announce state changes atomically, and sparingly.** Established repo rule: a badge count is
   not a live region. Announce *transitions the user caused* ("Task X is now ready — 0 blockers
   remaining") through the existing `announcementContext`, and do not turn every count into a
   competing `aria-live` region.
6. **Readiness needs an aggregate, not just per-row chips.** Judgement: "4 of 12 blocked" at the
   top of a column/quadrant/list is what turns per-task facts into a decision.

**Screen-reader contract (normative for #309).**

- Chip: visible text is the state word; the accessible name is the full sentence, e.g.
  `Blocked — 3 unfinished prerequisites`. Icons are `aria-hidden`.
- Row/card accessible name composes: `{title}, {status}, {readiness}{, blocked by N}{, due …}` —
  one coherent phrase, not eight adjacent labels.
- Blocker list is a real `<ul>` of links to the blocking tasks, labelled
  `Blocking tasks for {title}`; the `+n more` control is a real `<button>` with `aria-expanded`
  and `aria-controls`.
- The `+n more` / disclosure state is never the only route to the information: the detail
  pane/page always lists all blockers expanded.
- Aggregate counts use `role="status"` only when they are the *result of a user action*, and are
  `aria-atomic="true"` so they read as one sentence.

---

## 6. Mobile task management (≤ 767px)

**Key findings.**

1. **Horizontal scroll for primary content is a failure, not a fallback.** The pre-#304 `/tasks`
   table demonstrated the exact failure mode (`min-w-4xl` + `overflow-x-auto` pushed the actions
   column off-screen). Wide layouts must be *replaced* on mobile, not shrunk.
2. **Hover-only affordances do not exist on touch.** Established repo finding. Every action must
   be reachable via a persistent control or an explicit overflow menu.
3. **Touch targets ≥ 44×44px**, and destructive/irreversible actions must not sit adjacent to
   the primary tap target.
4. **Mobile use is execution-shaped, not management-shaped.** Judgement supported by the data
   model: on a phone people complete, defer, and capture; they do not re-plan a dependency graph.
   Optimise for `complete`, `status`, `due-date`, quick capture, and reading blockers.
5. **Drag on touch conflicts with scroll.** Long-press-to-drag is fragile and undiscoverable;
   an explicit "Move…" action is more reliable and is the same code path keyboard users need.

**Direction.** Single-column everywhere; board → column switcher; matrix → ordered accordions;
detail → full-screen drawer; primary action (complete / start focus) as a persistent trailing
control on each row; everything else behind a per-row overflow `Menu`; reorder and move via
explicit menu commands, not drag.

---

## 7. Dense desktop task workspace (≥ 1280px)

**Key findings.**

1. **The repo's density dial is already set: 8/10, "Dense / Dashboard"**, with a 2/4/8/12/16px
   spacing scale (`MASTER.md`). Comfortable, airy card grids contradict a committed foundation.
2. **Density is not "smaller everything".** It is: tighter vertical rhythm, fewer per-row
   containers (borders/rails instead of nested cards), numeric alignment, and *conditional*
   metadata — a column that is `—` for 80% of rows costs more than it returns.
3. **Numbers get a distinct treatment.** Established repo convention: `font-mono` +
   `tabular-nums` for counts, dates, percentages, so columns align and scan.
4. **Above ~1440px, more columns beat wider columns.** Judgement: line length past ~90ch hurts
   scanning; the extra width should buy the detail pane, not longer titles.

**Direction.** Three-zone shell at ≥1280px: filter/lens rail (left, collapsible), primary view
(centre, `max-w` unconstrained up to ~1400px per the page overrides), detail pane (right, opens
on demand). A **density toggle (Compact | Comfortable)** persisted per user, defaulting to
Compact on ≥1440px and Comfortable below — one control, applied via a data attribute at the
workspace root so it costs no per-component branching.

---

## 8. Accessible drag / reorder (WCAG 2.2 AA)

**Normative requirements.**

| Requirement | WCAG | Consequence |
|---|---|---|
| **2.5.7 Dragging Movements (AA, 2.2)** | Any drag action must have a **single-pointer alternative** that is not a drag | A "Move to…" menu command is **mandatory**, not a nicety |
| **2.1.1 Keyboard** | Full keyboard operation of reorder/move | Grab/move/drop keyboard protocol required |
| **2.4.7 / 2.4.11 Focus** | Focus must remain visible and not obscured | Focus follows the moved item to its new position |
| **4.1.3 Status Messages** | Programmatic announcement of the outcome | Polite live-region announcements on grab, move, drop, cancel |
| **2.3.3 Animation from Interactions (AAA, adopt anyway)** | Motion is non-essential | Honour `prefers-reduced-motion` |
| **2.5.5 / 2.5.8 Target Size** | ≥24px minimum, 44px recommended | Drag handle is an explicit, sized control |

**Direction (the reorder contract for #309).**

- **Explicit handle.** Reorder is initiated from a dedicated handle (`≥24px`, `44px` touch),
  which is a real `<button>` — not the whole row. Whole-row drag hijacks text selection and
  makes every click a potential drag.
- **Keyboard protocol.** Handle focused → `Space`/`Enter` grabs (`aria-pressed=true`,
  announce "Grabbed *Title*. Position 3 of 12. Use arrow keys to move, Space to drop, Escape to
  cancel."). Arrow Up/Down move within a list; Arrow Left/Right move across columns on the board.
  `Space`/`Enter` drops and commits (`PATCH /tasks/{id}/move`). `Escape` cancels and restores.
- **Menu equivalent (the 2.5.7 alternative).** Every reorderable item's overflow menu contains
  "Move to column…", "Move to top / up / down / bottom" — same mutation, no pointer gesture.
- **Announcements.** Grab / each move / drop / cancel / failure, via `announcementContext`
  (`aria-live="polite"`, `aria-atomic`), phrased as complete sentences including the new position
  and container. Failures announce and restore the pre-drag order.
- **Reduced motion.** Under `prefers-reduced-motion: reduce`, drop animations, card lift/tilt,
  and list reflow transitions are removed; the item simply appears in place. Only opacity/instant
  position changes remain. This extends the existing `prefers-reduced-motion` handling in
  `frontend/src/styles/theme.css`.
- **Optimistic + rollback**, matching the existing task-reorder mutation pattern in
  `hooks/useApiQueries.ts` (`onMutate` snapshot / `onError` rollback).
- **Blocked tasks are still reorderable.** Readiness must not remove an ordering affordance —
  it is a planning act, not an execution act.

---

## 9. Quick actions and focus sessions

**Key findings.**

1. **Action hierarchy must be ruthless.** Judgement: exactly one primary action per row/card,
   at most two secondary inline, everything else in an overflow `Menu`. The primary action is
   *state-dependent*: `Complete` for ready/in-progress work, `View blockers` for blocked work,
   `Start` for not-started ready work.
2. **The backend already exposes cheap, granular verbs** (`/complete`, `/status`, `/due-date`,
   `/move`, `/project`, `/parent`) — quick actions should map 1:1 onto them and avoid full `PUT`.
3. **Recurring completion is not deletion.** `PATCH /{id}/complete` on a recurring task resets the
   *same row* to `NOT_STARTED` with a new `dueDate` (see `API_DOCS.md`). The UI must communicate
   "completed — next due *date*" rather than removing the row, or the interaction reads as a bug.
4. **A command palette is the honest home for low-frequency actions** in a dense workspace, and
   is keyboard-native by construction. Judgement: worth it here because the section now has three
   views × several grouping/density/lens options.
5. **Focus sessions need a committed queue and a visible exit.** An always-running timer with no
   scope is ignorable; a timer bound to *this task* with an explicit "done / next / stop" is not.
   `components/focus/FocusTimerWidget` already exists and should be composed, not replaced.

---

# RECOMMENDED DESIGN DIRECTION

*Actionable spec. An implementer can start from this section alone.*

## A. Information architecture

One **Tasks workspace shell** wrapping three interchangeable *views* over one task dataset, plus
one detail surface with two presentations.

```
Tasks workspace shell  (owns: filters/lenses, density, saved views, selection, detail pane)
├── View: List    (/tasks)          — shipped in #304, unchanged; gains the shared detail pane
├── View: Board   (/tasks/board)    — grouping-selectable kanban
├── View: Matrix  (/tasks/matrix)   — computed 2×2 read-and-correct lens
├── View: Projects(/tasks/projects) — unchanged
└── Detail: <TaskDetail taskId>     — rendered as pane | drawer | page (one component)
```

Filters, search, saved views, density and lens state live in the **shell**, are encoded in the
URL query string, and **persist across view switches** — switching List → Board must not reset
the user's filters. Views never own their own filter UI.

## B. Route / navigation model

| Route | Behaviour |
|---|---|
| `/tasks` | List view (default). **Unchanged.** |
| `/tasks/board` | Board view. **Must keep working** — same path, new implementation. |
| `/tasks/matrix` | Matrix view. **Must keep working** — same path, new implementation. |
| `/tasks/projects` | Unchanged. |
| `/tasks/:id` | Standalone detail page. **Must keep working.** Renders `<TaskDetail>` in page presentation. |
| `/tasks?view=…&q=…&status=…&group=…&density=…` | Shell state, shareable. |

- View switching stays on `SectionTabs` / `TASK_VIEW_TABS` (`router/routes.tsx`) — do not
  restructure the tab contract.
- Opening detail **inside** a view does not navigate: it sets `?peek={id}` on the current route
  (List/Board/Matrix), so back closes the pane rather than leaving the view. Redirects are
  permitted but not needed: `/tasks/:id` remains a first-class page.
- A "Open full page" affordance in the pane navigates to `/tasks/:id`; deep-linking `/tasks/:id`
  from anywhere continues to land on the page.
- Focus mode is a shell-level overlay reached via `?focus={id}` — dismissible with `Escape`,
  restoring the underlying view untouched.

## C. Density strategy

- Foundation: `MASTER.md` density 8/10, spacing scale `2 / 4 / 8 / 12 / 16 / 24 / 32px`;
  workspace `max-width: 1400px` or full-width (`pages/tasks-workspace.md`).
- **One `Compact | Comfortable` toggle** in the shell header, persisted to `localStorage`,
  applied as `data-density` on the workspace root; components read it via CSS only.
  Default: Compact ≥1440px, Comfortable below.
- Compact: 32px list rows, 2px/4px inner gaps, borders and left rails instead of nested cards,
  metadata as conditional inline chips (never `—` placeholders).
- All numerics (`counts`, dates, `priorityScore`, percentages) use `font-mono tabular-nums`.
- Titles clamp at 2 lines on cards, 1 line in compact rows, with the full value available to
  keyboard/touch (never hover-only).

## D. How detail is surfaced

**Progressive, three-tier, one component.**

1. **Tier 0 — in the row/card:** title, workflow status chip, readiness chip, first blocker link
   (when blocked), due badge, primary action. No hover-only content.
2. **Tier 1 — detail pane / drawer:** right-hand pane ≥1024px (360–480px, resizable optional);
   full-screen `Drawer` below 1024px. Sections: header (title, status, readiness + full blocker
   list, primary action) → key fields (due, effort, project, area — inline-editable) →
   collapsible Description / Subtasks / Dependencies / Notes / Recurrence → collapsed Meta.
3. **Tier 2 — `/tasks/:id` page:** same component, wider two-column composition, for deep links
   and long-form work.

Editing is **inline and field-local**, mapped to the granular endpoints
(`/status`, `/due-date`, `/project`, `/parent`, `/complete`, `/dependencies`), optimistic with
rollback; full `PUT` only for title/description saves. Every mutation announces its result.

## E. Action hierarchy

| Tier | Where | Contents |
|---|---|---|
| Primary (1, state-dependent) | Row/card trailing slot; pane header | `blocked` → **View blockers**; `ready` + not started → **Start focus**; in progress → **Complete**; `waiting` → **Set status** |
| Secondary (≤2) | Row/card, compact icon buttons with labels | Open detail; Due date |
| Overflow | Per-item `Menu` | Move to column/top/up/down/bottom, Change status, Set project/parent, Add dependency, Duplicate, Delete |
| Bulk | Shell action bar on selection | Status, due date, project, complete, delete |
| Global | Shell header + `Cmd/Ctrl-K` command palette | New task, Quick capture, Start focus, switch view, density, saved views |

Destructive actions are never adjacent to the primary action and always confirm.
Recurring completion reports **"Completed — next due {date}"** and keeps the row.

## F. Responsive behaviour

| Width | Shell | Board | Matrix | Detail |
|---|---|---|---|---|
| **375** | Single column; filters in a `Drawer`; sticky compact header; bottom-anchored primary CTA | Segmented **column switcher**, one column as a full-width list; move via menu only | Four ordered accordion sections (Do first / Schedule / Delegate / Drop), first expanded | Full-screen `Drawer` |
| **768** | Single column + collapsible filter drawer; 2-up metadata | 2 columns visible, horizontal scroll within the board region only (never the page), snap per column | 2×1 stacked pairs, or accordions if content is tall | Full-screen `Drawer` |
| **1024** | Filter rail (collapsible) + content | 3 columns; cards ~260px | True 2×2 | **Detail pane appears** (360px), content reflows |
| **1440** | Rail + content + pane, all persistent; Compact density default | 4+ columns, no page-level horizontal scroll | 2×2 with per-quadrant instrument headers | Pane 420–480px |

Rule: **the page body never scrolls horizontally**; only the board's own column region may,
inside `overflow-x: auto`.

## G. Readiness and blockers — visual + screen-reader contract

**Visual.**

- Reuse `TaskStateChip` verbatim: three states from `taskLenses.ts`, each **icon + word + colour**.
  `ready` → positive (`--app-positive`, `CheckCircle2`); `blocked` → **caution**
  (`--app-caution`, `AlertTriangle`) — *not* critical; `waiting` → neutral (`Clock`).
- Workflow status keeps its **separate** badge family (`taskStyleUtils`). The two chips are never
  merged, never share a variant, and always appear in a fixed order (status, then readiness).
- Blocked items also carry a **2px left rail** in the caution colour on rows and cards, so the
  state survives at card scale and in peripheral vision.
- Blocker disclosure follows `BlockerSummary`: first blocker always visible as a link, remainder
  behind an operable `+n more` button. In the detail pane/page, all blockers are listed expanded.
- Aggregates: every column header, quadrant header and list header shows
  `{total} · {n} blocked` in `font-mono tabular-nums`. Zero-blocked shows no blocked segment.
- Focus mode and the "Start focus" action are **disabled for blocked tasks**, replaced by
  "See what's blocking this" — the only place readiness gates an action.

**Screen readers.**

- Chip accessible name is a sentence: `Ready to work` / `Blocked — 3 unfinished prerequisites` /
  `Waiting — not yet actionable`. Icons `aria-hidden="true"`.
- Item accessible name: `{title}. {status}. {readiness}. {blocked by N, if any}. Due {date}.`
- Blockers render as `<ul>` of links, labelled `Blocking tasks for {title}`; the `+n` control is a
  `<button aria-expanded aria-controls>`.
- Column/quadrant headings are sequential real headings (`h2`/`h3`), never styled `<div>`s.
- Counts are **not** live regions. Only user-caused transitions announce, once, politely and
  atomically: `Task "{title}" is now ready. 0 blockers remaining.` /
  `Moved "{title}" to In progress, position 2 of 7.`
- Blocked is informational: never `role="alert"`, never the destructive colour family.

**Non-negotiable.** `ready`, `blocked` and `blockers[]` are read from the API response only.
No surface in #309 may compute, infer, default, or fall back to a client-side derivation of any
of them — including `ready = !blocked`, `blocked = dependencyIds.length > 0`, or anything derived
from `status`. If the field is absent, render the `waiting` (neutral) state, not a guess.
