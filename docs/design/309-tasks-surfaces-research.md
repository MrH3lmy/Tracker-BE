# Issue #309 — Reimagining the remaining Tasks surfaces

## Provenance (read first)

**This is structured design research — the UI UX Pro Max skill was unavailable in this session.**

The skill is real and runnable (it is a git repo whose `scripts/search.py` queries bundled
datasets, as used in #318). **I attempted to clone
`https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` into my scratchpad and the clone was
blocked by the sandbox classifier.** No search was run in this session, and **no skill output is
reproduced or invented anywhere below.** Every claim here is one of:

- **[FOUNDATION]** — quoted from the committed skill-derived foundation of #308/#318,
  `design-system/tracker-v2/` on branch `origin/claude/tracker-ui-revamp-foundation-d5mqmq`
  (`MASTER.md`, `research/00-method.md`, `research/08-ux-navigation.md`,
  `research/14-ux-states.md`). These are real skill results, obtained in that session.
- **[CONTRACT]** — read from this repo's backend/frontend source
  (`src/main/java/com/taskpriority/task/api/`, `frontend/src/components/tasks/taskTypes.ts`).
- **[WCAG]** — normative success criteria, cited by number.
- **[JUDGEMENT]** — my own first-principles product/UX reasoning, labelled as such.

**Design system:** this document does **not** derive a visual system. It expresses IA,
interaction, density and responsive direction **in the terms of "Neutral Workbench"**
(`design-system/tracker-v2/MASTER.md`), which supersedes the legacy "Cockpit" system in
`design-system/tracker-be/`. Where the older Cockpit conventions conflict (teal chrome, Fira
Sans/Fira Code, `font-mono` numerics), **Neutral Workbench wins**.

**Legacy-reference constraint honoured.** `pages/BoardPage.tsx`, `pages/MatrixPage.tsx` and
`pages/TaskDetailPage.tsx` were **not read** and are not used as a reference. Reusable primitives
cited below (`components/ui/*`, `components/tasks/TaskStateChip.tsx`, `BlockerSummary.tsx`,
`taskLenses.ts`) come from the *new* `/tasks` list workspace (#304), and their **structure and
semantics** are reused while their **colour and type treatment re-derive from Neutral Workbench**.

---

## 0. The two constraints that shape every decision

### 0.1 Readiness is backend-authoritative [CONTRACT]

`task.ready`, `task.blocked` and `task.blockers[]` are computed server-side
(`TaskResponse.ready`, `.blockers`; `TaskControllerV1`) from the dependency graph. They are
**three independent facts, not two**: a task can be `blocked=false, ready=false` (a `WAITING`
or `BACKLOG` item that is simply not actionable).

> **Never** render `ready` as `!blocked`. **Never** derive either from `status`,
> `dependencyIds` or `blockingTaskIds`. If a field is absent, render the neutral
> *waiting* state — never a guess.

`frontend/src/components/tasks/taskTypes.ts` documents this, and `taskLenses.ts` already exposes
the correct three-way `TaskWorkState` (`ready` | `blocked` | `waiting`). Every #309 surface
consumes that lens and nothing else. This exact collapse was the #297 bug and recurred on
`/tasks` before #304 — **treat it as the primary regression risk of #309.**

Second non-collapsible axis: **workflow status** (`NOT_STARTED`/`IN_PROGRESS`/`WAITING`/`DONE`
— a human's declaration) is orthogonal to **readiness** (a graph fact). Two visually distinct
chip families, fixed order, never merged.

### 0.2 The colour budget is unspent, and #309 is what spends it [FOUNDATION]

Neutral Workbench principle **P1**: *"Chrome is neutral. Colour means state or action, never
decoration."* #308 deliberately left the state colours unspent so the feature phases could
claim them. Tasks is the surface with the richest state vocabulary in the product, so #309
defines the canonical state-colour mapping the rest of the app inherits:

| State | Token family | Second channel (P5: never colour alone) |
|---|---|---|
| **Overdue** | `critical` / `critical-soft` | `AlertCircle` icon + relative date text ("3d overdue"), weight 600 |
| **Blocked** (graph fact) | `caution` / `caution-soft` | `AlertTriangle` icon + word "Blocked" + 2px left rail + blocker link |
| **At risk** (`riskLevel` HIGH/CRITICAL) | `caution` outline (border, not fill) | `TriangleAlert` icon + risk label; outline vs. fill distinguishes it from Blocked |
| **Ready** (graph fact) | `positive` / `positive-soft` | `CheckCircle2` icon + word "Ready" |
| **Waiting** (neither ready nor blocked) | `neutral` / `neutral-soft` | `Clock` icon + word "Waiting" |
| **Priority band** (`priorityCategory`) | **no hue** — weight + position + a `line-strong` rail | Rank number, `[data-numeric]` score, ordering |
| **Active / selected** | `brand` | Accent rail + background + weight change (per `nav-state-active`) |

**Deliberate scarcity [JUDGEMENT]:** priority does *not* get a hue. If four states and four
priority bands all carry colour, the board becomes a heat map with no figure/ground and P1 is
violated in spirit. Priority is ordering; ordering is expressed by position and weight
(MASTER §3 ranks position → weight → size → contrast → colour, in that order).

---

## 1. Task execution workspace

**Framing [JUDGEMENT].** Task tools serve two jobs that fight each other: *management* (survey,
triage, plan — many tasks, low commitment) and *execution* (do one thing — high commitment).
Serving only management produces "list gardening": users reorganise instead of working.
Tracker-BE is currently management-only in the Tasks section; the execution affordances
(`components/focus/FocusTimerWidget`, `components/quickCapture/QuickCaptureModal`) live outside it.

**Findings.**

1. **The expensive question is "what next", not "what exists" [CONTRACT].** The backend already
   answers it: `GET /api/v1/tasks/today` returns a *pre-ordered* list with a server-computed
   `todayReason`, and every task carries `ready`/`blocked`/`priorityScore`. Any client-side
   "smart sort" duplicates and desynchronises that logic.
2. **Execution needs a commitment boundary [JUDGEMENT].** A committed set — small, explicit,
   sealed off from the backlog — is what makes execution feel finite.
3. **Mode, not route [JUDGEMENT].** A separate route splits state and forces re-orientation on
   return. An overlay mode preserves filters, scroll and mental model.
4. **Motion budget applies [FOUNDATION].** Motion tier is Subtle (2/10), *at most 1–2 animated
   elements per view*. Focus mode gets **one** meaningful transition (panel entrance,
   `--duration-slow` 220ms, `--ease-standard`) and nothing else.

**Direction.** Execution is a **focus mode overlay** at `--z-overlay: 50`, entered from any ready
task and from the shell header, showing one task at a time from a committed queue with only
execution verbs (complete, log time, next, defer, note). It composes `FocusTimerWidget` rather
than replacing it. Blocked tasks cannot enter focus mode: the affordance becomes
"See what's blocking this". Escape exits, restoring the underlying view untouched
(`modal-escape` [FOUNDATION]).

---

## 2. Kanban / workflow board

**Framing [JUDGEMENT].** A board's value is *flow visibility*: where work piles up, what is
stalled. Its structural costs: one grouping dimension only; low information density per pixel;
drag as the only first-class interaction (an accessibility dead end, §8); and no honest narrow
form — panning horizontally to reach a column is navigation disguised as scrolling.

**Findings.**

1. **The board's differentiator here is the readiness overlay [CONTRACT + JUDGEMENT].** Tracker
   knows which cards are blocked *and by what*. "Four of the ten cards in In-Progress are
   blocked" is the most valuable thing this board can show and no generic kanban tool can show
   it. It must be legible at card scale (~240–280px), not on hover.
2. **Columns must be a choice [CONTRACT].** `PATCH /tasks/{id}/move` accepts `status`,
   `boardColumnId` *and* `position`, so grouping should be user-selectable:
   Status | Board column | Readiness | Due window.
3. **Column headers are instruments [JUDGEMENT].** Count + blocked sub-count + WIP signal, all
   `[data-numeric]` tabular ([FOUNDATION] §4 — *not* `font-mono`; the second family was
   deliberately dropped).
4. **Cards are one glance [JUDGEMENT].** Title (2-line clamp), readiness chip, due badge, and at
   most two metadata slots. More than that and the board loses to the list.
5. **Flat means the border is the affordance [FOUNDATION].** Inline card = 1px `line` border, no
   shadow. A card that is **draggable** is operable, so its border is `line-control` (≥3:1) — and
   only the item *being dragged* gets `shadow-lg`, because it genuinely floats (MASTER §6).

**Direction.** Grouping-selector board; instrumented column headers as real `<h2>`/`<h3>`
elements (never styled `<div>`s); cards render the three-way readiness chip plus, when blocked,
an inline "Blocked by *first blocker*" **link** (mirroring `BlockerSummary`'s "first blocker
always visible, remainder behind an operable `+n more`" rule). Every drag has a keyboard and
menu equivalent (§8). Below 768px the board becomes a **column switcher** — a segmented control
picks one column, rendered full-width as a list — not a panned canvas. The board region is the
only thing that ever scrolls horizontally; the page never does (`horizontal-scroll` [FOUNDATION]).

---

## 3. Prioritization / matrix UX

**Framing [JUDGEMENT].** Eisenhower matrices fail in three predictable ways: (a) quadrants are
*derived* from data the user already entered, so manual placement asks for the same information
twice; (b) quadrants have no room and degrade into scroll-boxes, at which point the 2×2 shape
carries no meaning; (c) a 2×2 has no honest 375px form.

**Findings.**

1. **The matrix is a lens, not a store [CONTRACT].** Quadrants derive from `important` +
   `dueDate`/`overdue`, and `PriorityEngine` supplies `priorityScore`/`priorityCategory`. The
   matrix's job is to *explain* the derivation and let the user correct the **inputs**
   (`important`, and `dueDate` via the dedicated `PATCH /tasks/{id}/due-date`) — never to own
   its own placement state.
2. **Countable before readable [JUDGEMENT].** Primary read: distribution (four counts +
   proportions). Secondary: which tasks.
3. **Readiness reframes the matrix [JUDGEMENT].** "Urgent + Important + **blocked**" is the
   highest-value cell in the product — it is the escalation list, and deserves explicit
   treatment rather than a chip.
4. **A 2×2 does not survive 375px [JUDGEMENT].** Stacking four quadrants into one column
   destroys the spatial meaning; better to *replace* the shape with an ordered, labelled set
   that preserves the ranking.

**Direction.** A **read-and-correct lens**. Quadrants are computed and each header states its
rule ("Important · due within 7 days") plus its instruments (count, blocked sub-count, share).
Moving a task between quadrants is done by **editing the inputs** through inline quick actions
("Mark important", "Set due date"), never by dragging into a box whose membership the client
cannot own. Quadrant fills stay `canvas`/`inset` — neutral; the only colour inside a quadrant is
state colour on the items (P1). Below 1024px the 2×2 collapses to four ordered accordion
sections (Do first → Schedule → Delegate/Defer → Drop), first expanded.

---

## 4. Task detail and editing

**Framing [JUDGEMENT].** Three canonical shapes: **page** (deep-linkable, roomy; loses context,
makes every edit a navigation), **modal** (focused; blocks the app, nests badly), **side pane**
(keeps the list visible, supports rapid triage; cramped when narrow). The deciding factor is
task-switching cost: reviewing 20 tasks via 20 page navigations is the dominant cost in the
whole product.

**Findings.**

1. **Both shapes are needed, and must share one component [JUDGEMENT].** `/tasks/:id` must keep
   working; in-workspace triage must not navigate away.
2. **Editing should be field-local [CONTRACT].** The backend already offers granular verbs:
   `PATCH /{id}/status`, `/complete`, `/due-date`, `/parent`, `/project`, `/move`, plus
   `POST|DELETE /{id}/dependencies`. Full-record `PUT` is the exception (long text), not the
   default path for "change the due date".
3. **Records are the *comfortable* density tier [FOUNDATION].** MASTER §2 explicitly separates
   Lists (dense, 8–12px rows) from Records (comfortable, reading measure applies). Detail is a
   Record: 60–75ch measure on description, `overflow-wrap: anywhere` on prose.
4. **Progressive disclosure by frequency, not category [JUDGEMENT].** Always visible: title,
   status, readiness + blockers, due, effort, project. One interaction away: description,
   subtasks, dependencies, notes/attachments, recurrence. Two away: risk, audit/meta.
5. **Dependencies belong in detail [JUDGEMENT].** Adding a dependency is the act that changes
   readiness; it must sit in the same frame as the readiness chip so the causality is visible.
6. **Every field needs a real `<label>` [FOUNDATION].** No placeholder-as-label; errors sit next
   to their field; invalid = `aria-invalid` + border change + text (three channels).

**Direction.** **One `TaskDetail` component, three presentations** — pane (≥1024px), full-screen
drawer (<1024px), page (`/tasks/:id`). Editing is inline per field against the granular
endpoints, optimistic with rollback (matching the existing reorder mutation pattern in
`hooks/useApiQueries.ts`); description uses an explicit edit/save. Every mutation announces its
result. All three presentations define **empty, loading and error** states, with loading
reserving the content's space (`cls-prevention` [FOUNDATION]).

---

## 5. Dependencies, blockers and readiness communication

**Findings.**

1. **Three states, never two** [CONTRACT] — see §0.1. `taskLenses.ts` / `TaskStateChip` already
   encode it; consume them.
2. **Colour alone is disqualifying** [FOUNDATION P5 / `color-not-only`]. Every readiness
   indicator pairs colour with an **icon and a word**. `TaskStateChip` already does this
   (`CheckCircle2` / `AlertTriangle` / `Clock` + label) — keep the structure, re-token the colour.
3. **"Blocked" is useless without "by what"** — established repo pattern (`BlockerSummary`): the
   first blocker is always a visible link; the rest sit behind an operable `+n more` button.
   Never hover-only, never clipped.
4. **Blocked is not an error [JUDGEMENT].** It is normal and informational: `caution`, never
   `critical`, never `role="alert"`. `critical` is reserved for **overdue** (§0.2), which is a
   deadline failure.
5. **Announce transitions, not counts [JUDGEMENT + FOUNDATION].** MASTER §12: live regions are
   **named** when more than one can be present. A badge count is not a live region. Announce
   user-caused transitions once, politely, atomically.
6. **Readiness needs an aggregate [JUDGEMENT].** "4 of 12 blocked" at the head of a column,
   quadrant or list is what turns per-task facts into a decision.
7. **Stable count slots [FOUNDATION].** `research/14-ux-states.md` returns *Content Jumping*
   (High): badge insertion must not shift neighbouring controls. Reserve the badge/count slot.

**Screen-reader contract (normative for #309).**

- Chip: visible text is the state word; accessible name is a sentence —
  `Ready to work` / `Blocked — 3 unfinished prerequisites` / `Waiting — not yet actionable`.
  Icons `aria-hidden="true"`.
- Item accessible name composes once: `{title}. {status}. {readiness}. {blocked by N, if any}.
  Due {date}.` — one coherent phrase, not eight adjacent labels.
- Blockers are a real `<ul>` of links, labelled `Blocking tasks for {title}`; `+n more` is a real
  `<button>` with `aria-expanded` + `aria-controls`. The disclosure is never the only route:
  the detail pane/page lists all blockers expanded.
- Aggregates use `role="status" aria-atomic="true"` **only** when they result from a user action.
- Column / quadrant / group headings are sequential real headings, no level skips
  (`Heading Hierarchy`, [FOUNDATION] `research/08-ux-navigation.md`).

---

## 6. Mobile task management (≤767px)

**Findings.**

1. **Horizontal page scroll is a failure, not a fallback** [FOUNDATION `horizontal-scroll`]. Wide
   layouts are *replaced* on mobile, not shrunk. (The pre-#304 `/tasks` table demonstrated the
   failure: `min-w-4xl` + `overflow-x-auto` pushed the actions column off-screen.)
2. **Hover-only affordances do not exist on touch** [JUDGEMENT, established repo rule].
3. **44×44px targets are non-negotiable even at density 8/10** [FOUNDATION §2: *"the hit area
   extends beyond the paint"*]. `<input>` stays at 16px to avoid iOS auto-zoom (§4).
4. **Mobile use is execution-shaped [JUDGEMENT].** People complete, defer and capture on a
   phone; they do not re-plan a dependency graph. Optimise `complete`, `status`, `due-date`,
   quick capture, and *reading* blockers.
5. **Drag on touch conflicts with scroll [JUDGEMENT + WCAG 2.5.7].** Long-press-to-drag is
   fragile and undiscoverable; an explicit "Move…" command is more reliable *and* is the same
   code path keyboard users need.
6. **The shell already owns navigation below 768px** [FOUNDATION §7: top bar + 5-slot bottom tab
   bar + More sheet]. #309 must not add a competing navigation mechanism
   (`avoid-mixed-patterns`) and must reserve the tab bar's height via `--shell-tabbar-h` so
   sticky content and focus scrolling clear it.

**Direction.** Single column everywhere; board → column switcher; matrix → ordered accordions;
detail → full-screen drawer; primary action as a persistent trailing control on each row;
everything else behind a per-row overflow `Menu`; reorder/move via explicit menu commands.

---

## 7. Dense desktop task workspace (≥1280px)

**Findings.**

1. **Density is set by the foundation, not re-chosen here** [FOUNDATION]: dial 8/10, 4pt scale
   `4 · 8 · 12 · 16 · 24 · 32 · 48`, *nothing outside the scale without a written reason*, and a
   four-tier density model (Chrome tightest → Lists dense → Records comfortable → Empty/error
   generous).
2. **Density is not "smaller everything" [JUDGEMENT].** It is tighter vertical rhythm, fewer
   nested containers (a `line` border or rail instead of a card-in-a-card), numeric alignment,
   and *conditional* metadata — a column that is `—` for 80% of rows costs more than it returns.
3. **Numerals are handled by the type system, not a second font** [FOUNDATION §4]:
   `font-variant-numeric: tabular-nums` on `th`, `td`, `time`, `output`, `[data-numeric]`.
   **Do not reach for `font-mono`** — that was the Cockpit convention and is superseded.
4. **Above ~1440px, more columns beat wider columns [JUDGEMENT].** Past ~75ch scanning degrades
   (MASTER §4 measure), so extra width buys the detail pane, not longer titles.
5. **Elevation stays flat** [FOUNDATION §6]: inline surfaces get a 1px `line` border and **no**
   shadow; `shadow-lg` is reserved for menus, dialogs, sheets, toasts and the dragged item.

**Direction.** Three-zone shell ≥1280px: lens/filter rail (left, collapsible) → primary view →
detail pane (right, on demand). A **Compact | Comfortable** toggle, persisted, applied as
`data-density` on the workspace root and consumed in CSS only, defaulting to Compact ≥1440px and
Comfortable below. Compact list rows sit at the foundation's dense tier (8–12px padding), not
below it.

---

## 8. Accessible drag / reorder

**Normative requirements.**

| Requirement | Source | Consequence |
|---|---|---|
| Single-pointer alternative to any drag | **WCAG 2.2 AA 2.5.7 Dragging Movements**; also `dragging-alternative` [FOUNDATION §11] | A "Move to…" menu command is **mandatory** |
| Full keyboard operation | WCAG 2.1.1 | Grab / move / drop / cancel protocol |
| Focus visible, and never obscured | WCAG 2.4.7, **2.4.11**; [FOUNDATION §11] `scroll-padding` reserves top bar + tab bar | Focus follows the moved item to its new position and is never under sticky chrome |
| Status messages announced | WCAG 4.1.3 | Polite announcements on grab/move/drop/cancel/fail |
| Reduced motion | [FOUNDATION §10] — `prefers-reduced-motion: reduce` collapses **all** durations globally, not per component | No per-component opt-in needed; do not re-implement it locally |
| Target size | WCAG 2.5.8 (≥24px) + [FOUNDATION §12] (44×44 touch) | The handle is an explicitly sized control |
| Operable boundary contrast | WCAG 1.4.11; [FOUNDATION] `line` vs `line-control` | The handle and any draggable surface use **`line-control` (≥3:1)** — in a flat system the border *is* the affordance |

**The reorder contract for #309.**

- **Explicit handle**, a real `<button>` with `line-control` boundary, ≥24px painted / 44px hit.
  Never make the whole row draggable — it hijacks text selection and turns every click into a
  potential drag.
- **Keyboard protocol.** Focus handle → `Space`/`Enter` grabs (`aria-pressed="true"`, announce
  *"Grabbed Title. Position 3 of 12. Arrow keys to move, Space to drop, Escape to cancel."*).
  Arrow Up/Down move within a list; Arrow Left/Right move across board columns.
  `Space`/`Enter` drops and commits `PATCH /tasks/{id}/move`; `Escape` cancels and restores.
- **Menu equivalent (the 2.5.7 alternative).** Every reorderable item's overflow menu carries
  "Move to column…", "Move to top / up / down / bottom" — same mutation, no pointer gesture.
- **Announcements** via `announcementContext` (`aria-live="polite"`, `aria-atomic`), as full
  sentences including new position and container; failures announce and restore the prior order.
  Because more than one live region can be present, the workspace region is **named**
  [FOUNDATION §12].
- **Motion.** Drop/reflow uses `--duration-base` (160ms) on `transform`/`opacity` only — never
  `width`/`height` — and the dragged item is the *one* elevated element (`shadow-lg`).
- **Optimistic + rollback**, matching `hooks/useApiQueries.ts` (`onMutate` snapshot / `onError`).
- **Blocked tasks are still reorderable** [JUDGEMENT]: planning is not execution; readiness must
  not remove an ordering affordance.

---

## 9. Quick actions and focus sessions

**Findings.**

1. **Ruthless action hierarchy [JUDGEMENT].** Exactly one primary action per row/card, at most
   two secondary inline, everything else in an overflow `Menu`. The primary action is
   *state-dependent* — this is how the action hierarchy and the state model reinforce each other
   instead of competing.
2. **Map quick actions 1:1 onto the granular endpoints** [CONTRACT] — `/complete`, `/status`,
   `/due-date`, `/move`, `/project`, `/parent` — and avoid full `PUT`.
3. **Recurring completion is not deletion** [CONTRACT, `API_DOCS.md`]: `PATCH /{id}/complete` on
   a recurring task resets the *same row* to `NOT_STARTED` with a new `dueDate`. The UI must say
   *"Completed — next due {date}"* and keep the row, or the interaction reads as a bug.
4. **A command palette is the honest home for low-frequency actions [JUDGEMENT]** in a dense
   workspace, and is keyboard-native by construction.
5. **Focus sessions need a committed queue and a visible exit [JUDGEMENT].** Compose
   `components/focus/FocusTimerWidget`; do not replace it.
6. **Buttons follow the foundation** [FOUNDATION §8]: `primary` filled brand, `secondary`
   outlined with a `line-control` border, `ghost`, `danger`; ≥32px tall with a 44px hit area and
   a visible 2px/2px-offset `brand` focus ring.

---

# RECOMMENDED DESIGN DIRECTION

*Actionable spec. An implementer can start from this section alone. Expressed in Neutral
Workbench terms; consumes role tokens only — raw hex in a component is a defect.*

## A. Information architecture

One **Tasks workspace shell** wrapping three interchangeable *views* over one dataset, plus one
detail surface with three presentations.

```
Tasks workspace shell   (owns: filters/lenses, saved views, density, selection, detail pane)
├── View: List     (/tasks)           — shipped in #304; re-tokenised, gains the shared pane
├── View: Board    (/tasks/board)     — grouping-selectable kanban
├── View: Matrix   (/tasks/matrix)    — computed 2×2 read-and-correct lens
├── View: Projects (/tasks/projects)  — unchanged
└── <TaskDetail>   — one component, rendered as pane | drawer | page
```

Filter, search, saved-view, lens and density state live in the **shell**, are encoded in the URL
query string, and **persist across view switches**. Views never own their own filter UI.

## B. Route / navigation model

| Route | Behaviour |
|---|---|
| `/tasks` | List view (default). Unchanged behaviour. |
| `/tasks/board` | Board view. **Keeps working** — same path, new implementation. |
| `/tasks/matrix` | Matrix view. **Keeps working** — same path, new implementation. |
| `/tasks/projects` | Unchanged. |
| `/tasks/:id` | Standalone detail page. **Keeps working**; renders `<TaskDetail>` in page form. |
| `/tasks?view=…&q=…&status=…&group=…&density=…&peek={id}&focus={id}` | Shell state, shareable. |

- View switching stays on `SectionTabs` / `TASK_VIEW_TABS` (`router/routes.tsx`). Per
  [FOUNDATION §8], these are **links in a `<nav>` with `aria-current`, not `role="tab"`** — they
  change the URL, so link semantics (back button, open-in-new-tab) must survive. Secondary
  navigation stays visually distinct from the shell so the two levels never read as one.
- Opening detail *inside* a view sets `?peek={id}` on the current route — Back closes the pane
  instead of leaving the view. `/tasks/:id` remains a first-class deep link; the pane offers
  "Open full page" which navigates there. No redirects are required.
- Focus mode is `?focus={id}`, an overlay at `--z-overlay: 50`, dismissed with Escape.
- Route changes move focus to `<main>` with a live-region announcement [FOUNDATION §11].

## C. Density strategy

- 4pt scale `4 · 8 · 12 · 16 · 24 · 32 · 48`; nothing off-scale without a written reason.
- Tiering per [FOUNDATION §2]: **Chrome** tightest → **Lists/Board/Matrix** dense (8–12px row
  padding) → **Detail** comfortable (60–75ch measure) → **Empty/error** generous.
- One **`Compact | Comfortable`** toggle in the shell header, persisted, applied as
  `data-density` on the workspace root, read in CSS only. Default Compact ≥1440px.
- Numerics use `[data-numeric]` + `tabular-nums` (counts, dates, scores, percentages).
  **No `font-mono`** — Inter, weight variations only; Fira Code is content-only.
- Titles clamp at 2 lines on cards / 1 line in compact rows, with the full value in `title`
  (`truncation-strategy`); prose sets `overflow-wrap: anywhere`.
- Surfaces are flat: 1px `line` border, no shadow. `shadow-lg` only for menus, dialogs, sheets,
  toasts, and the item currently being dragged.

## D. How detail is surfaced

**Progressive, three-tier, one component.**

1. **Tier 0 — row/card:** title, status chip, readiness chip, first blocker link (when blocked),
   due badge, primary action. No hover-only content. Stable slots so badges never shift controls.
2. **Tier 1 — pane (≥1024px, 360–480px) / full-screen `Drawer` (<1024px):** header (title,
   status, readiness + full blocker list, primary action) → key fields (due, effort, project,
   area — inline-editable) → collapsible Description / Subtasks / Dependencies / Notes /
   Recurrence → collapsed Meta.
3. **Tier 2 — `/tasks/:id`:** same component, wider two-column composition, for deep links and
   long-form work.

Editing is inline and field-local against `/status`, `/due-date`, `/project`, `/parent`,
`/complete`, `/dependencies`; full `PUT` only for title/description. Optimistic with rollback.
Every field has a real `<label>`; errors sit beside their field with `aria-invalid` + border +
text. All three presentations define empty, loading and error states, loading reserving space.

## E. Action hierarchy

| Tier | Where | Contents |
|---|---|---|
| **Primary** (1, state-dependent) | Row/card trailing slot; pane header | `blocked` → **View blockers** · `ready` + not started → **Start focus** · in progress → **Complete** · `waiting` → **Set status** |
| **Secondary** (≤2) | Row/card, icon buttons **with accessible names** | Open detail · Due date |
| **Overflow** | Per-item `Menu` | Move to column/top/up/down/bottom · Change status · Set project/parent · Add dependency · Duplicate · Delete |
| **Bulk** | Shell action bar on selection | Status · Due date · Project · Complete · Delete |
| **Global** | Shell header + `Cmd/Ctrl-K` palette | New task · Quick capture · Start focus · Switch view · Density · Saved views |

Buttons: `primary` filled brand / `secondary` outlined `line-control` / `ghost` / `danger`.
Destructive actions are separated from the primary target and always confirm.
Recurring completion reports **"Completed — next due {date}"** and keeps the row.

## F. Responsive behaviour (375 / 768 / 1024 / 1440, mobile-first)

| Width | Shell | Board | Matrix | Detail |
|---|---|---|---|---|
| **375** | Single column; filters in a sheet; sticky header offset by `--shell-topbar-h`; content and focus scrolling clear `--shell-tabbar-h`; inputs 16px | Segmented **column switcher**, one column as a full-width list; move via menu only | Four ordered accordions (Do first / Schedule / Delegate / Drop), first expanded | Full-screen `Drawer` |
| **768** | Single column + collapsible filter sheet; 2-up metadata | 2 columns; horizontal scroll **inside the board region only**, snap per column | 2×1 stacked pairs (accordions if tall) | Full-screen `Drawer` |
| **1024** | Filter rail (collapsible) + content | 3 columns, cards ~260px | True 2×2 | **Pane appears** (360px), content reflows |
| **1440** | Rail + content + pane persistent; Compact density default | 4+ columns | 2×2 with instrumented quadrant headers | Pane 420–480px |

Invariants: the **page never scrolls horizontally**; `min-h-dvh`, never `100vh`; text scales to
200% without loss of function; verified in light *and* dark at all four widths.

## G. Readiness and blockers — visual + screen-reader contract

**Visual (spending the foundation's reserved colour budget, §0.2).**

- Reuse `TaskStateChip`'s structure — three states from `taskLenses.ts`, each **icon + word +
  colour** — re-tokenised to Neutral Workbench roles: `ready` → `positive`,
  **`blocked` → `caution` (never `critical`)**, `waiting` → `neutral`.
  `critical` is reserved for **overdue**; at-risk uses `caution` as an **outline**, not a fill,
  so it never reads as blocked.
- Workflow status keeps a **separate** badge family, fixed order (status, then readiness), never
  merged, never sharing a variant.
- Blocked items also carry a **2px `caution` left rail** on rows and cards, so the state survives
  at card scale and in peripheral vision — structure, not ornament (P3).
- Blocker disclosure per `BlockerSummary`: first blocker always a visible link, remainder behind
  an operable `+n more`; the detail pane/page always lists all blockers expanded.
- Aggregates on every column, quadrant and group header: `{total} · {n} blocked`, `[data-numeric]`
  tabular, in a **reserved slot** so appearing counts never shift adjacent controls. Zero-blocked
  renders no blocked segment.
- Quadrant and column grounds stay neutral (`canvas`/`inset`). The only colour inside a region is
  state colour on the items themselves.
- Priority carries **no hue** — rank, weight, position and a `line-strong` rail only.
- Focus mode / "Start focus" is disabled for blocked tasks, replaced by "See what's blocking
  this" — the only place readiness gates an action.

**Screen readers.**

- Chip accessible name is a sentence (`Ready to work` / `Blocked — 3 unfinished prerequisites` /
  `Waiting — not yet actionable`); icons `aria-hidden`.
- Item name: `{title}. {status}. {readiness}. {blocked by N, if any}. Due {date}.`
- Blockers: `<ul>` of links labelled `Blocking tasks for {title}`; `+n more` is a
  `<button aria-expanded aria-controls>`.
- Column / quadrant / group headings are sequential real headings; no skipped levels.
- Counts are **not** live regions. Only user-caused transitions announce, once, politely,
  atomically: `Task "{title}" is now ready. 0 blockers remaining.` /
  `Moved "{title}" to In progress, position 2 of 7.` The workspace live region is **named**,
  distinct from the shell's.
- Blocked is informational: never `role="alert"`, never the destructive colour family.

**Non-negotiable.** `ready`, `blocked` and `blockers[]` come from the API response only. No #309
surface may compute, infer, default or fall back to a client-side derivation — not
`ready = !blocked`, not `blocked = dependencyIds.length > 0`, not anything derived from `status`.
Absent field ⇒ render the neutral *waiting* state.
