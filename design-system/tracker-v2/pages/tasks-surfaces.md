# Tasks surfaces — Board, Matrix, Task Detail

**Overrides:** `design-system/tracker-v2/MASTER.md` where they differ; everything not
stated here follows Master.
**Established by:** #309 (Phase 1 of roadmap #317).
**Research:** `../research/309-tasks-surfaces/` — verbatim `search.py` transcripts.

---

## 1. Direction: "Execution Surface"

The `product` domain returns **Productivity Tool → Flat Design + Micro-interactions**
(secondary: Minimalism & Swiss Style). Flat Design and Swiss are already the v2
foundation, so the new element for these surfaces is **Micro-interactions**
(`risk:low`, `cost:low`, light and dark supported).

That gives the one deliberate divergence from Master:

> **The shell is calm furniture. The task workspace is an instrument.**
> Master's motion tier is Subtle because chrome should recede. These surfaces are
> where the user *acts*, so every action answers immediately: 50–100ms state
> feedback, an explicit `:active` press state, and a visible success/failure
> outcome for every mutation.

Master's `--duration-fast` (100ms) already sits in the style's 50–100ms band, so
this needs no new token — it needs the feedback to actually be *applied* to task
actions, which today it largely is not.

Everything else in Master holds: neutral chrome, colour only for state and action,
flat surfaces, one type scale, the same semantic tokens.

---

## 2. The finding that drove the redesign

`"dragging movements single pointer alternative" --domain ux` returns, as a WCAG
2.2 AA requirement:

> **`dragging-alternative`** — *"WCAG 2.2 AA requires a single-pointer alternative
> for author-controlled drag operations. **Do:** Add buttons, menus or tap-to-move
> controls and retain keyboard operation. **Don't:** Make dragging the only way to
> reorder, resize or select."*

The current Board fails this on touch. It wires a `KeyboardSensor` — so keyboard
works — but on a touchscreen **drag is the only way to move a task**. There is no
button, no menu, no tap-to-move.

This is not a styling defect, so it cannot be fixed by restyling the board. It
decides the interaction model:

> **Movement is a command, not a gesture. Drag is an accelerator layered on top.**

So the redesign is built around an explicit **Move** control that every task
carries on every surface, operable by pointer, touch and keyboard alike. Drag
survives as an enhancement for people who want it — it is no longer the mechanism.

Two supporting rules make the same point from other directions:

- **`web-target-size`** — 24×24 CSS px minimum for pointer targets, and drag
  handles are pointer targets.
- **`dragging-alternative`** is AA, not AAA: this is a conformance gap, not a nicety.

---

## 3. Second finding: stop clamping task titles

> *"Headings, actions, errors, safety text and distinguishing names need complete
> access. **Do:** Wrap, stack, resize or provide a visible full-detail path.
> **Don't:** Clamp essential meaning only to make cards uniform."*
>
> *"Text must remain available at narrow widths, zoom and user spacing overrides.
> **Don't:** Clip text in fixed-width or fixed-height boxes."*

A task title is the *distinguishing name* — the whole point of the card. The
current board single-line `truncate`s it inside a fixed `w-72` column, so
"Renew the production TLS certificate before…" and "Renew the production TLS
certificate for…" are indistinguishable.

**Rule for these surfaces:** task titles wrap to at most two lines and always
expose the full string; they are never single-line truncated. Uniform card height
is not a goal.

---

## 4. Information architecture

No route changes. `/tasks`, `/tasks/board`, `/tasks/matrix`, `/tasks/projects`,
`/tasks/:id` all keep their meaning and their deep links, and the shell's section
navigation continues to relate them.

Within each surface:

| Surface | Model |
|---|---|
| **Board** | Columns are a scrolling *region* on desktop; one column at a time with a switcher below `md`. The page never scrolls horizontally. |
| **Matrix** | Loads on arrival. Four quadrants, each a list of linked tasks with the same action affordances as the board. |
| **Task Detail** | Readiness first, then edit, then dependencies, then linked notes — ordered by what blocks work, not by what is easiest to render. |

### Board on mobile

`gesture-conflicts` — *"Avoid horizontal swipe on main content; prefer vertical
scroll"* — rules out a swipeable column carousel. Below `md` the board shows **one
column at a time**, chosen from a switcher, scrolling vertically like every other
list in the product. Moving a task still works, because moving is a menu command.

---

## 5. Readiness and blockers

`task.ready`, `task.blocked` and `task.blockers[]` are **backend truth**. Never
derive one from the other; a task can be `WAITING` and `ready`, or `NOT_STARTED`
and `blocked`.

Board and Matrix previously showed **neither**. They now show both, because
readiness is what decides whether a task can be picked up at all — the single most
decision-relevant fact on a triage surface.

Presentation obeys `color-not-only` and the Status Page research finding
(*"Timeline + Severity Indicators"*): every readiness state is an **icon plus a
word**, never a bare colour.

| State | Rendering |
|---|---|
| `blocked` | Caution chip, alert icon, the word "Blocked", and the blocker list one interaction away |
| `ready` | Positive chip, check icon, the word "Ready" — shown only where ready and blocked are compared side by side |
| neither | Nothing. Silence is the common case and does not need a chip. |

A blocked chip **never appears without its explanation reachable in one
interaction**.

---

## 6. Action hierarchy

Per surface, in order:

1. **Move** — the primary command; menu-first, drag-optional.
2. **Open** — the task title is a link to its detail route.
3. **Complete** — where the surface is about execution.
4. Everything else — behind an overflow menu (`overflow-menu`: *"When actions
   exceed available space, use overflow/more menu instead of cramming"*).

Every mutation gets a visible outcome (`form-feedback`: *"Show loading then
success/error state"*) and, where it changes placement, an undo
(`confirm-destructive` / the existing undo-toast contract).

---

## 7. Density

Board and Matrix are dense per Master §2 ("lists and tables" level): 8–12px row
padding, metadata as chips, no decorative padding. Task Detail is at the "records"
level — comfortable, with a reading measure on descriptions.

---

## 8. Anti-patterns for these surfaces

Additions to Master §13:

1. **Drag as the only way to move a task.** WCAG 2.2 AA failure.
2. **Single-line-truncated task titles.** They are distinguishing names.
3. **A surface that renders nothing until the user presses "Load".** Matrix did this.
4. **Showing status while hiding readiness.** They are different axes and the user
   needs both.
5. **Inferring `ready` from `!blocked`,** or vice versa.
6. **Emoji as a metric icon** — the board's streak chip used 🔥.
7. **Horizontal *page* scroll to fit the board.** The column region scrolls; the page does not.
8. **A whole card as the drag handle**, which swallows the clicks and taps of every
   control inside it.
