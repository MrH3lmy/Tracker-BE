# Tasks Workspace Page Overrides

> **PROJECT:** Tracker-BE
> **Generated:** 2026-09-03 09:37:09
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1400px or full-width
- **Grid:** 12-column grid for data flexibility

### Spacing Overrides

- **Content Density:** High — optimize for information display

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- No overrides — use Master colors

### Component Overrides

- Avoid: Skip heading levels or misuse for styling
- Avoid: Only test on your device
- Avoid: Div soup with no semantics

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Hover tooltips, chart zoom on click, row highlighting on hover, smooth filter animations, data loading spinners
- Accessibility: Use sequential heading levels h1-h6
- Responsive: Test at 320 375 414 768 1024 1440
- Accessibility: Use semantic HTML and ARIA properly

<!-- ===================================================================== -->
<!-- Everything above this line is unedited `--persist --page` tool output. -->
<!-- Everything below is the synthesis + implemented composition (#304).    -->
<!-- ===================================================================== -->

---

# Implementation notes (issue #304)

Implementation: `pages/TasksPage.tsx` composed from `components/tasks/TaskWorkspaceRail.tsx`,
`TaskActiveFilters.tsx`, `TaskFilters.tsx`, `TaskSavedViews.tsx`, `TaskListView.tsx`,
`TaskRow.tsx`, `BlockerSummary.tsx`, `TaskStateChip.tsx`, `TaskListStates.tsx` and
`TaskCreateForm.tsx`, plus the pure helpers in `taskLenses.ts` and `taskSavedViews.ts`.

Raw searches: `../research/tool-transcripts/05-tasks-workspace.md` (21 searches across `product`,
`ux`, `icons`, `react`, `style`, `color`, `--stack react`, `--stack html-tailwind`, plus the two
`--design-system --persist --page` runs).

## 1. The UX problem, stated from the old page

`/tasks` before this change:

| Symptom | Where it came from |
|---|---|
| Readiness was **not** answerable from the list | The row rendered `<ReadinessBadge blocked={task.blocked} />` only — `ready` was never read, so a `WAITING`/`BACKLOG` task with `blocked=false` looked identical to a genuinely actionable one. Exactly the class of bug #297 fixed on Today, still live here. |
| "Why is it blocked" cost two interactions | Blockers lived inside the row's expansion panel, under a *second* `Collapsible`, next to four other detail sections. |
| Nothing was scannable at a glance | Seven fixed grid columns (`min-w-4xl`) of equal weight — Status, Due, Estimate, Risk, Subtasks — most of them `—` for most tasks. |
| Horizontal scrolling on every phone | `overflow-x-auto` + `min-w-4xl` meant the whole table scrolled sideways below ~1024px; Actions were the last column, i.e. off-screen. |
| Essential actions were hover-only | The linked-notes affordance was `opacity-0 group-hover:opacity-100` — unreachable by touch. |
| Project/context was invisible | `projectId` was on every task and never rendered. |
| Detail duplicated `/tasks/:id` | Description + subtasks + notes + dependencies + activity, inline, per row. |
| Filters were undiscoverable and unremovable | Everything but search lived in one popover; the only feedback was "3 filters / sort applied." with no way to remove one. Saved views were a `Collapsible` **inside** that popover. |
| `role="table"` over `div`s | Fails the tool's own "Div soup with no semantics" / heading-hierarchy rules above. |

## 2. Findings applied, one per decision

Severity in brackets is the dataset's own. Every row below is traceable to a block in the
transcript file.

| # | Finding (domain) | Decision |
|---|---|---|
| 1 | `product` → **Productivity Tool**: *Dashboard Style: Drill-Down Analytics*, *Color Palette Focus: clear hierarchy + functional colors* | The page is a **drill-down**, not a spreadsheet: a state rail (counts) → a filtered list → `/tasks/:id`. Nothing on the page tries to be the task detail. |
| 2 | `--page` override: **Max width 1400px**, **Content Density: High** | `max-w-[1400px]` (was `max-w-7xl` = 1280px); rows are 2-line compact with `divide-y`, no per-row card. |
| 3 | `--page` override: *Avoid div soup*, *sequential heading levels* | The list is a real `<ul>`/`<li>`; the fake `role="table"`/`role="row"`/`role="cell"` grid is gone. Headings run `h2` (page) → `h3` (list region) with no skips. |
| 4 | `ux` **Compact Control Semantics** [Critical]: *interactive chips need a native role, accessible name, state, keyboard operation and visible focus; don't reveal the only action on hover* | Every lens and every active-filter chip is a real `<button>` with `aria-pressed`. The hover-only notes link is gone: "Open linked notes" is a permanent row-menu item, and the row prints a note count only when the API actually sends one. |
| 5 | `ux` **Compact Label Semantics** [High]: *badges communicate state, chips represent values or actions; don't make every pill clickable* | State (`Ready`/`Blocked`/`Waiting`/`Overdue`/status/risk) renders as non-interactive `Badge` spans in rows. Only the rail and the active-filter row use interactive chips. |
| 6 | `ux` **Color Only** [High] | `TaskStateChip` is always icon **+** word (`CheckCircle2` Ready / `AlertTriangle` Blocked / `Clock` Waiting). The left rail tint is redundant reinforcement, never the sole carrier. |
| 7 | `ux` **Essential Text Truncation** [Critical]: *headings, actions and distinguishing names need complete access — wrap, stack, resize, or provide a visible full-detail path* | Task titles use `line-clamp-2` + `wrap-anywhere` (was a hard single-line `truncate`) and the title itself is the link to the full record. Action labels are never truncated. |
| 8 | `ux` **Compact Label Overflow** [High] + `html-tailwind` **Compact label layout** [High]: *`min-w-0 whitespace-nowrap truncate` for one label, `shrink-0` controls, `flex flex-wrap gap-2` for collections; no hover-only tooltip* | Long project names truncate at `max-w-[10rem]` **and** carry an `sr-only` full value, so the whole name is available to screen readers and in the detail page rather than only in a `title` tooltip. The metadata line and both chip collections wrap. |
| 9 | `ux` **Chip Collection Reflow** [High]: *wrap the collection or use an operable +n disclosure* | `BlockerSummary` shows the first blocker inline and an operable `+n more` `<button aria-expanded>`; the rail and filter chips wrap instead of clipping. |
| 10 | `html-tailwind` **Hidden/shown utilities**: *`hidden md:block`* — **Don't: separate mobile/desktop components** | **This chose the responsive model.** One `TaskRow` at every width. Secondary metadata is revealed with `hidden sm:contents` / `hidden lg:contents` wrappers; nothing is a phone-only or desktop-only component, and no data is exclusive to one breakpoint. |
| 11 | `ux` **Table Handling**: *horizontal scroll **or** card layout* | Neither: the fixed grid is replaced by a flex row that reflows, so there is no horizontal scroll container at all and no duplicate card component to keep in sync. |
| 12 | `ux` **Hover vs Tap** [High] + **Touch Target Size** [High] + `html-tailwind` **Touch targets** [High] | Complete is a permanent leading `min-h-11 min-w-11` toggle button; the overflow menu trigger is `h-11 w-11` below `sm`. No action appears on hover. |
| 13 | `ux` **Contextual Live Badge Updates** [High]: *one atomic contextual status, not a bare number, not every badge a live region* | Exactly one `role="status" aria-atomic` region on the page: *"12 of 42 active tasks shown. Work state: Ready. 2 filters or sort applied."* Counts inside chips are plain text. |
| 14 | `ux` **Empty States** + **No Results** (*suggestions, not "0 results"*) + **Loading Indicators** (*stable skeleton, `aria-busy`*) + **Error Messages** (*`role=alert`*) | `TaskListStates` renders eight distinct states, each naming the next useful action; loading is a stable 5-row skeleton inside `aria-busy`; failure is `role="alert"` with a working **Try again** that calls `refetch()`. |
| 15 | `ux` **Focusable Error Summary** [High] + **Error Placement** [High] | The create drawer gets a `role="alert" tabIndex={-1}` summary at the top of the form on failed submit; focus moves to it; each item is an anchor to its field; inline `aria-describedby` errors are retained. |
| 16 | `ux` **Redundant Entry** / quick capture | `TaskCreateForm` is now essentials-first; blocked-reason, waiting-on and risk-reason appear **when the status/risk that requires them is selected**, and the remaining nine fields sit behind one *More details* disclosure. Validation rules are byte-for-byte the ones that were there. |
| 17 | `react` **Memoized Components** [Medium] | `TaskRow` is `memo()`d and every page handler is `useCallback`-stable, so a leaf row does not re-render when unrelated page state changes. Rail counts are two linear passes over the scope (`countTaskLenses` / `countTaskSignals`), not one filter pass per lens. |
| 18 | `icons` **icon-context-accessibility**: *keep one visual family per surface*; decorative icons `aria-hidden` | Kept `lucide-react` via `components/ui/icons.ts` — the same call made in `../REDESIGN-296.md` §2, for the guideline's own reason. Semantic set mirrors the returned Phosphor set (`check-circle`, `warning`, `clock`, `x-circle`). |
| 19 | `color` **Productivity Tool** palette | Returned the committed palette verbatim (teal `#0D9488` / orange `#EA580C` / `#DC2626`). No token changes — one app-wide language, per the issue. |
| 20 | `ux` **Sticky Navigation** / **Focus Not Obscured** | The rail + toolbar are **not** sticky. A sticky block here would sit over rows on short viewports and is the exact "persistent UI hides part of focus" case the dataset warns about; density gains did not justify it. |

## 3. Information architecture (implemented)

```
h2  Tasks                       [List | Board | Matrix | Projects]   [+ Add task]
────────────────────────────────────────────────────────────────────────────────
Work state rail        (role=group)  All 42 · Ready 12 · Blocked 5 · Waiting 7
Signals                (role=group)  Overdue 3 · Follow-up 2 · Important 4
────────────────────────────────────────────────────────────────────────────────
[ search ] [ Filters (n) ] [ Sort ▾ ] [ Views ▾ ]        [ Active | Done | Archived ]
                                            (the rail above is Active-only - see below)
[ chip: “api” × ] [ chip: Area WORK × ] [ chip: Project Atlas × ]      [ Clear all ]
────────────────────────────────────────────────────────────────────────────────
h3  Active task list                         role=status: “12 of 42 … Lens: Ready”
 ○  Wire the ingest retry path                    [Ready]  [Overdue]      [⋯]
    #184 · Atlas · IN_PROGRESS · Due Aug 28 · 45m · 2/5 subtasks · 1 note
 ○  Ship the migration runbook                    [Blocked]              [⋯]
    #191 · Atlas · NOT_STARTED · Due Sep 09
    ⚠ Blocked by #184 Wire the ingest retry path   [+2 more ▾]
      ↳ ○ Draft rollback steps                     [Ready]               [⋯]
```

### The rail: two axes, deliberately separated

- **Work state** (`readiness` URL param) is *mutually exclusive* — `all` / `ready` / `blocked` /
  `waiting` — because the three states partition the scope exactly.
- **Signals** (`overdue`, `followUp`, `important` URL params) are *independent toggles* that
  compose with the lens and with each other.

Mixing them into one chip row would imply they are alternatives. They are not, and the dataset's
"Compact Control Semantics" requires the pressed state to match the visible meaning.

### Scope is a different axis from actionability

Active / Done / Archived is **not** a fourth lens - it selects *which dataset* is on screen, and
actionability only means something for work that is still open. A `DONE` or `CANCELLED` task is
normally `ready=false`, so a Ready lens carried into Done empties the view and (worse) can render
the "No tasks are ready to start" empty state while the user is explicitly looking at their
completed work. The rule, added after the #306 review:

- `readiness`, `overdue`, `followUp` and `important` are **cleared on every scope change**, so
  returning to Active always lands on a defined state (All, no signals) rather than on whatever
  was selected two scopes ago.
- They are also **ignored at the point of derivation** whenever the scope is not Active
  (`actionabilityApplies`), so a saved view or a hand-edited `?readiness=` URL cannot filter a
  history scope either.
- The work-state rail is **not rendered** outside Active: showing Ready/Blocked/Waiting counts for
  historical tasks would be presenting a meaningless number, not a hidden control.
- Search, status, project, area, effort, due-date range and sort **do** persist across scopes -
  they are meaningful for history, and "find the thing I finished last week" is a real task.

Locked in by five tests in `TasksPage.test.tsx`; four of them fail against the pre-review code.

### Count honesty

Every rail count is computed over **the current scope only** (Active, Done, or Archived — the
whole array the scope's single query returned), before search and before filters. The region is
labelled with that scope, counts never change as you type, and no count is ever assembled from a
partial or paginated dataset. That is the issue's "do not invent global counts" rule, satisfied by
construction rather than by disclaimer.

## 4. Readiness semantics (backend-authoritative — the #297 regression must not return)

`ready`, `blocked` and `blockers[]` are three independent facts from `TaskResponse`. The single
place they are interpreted is `taskLenses.ts`:

```ts
export const taskWorkState = (task: TaskRecord): TaskWorkState => {
  if (task.blocked === true) return 'blocked';   // dependency graph says no
  if (task.ready === true) return 'ready';        // backend says actionable
  return 'waiting';                               // not blocked, still not actionable
};
```

- `ready` is **never** derived from `!blocked`. A `WAITING`, `BACKLOG` or manually-`BLOCKED` task
  with `blocked=false, ready=false` lands in **Waiting**, never in Ready.
- `blocked=true` wins over `ready` when a backend ever reports both, so a blocked task can never be
  presented as actionable.
- `blockers[]` is rendered verbatim; the client never reconstructs it from `dependencyIds`.
- Locked in by `taskLenses.test.ts` (a truth table over all four `ready`×`blocked` combinations
  crossed with every status) and by `TasksPage.test.tsx`.

## 5. Row anatomy

Line 1 — `[complete toggle]` · **title** (`line-clamp-2`, links to `/tasks/:id`) · state chip ·
`Overdue` · `Important`.
Line 2 (metadata, `text-xs`, wraps, ordered by triage value) — `#id` · project · due date
(`font-mono`) · risk (only `HIGH`/`CRITICAL`) · the hold reason (`Waiting on …` / the manual
blocked reason, when the task is not dependency-blocked) · workflow status · subtask progress ·
estimate · effort · follow-up date · area · note count. Empty fields render **nothing** — no `—`
placeholders. The workflow status badge is also suppressed when it would repeat the work-state
chip word for word (a `WAITING` task in the Waiting work state).
Line 3 — `BlockerSummary`, only on blocked rows.
Nested `<ul>` — subtasks, indented with a rail, same component, same affordances.

Breakpoints: `< sm` shows id/project/state/due/risk/hold-reason/blockers; `sm` adds status,
subtask progress and estimate; `lg` adds effort, follow-up, area and the note count. Same
component throughout — visibility is carried by `hidden sm:contents` / `hidden lg:contents`
wrappers rather than by putting `hidden` on items that already set `display` themselves
(`inline-flex`, `line-clamp-*`), which would make the outcome depend on stylesheet order.

## 6. Progressive disclosure

| Information | Lives in |
|---|---|
| readiness, blockers, due/overdue, project, subtask progress, status | the row |
| the rest of the blocker list | operable `+n more` in the row |
| subtasks themselves | nested rows |
| description, activity, dependency editing, notes bodies, full history | `/tasks/:id` |
| dependency add/remove | the existing `ManageDependenciesDrawer`, reachable from the row menu |

The per-row expansion panel that mirrored `TaskDetailPage` is removed: the issue asks not to
duplicate Task Detail inside the workspace, and everything it held is one click away on the title.

## 7. States

`first-task` · `no ready tasks` (offers the Blocked lens when blocked > 0) · `no blocked tasks` ·
`no overdue tasks` · `filtered-empty` (offers **Clear filters**) · `loading` (skeleton) ·
`error` (`role="alert"` + **Try again**) · `empty Done` · `empty Archived`.

## 8. Visual evidence

`docs/screenshots/issue-304/` — 23 captures from the implemented UI running against a seeded
backend, plus the measured horizontal-overflow table for 320/375/414/768/1024/1440px in both
themes (0px everywhere).

## 9. Accessibility contract

WCAG AA contrast (inherited tokens, unchanged) · visible focus on every control · state carried by
icon + text, never colour alone · no hover-only action · `aria-pressed` on all lens/filter chips ·
`aria-expanded` on the blocker disclosure · one atomic `role="status"` result region ·
`role="alert"` for errors · `min-h-11` touch targets · `prefers-reduced-motion` respected via the
shared `--duration-*` tokens · no horizontal page overflow at 320/375/414/768/1024/1440.

## 10. Backend contract gaps found (not changed here)

1. **No `projectName` on `TaskResponse`** — only `projectId`. The page resolves names from the
   already-cached `GET /api/v1/projects` (one query, no N+1). Adding `projectName` would remove a
   client-side join but is not required; recorded for a future backend issue.
2. **No note count on `TaskResponse`** — `TaskRecord.noteCount`/`notesCount` are optional and this
   endpoint never sends them. Rather than print an identical "Notes" chip on every row for a
   number the API does not have, the row shows a note count only when one is present and keeps
   **Open linked notes** as a permanent row-menu action. Adding `noteCount` to `TaskResponse`
   would make the chip meaningful; not worth a contract change on its own.
3. **No server-side lens/filter/paging for tasks** — `/api/v1/tasks` returns the full scope, which
   is what makes honest client-side counts possible. Fine at current dataset sizes; a future
   server-side count endpoint would be needed before paginating.
