# Board — `/tasks/board`

**Overrides:** `design-system/tracker-v2/MASTER.md` and
`design-system/tracker-v2/pages/tasks-surfaces.md` where they differ; everything
not stated here follows those, in that order of specificity.
**Research:** `../research/board-kanban/` — verbatim `search.py` transcripts,
skill v2.13.0, run fresh for this surface.
**Relationship to `tasks-surfaces.md`:** that file governs Board, Matrix and Task
Detail *together*, and its interaction contract (movement is a command; titles
are never single-line truncated; readiness is backend truth) is **unchanged and
still binding**. This file replaces its *visual* treatment of the Board only.
Matrix and Task Detail continue to follow `tasks-surfaces.md` as written.

---

## 1. Direction: "Ruled Board"

The two `--design-system` runs for this surface both return **Minimalism & Swiss
Style** — *"geometric, grid-based, high contrast, essential"*. The `style`
domain returns **Data-Dense Dashboard** with a layout brief that reads as a
specification: *`overflow: auto`, compact card design, **sticky headers**,
`font-size: 12-14px`, minimal padding*. The `product` domain returns
**Micro-interactions** — *50–100ms, `:active` for press, `@media (hover: hover)`*.

The board is composed from those three, and the composition has one governing
idea:

> **The board is a ruled instrument, not a page of cards.**
> Structure is carried by *rules and alignment* — a fixed column grid, sticky column
> headers, hairline column separators — so that the card itself can stop carrying
> it. The previous board asked a bordered card inside a bordered slab inside a
> bordered page to establish four levels of hierarchy with four identical
> borders. Here the grid establishes the hierarchy and each card only has to
> distinguish *one task from its neighbours*.

Three consequences follow, and they are the whole redesign:

1. **A column is a column of the page grid, not a container.** No column
   background, no column border box. Columns are separated by a 1px `line` rule
   and share one continuous ground. This deletes an entire surface level and is
   what makes the board read calm at density.
2. **The board owns the viewport.** It is full-bleed and viewport-height. The
   column rail scrolls horizontally, each column body scrolls vertically, the page
   scrolls not at all, and the column headers stay put.
3. **The card ranks its own contents.** State, identity, values and actions each
   get a distinct visual channel instead of five identical pills.

---

## 2. The finding that drove it: `Compact Label Semantics`

> **`Compact Label Semantics`** (High) — *"**Badges communicate state while chips
> or tags represent values or actions.** Do: choose static or interactive markup
> from the label's meaning and ownership. **Don't: make every pill clickable or
> encode status with colour alone.**"*

The previous card rendered *Blocked*, *Overdue Sep 2 2026*, *Score 94*,
*Important* and *9 day streak* as five pills of the same shape, size, weight and
radius. Two of those are **state** (does this task need attention, can it be
worked on at all), three are **values** (a date, a number, a counter). Rendering
them identically means the eye has to read all five to find the one that
matters — which is precisely the "calm at density" failure.

**Rule for this surface — the card has exactly four ranks, in this order:**

| Rank | Channel | Contents | Treatment |
|---|---|---|---|
| 1 | **State spine** | overdue / blocked / important / none | 3px bar on the card's leading edge. Always *redundant* — never the only carrier of the fact (`Colour Only`) |
| 2 | **Identity** | task title | `text-sm`, weight 500, wraps to 2 lines, full string in `title`, links to `/tasks/:id` |
| 3 | **State badges** | `Blocked`, `Overdue` only | Pill, semantic colour, icon **and** word. At most two ever appear |
| 4 | **Value chips** | due date, score, effort, streak | Borderless, `text-[11px]`, `fg-subtle`, icon + value, **not** pill-shaped. Visually subordinate by construction |

`Important` stops being a fifth pill and becomes a flag glyph beside the title
with an `sr-only` label — it is a property of the task's identity, not a state
to triage.

Supporting rules, all High severity, all applied:

- **`Compact Label Overflow`** — every token is `whitespace-nowrap` with
  `min-w-0`; no label ever wraps *inside* its own pill.
- **`Chip Collection Reflow`** — the meta row is `flex-wrap`; nothing is clipped
  into a fixed-height row.
- **`Content Jumping`** — the score occupies a stable right-aligned
  `tabular-nums` slot, so a task gaining a score does not reflow the row.

---

## 3. Layout model

### Desktop (`≥768px`)

```
┌─ board toolbar ────────────────────────────────── (sticky, not scrolled) ─┐
│ Board · 12 tasks, 3 blocked            [All | Work | Training & Life]     │
├───────────────────────────────────────────────────────────────────────────┤
│ To do        3 │ In progress   2 │ Review     1 │ Done       0   ← sticky │
│ ▁▁▁▁▁▁▂▂▂▂▂▂▂▂ │ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │ ▁▁▁▁▁▁▁▁▁▁▁▁ │ ▁▁▁▁▁▁▁▁▁▁▁▁   ← load bar│
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ ┄┄┄┄┄┄┄┄┄┄┄┄ │ ┄┄┄┄┄┄┄┄┄┄┄┄            │
│ ▌card          │ ▌card           │ ▌card        │   (designed empty)      │
│ ▌card          │ ▌card           │              │                         │
│ ▌card          │                 │              │                         │
│      ↕ each column body scrolls independently; the page does not          │
└───────────────────────────────────────────────────────────────────────────┘
        ↔ rail scrolls horizontally inside its own region
```

- **Full-bleed.** `/tasks` already sets `routeOwnsPageLayout`, so the board drops
  `max-w-6xl` and uses the whole main region. At 1440 this is the difference
  between four visible columns and three-and-a-clipped-one.
- **Viewport height.** The board region is `height: calc(100dvh - topbar)`;
  `min-h-dvh`/`dvh` per Master §6, never `100vh`.
- **Column width** `17.5rem`, `flex: 0 0 auto`. Chosen so two full columns plus a
  peek fit at 768 and four at 1440 — the tablet tier gets a real board rather
  than a single column, and the peek is the scroll affordance.
- **Column headers stay put** (`Data-Dense Dashboard`: "sticky headers"). The
  header sits *outside* the scrolling body rather than using `position: sticky`,
  because on the desktop board the column body is the scroll container, so the
  header is already fixed relative to it.
- **`overscroll-behavior: contain`** on every scroll region (`Pull to Refresh`),
  so column scroll never chains into the page.

### The load bar

Each column header carries a 2px full-width rule under it. It is `line-strong` by
default; when the column holds blocked work, a `caution` segment fills the blocked
fraction. This is the "Drill-Down Analytics" affordance the `product` record
names, at the smallest possible size: it answers *which column is stuck* without
reading a single card.

It is **never the only carrier** — the header also prints "*n* blocked" in words
whenever *n* > 0 (`Colour Only`).

### Mobile (`<768px`)

`Gesture Conflicts` (*"Avoid horizontal swipe on main content… Good: **vertical
scroll primary**. Bad: horizontal swipe carousel **only**"*) rules out a swipeable
column carousel, and the `scroll snap paging` query returned **no verified match**
(see `00-method.md` §4), so nothing supports building one.

One column at a time is therefore kept — but it is rebuilt, not preserved:

- The column switcher is a **sticky, horizontally scrollable strip** that stays
  visible while the column body scrolls, so column context is never lost
  mid-scroll. Because it carries the column's name, count and blocked count, the
  column's own header is redundant below `md` and is reduced to an `sr-only`
  heading rather than repeated on screen.
- Each switcher entry carries its **count and its blocked count**, so the user
  can see which column needs attention *without visiting it*. The previous
  switcher showed a count only, which meant checking every column by hand.
- The selected column is in the URL (§5), so the browser back button steps back
  through columns and a column is a shareable link.

---

## 4. Actions: de-emphasised, never hover-only

`Micro-interactions` specifies `@media (hover: hover) for desktop` and `:active`
for press. The requirement "no essential hover-only actions" and the guideline
are reconciled by changing **contrast, not presence**:

- Both card controls — drag handle and Move menu — are **always rendered, always
  focusable, always hit-testable**, in a right-hand gutter.
- At rest they are `fg-subtle` (verified ≥4.5:1 in every theme, so far above the
  3:1 non-text minimum). On hover, on `focus-within`, and on touch they go to
  `fg`.
- Nothing appears or disappears. There is no `opacity: 0` state, so there is no
  hover-only affordance, no discoverability cliff on touch, and no focus target
  that is invisible until focused.

Placement is a hierarchy decision (Master §3: *position is the strongest
channel*). The previous card put the **drag handle at the top-left**, the
strongest position on the card, for the least important control. Here the
leading edge belongs to the state spine and the title; both controls move to the
trailing gutter.

The Move menu's icon changes from `MoveHorizontal` (↔, which reads as *resize*)
to `CornerUpRight` — `icon-context-accessibility` asks for *"the most
semantically precise icon"*. Its accessible name is unchanged.

**Movement remains a command** (`tasks-surfaces.md` §2, `Dragging Movements`,
WCAG 2.2 AA): the menu is the mechanism on every pointer type, drag is the
accelerator. Both paths run the same mutation, the same announcement and the
same undo.

### Drag feel

- A `DragOverlay` carries the lifted card, so it genuinely floats with
  `shadow-lg` (Master §6: *dragged item — `shadow-lg`, it genuinely floats*).
- The source slot leaves a dashed placeholder, so the board does not collapse
  and re-expand under the pointer.
- Column drop targets tint **only while a drag is in progress** — a permanent tint
  is decoration, and decoration is what P1 forbids.
- The drop target reads through **both** a background change and a border
  change, never colour alone.
- All of it inherits the global `prefers-reduced-motion` collapse from
  `theme.css`; no per-component opt-in.

---

## 5. Board state lives in the URL

> **`Deep Linking`** (Medium) — *"URLs should reflect current state for sharing.
> **Do:** update URL on state/view changes. **Don't:** static URLs for dynamic
> content."*

| State | Parameter | Notes |
|---|---|---|
| Focus filter | `?focus=work` \| `training` | Omitted when `all` — the default stays a clean URL |
| Active column (mobile) | `?column=<columnId>` | Omitted when it is the first column |

Written with `replace: true` so filtering does not stack history entries, but
still restored on load — a bookmarked `/tasks/board?focus=work` opens filtered.
Unknown or stale values fall back to the default rather than rendering an empty
board.

---

## 6. States

| State | Treatment |
|---|---|
| **Loading** | A board-shaped skeleton: real column headers, placeholder cards at plausible heights. `aria-busy="true"` on the region plus **one** `role="status"`. Per `Loading Indicators` (*"stable skeleton… with `aria-busy`"*) and `Content Jumping` — the board must not pop in |
| **Empty column** | Designed, not default: a quiet icon, "Nothing in *Column*", and the sentence that resolves it — "Drag a card here, or use a task's Move menu." **No `role="status"`** (see below) |
| **Empty board** | No columns configured — an `EmptyState` explaining what is missing |
| **Error** | Says what failed and offers retry |

> **`Contextual Live Badge Updates`** (High) — *"Use **one** appropriate atomic
> status message… Don't announce a bare number or **make every badge a competing
> live region**."*

The previous board gave **every empty column its own `role="status"`**, so a board
with three empty columns announced three competing statuses. There is now exactly
one board-level live region, carrying one atomic sentence — "12 tasks, 3
blocked" — and the column empty states are ordinary static content.

---

## 7. Readiness stays backend truth

Unchanged from `tasks-surfaces.md` §5 and non-negotiable:

- `task.ready`, `task.blocked` and `task.blockers[]` are **backend truth**.
- **Never** derive one from the other. `ready = !blocked` is a defect.
- No status or readiness value is invented in the frontend.
- A `Blocked` badge never appears without its blocker list one interaction away.
- `blocked` renders as a caution badge with an icon **and** the word; the spine
  is a redundant second channel, never the signal itself.

The board additionally surfaces readiness **in aggregate** — the column load bar
and the board summary count blocked tasks — but every one of those counts is a
sum over `task.blocked` as the backend reported it. Nothing is inferred.

---

## 8. Density

Per Master §2, "lists and tables" level, tightened to the `Data-Dense Dashboard`
brief:

- Card padding `10px`; column gutter `12px`; inter-card gap `8px`.
- Title `14px`/500, state badges `11px`, value chips `11px`, column header
  `13px`/600.
- Everything on the 4pt scale. `gap` utilities, never per-item margins
  (`Grid gaps`).

---

## 9. Anti-patterns for the Board

Additions to Master §13 and `tasks-surfaces.md` §8:

1. **A column rendered as a bordered slab.** The column is a grid column; the rule
   between columns is the separator.
2. **A card whose metadata is a row of undifferentiated pills.** State and value
   are different ranks (`Compact Label Semantics`).
3. **Capping the board at the shared content measure.** A board is a horizontal
   instrument; `max-w-6xl` clips it.
4. **Column headers that scroll away.** They are the board's orientation.
5. **A `role="status"` per column.** One board-level live region, one atomic
   message.
6. **A bare "Loading…" line** where a board is about to appear.
7. **An action that only exists on hover.** De-emphasise with contrast, never
   with presence.
8. **A permanently tinted drop target.** Tint is drag feedback, not decoration.
9. **Board state that only exists in `useState`.** Filters and the active column
   are URL state.
10. **`MoveHorizontal` for "move to a different column."** It reads as resize.
