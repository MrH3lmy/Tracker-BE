# UI UX Pro Max research method and log — Kanban board redesign (#323)

Skill: <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>, `skill.json` version
**2.13.0**, cloned at HEAD for this task and run via its own
`src/ui-ux-pro-max/scripts/search.py` against its bundled datasets (84 UI styles,
192 palettes, 74 font pairings, 98+ UX guidelines, 105 icons, 25 chart types,
22 stacks).

Every transcript in this directory is verbatim tool output. Nothing here was
written by hand and attributed to the skill. The generator's own persisted
output is kept unmodified under `skill-output/`.

This is a **fresh run**, not a re-read of the #308/#309 transcripts. Where a
query reproduces an earlier finding that is recorded below as corroboration, not
as reuse.

---

## 1. Step 1 — requirements and stack detection

Per the skill's workflow, stack is detected from the project rather than assumed.

- `frontend/package.json` → **React 19 + Tailwind v4 + Radix + lucide-react**,
  Vite 8, react-router-dom v7, TanStack Query v5, `@dnd-kit/core` + `/sortable`.
- **Surface:** `/tasks/board` — a single-user Kanban board over backend board
  columns, with drag-and-drop movement, a menu-driven move alternative, undo,
  and backend-authoritative readiness (`task.ready` / `task.blocked` /
  `task.blockers[]`).
- **Context:** short, frequent triage sessions; light *and* dark both
  first-class; 375 / 768 / 1024 / 1440 all in scope.

Stack searches used `--stack html-tailwind` (the Tailwind v4 styling layer) and
`--domain react` for render behaviour, matching the #308 finding that
`--stack react` answers component-library questions rather than layout ones.

---

## 2. Step 2 — `--design-system` runs for the board

Two framings, both with the dials the foundation already fixes
(`--variance 3 --motion 3 --density 8`). Full transcripts:
`skill-output/design-system-runs.md`.

| Run | Query | Style verdict | Palette verdict |
|---|---|---|---|
| **G** | `kanban board task execution productivity` | **Minimalism & Swiss Style** — light+dark, `cost:low`, `risk:low` | Productivity Tool teal `#0D9488` |
| **H** | `workflow pipeline stage columns dense` | **Minimalism & Swiss Style** — same record | — |

**Both runs converge on Minimalism & Swiss Style** for the board specifically:

> *"Clean, simple, spacious, functional, white space, high contrast, geometric,
> sans-serif, **grid-based**, essential"* — Best for: *"Enterprise apps,
> dashboards, documentation sites, SaaS platforms, professional tools"*.

Two parts of the generator output are **not** taken:

1. **The `Pattern` axis is off-product.** Run G returns "Product Demo +
   Features" and run H "Enterprise Gateway" — both are *landing-page* patterns
   (hero, CTA placement, client logos). `/tasks/board` is an authenticated app
   surface with no conversion goal. Same behaviour, same reason, as #308 §2.
2. **The palette re-derives the legacy teal.** `--domain color` on
   `productivity tool task status` returns Productivity Tool → `#0D9488` +
   `#EA580C` on a `#F0FDFA` ground — i.e. `design-system/tracker-be/MASTER.md`
   verbatim, the system v2 explicitly supersedes. The v2 neutral chrome is kept
   (`06-style.md`, `07-color-icons-stack.md`).

So, exactly as in #308, the generator's *style* verdict is adopted and its
pattern/palette axes are set aside with a written reason.

---

## 3. Step 3 — component-domain searches

### `product` (`01-product.md`)

All three framings return **Productivity Tool** as result 1:

- Primary style: **Flat Design + Micro-interactions**
- Secondary: **Minimalism & Swiss Style**, Soft UI Evolution
- Dashboard style: **Drill-Down Analytics**
- Colour focus: **"Clear hierarchy + functional colors"**

Read together with §2: the generator picks the *secondary* style (Swiss) when
the query is board-shaped rather than product-shaped. Both are already v2
doctrine, so the board direction is their intersection — **Swiss structure,
flat surfaces, micro-interaction feedback** — and the divergence is in *how much
structure the board itself carries*, which is what §5 below decides.

### `style` (`06-style.md`)

| Style | Light+Dark | Perf | A11y | Outcome |
|---|---|---|---|---|
| **Data-Dense Dashboard** | ✓ | `cost:low` | `risk:low` | **Adopted** for the board's layout mechanics |
| **Minimalism & Swiss Style** | ✓ | `cost:low` | `risk:low` | **Adopted** as the structural doctrine |
| **Micro-interactions** | ✓ | `cost:low` | `risk:low` | **Adopted** for feedback timing |
| Soft UI Evolution | ✓ | `cost:low` | `risk:low` | Rejected — multi-layer shadows contradict Master §6 elevation policy |
| Glassmorphism | ✓ | `cost:low` | `risk:conditional` | Rejected — `--blur-panel: 0` in v2; translucency costs contrast |
| Aurora Gradient | ✓ | `cost:low` | `risk:conditional` | Rejected — decorative colour, violates P1 |
| Adobe Spectrum | ✓ | `cost:moderate` | `risk:conditional` | Rejected — scope-locked to Spectrum component libraries |

The **Data-Dense Dashboard** record is the single most directive result in this
research, and its CSS keywords are the board's layout brief verbatim:

> `display: grid`, `gap: 8px`, `padding: 12px`, `font-size: 12-14px`,
> **`overflow: auto` for tables**, `compact card design`, **`sticky headers`**

**Micro-interactions** supplies the feedback brief:

> `animation: short 50-100ms`, `transition: hover states`,
> **`@media (hover: hover) for desktop`**, **`:active` for press**

The `@media (hover: hover)` clause is what makes a de-emphasised action cluster
legitimate rather than a hover-only trap — see §5, defect 9.

### `ux` — the guidelines that decided the design

Eight searches across four files (`02`–`05`, `09`). The rules that changed the
implementation, each traceable to a transcript:

| Guideline | Severity | What it says | Where it lands |
|---|---|---|---|
| `Dragging Movements` | High | *"WCAG 2.2 AA requires a single-pointer alternative… Don't make dragging the only way to reorder"* | Move menu preserved as the mechanism, drag as accelerator |
| `Compact Label Semantics` | High | *"**Badges communicate state while chips or tags represent values**… Don't make every pill clickable or encode status with colour alone"* | Splits the card's five identical pills into two ranks |
| `Compact Label Overflow` | High | *"A badge chip or pill label should stay whole on one line… Don't let one compact label wrap to a second line"* | `whitespace-nowrap` + `min-w-0` on every meta token |
| `Chip Collection Reflow` | High | *"Wrap the collection or use an operable +n disclosure… Don't force all chips into one clipped row"* | Meta row wraps; nothing clipped |
| `Content Jumping` | High | *"Reserve appropriate space… **stable count slot for badges**. Bad: badge insertion pushes toolbar actions"* | Fixed-width count and score slots |
| `Contextual Live Badge Updates` | High | *"Use **one** appropriate atomic status message… Don't announce a bare number or **make every badge a competing live region**"* | One board-level `role="status"`; per-column ones removed |
| `Loading Indicators` | High | *"**Stable skeleton** or progress **with `aria-busy`**. Bad: flickering spinner or frozen UI"* | Board-shaped skeleton replaces the "Loading…" line |
| `Horizontal Scroll` | High | *"Don't: content wider than viewport"* | Column rail scrolls; the page never does |
| `Gesture Conflicts` | Medium | *"Avoid horizontal swipe on main content. Good: **vertical scroll primary**. Bad: horizontal swipe carousel **only**"* | Below `md`, one column at a time, vertical scroll |
| `Pull to Refresh` | Low | *"Good: `overscroll-behavior: contain`"* | Applied to every scrolling column |
| `Deep Linking` | Medium | *"**URLs should reflect current state for sharing**… Don't: static URLs for dynamic content"* | Focus filter and active column move into the query string |
| `Empty States` | Medium | *"Show helpful message and action. Don't: blank empty screens"* | Designed per-column empty state |
| `Focus Not Obscured (Minimum)` | High | *"Offset sticky UI with scroll-padding"* | Sticky column headers get `scroll-margin` |
| `Target Size (Minimum)` | High | *"24×24 CSS px pointer targets"* | Handle and move button both ≥24px paint, ≥44px hit area |
| `Colour Only` | High | *"Use icons/text in addition to colour"* | Every state token is icon **and** word; the spine is redundant |

### `--stack html-tailwind` (`08-stack-tailwind.md`)

- **Compact label layout** (High): *"Use `flex flex-wrap gap-2` for collections;
  for one label use `whitespace-nowrap` bounded `min-w-0 truncate` and
  `shrink-0` controls. **Bad:** `flex h-8 overflow-hidden`."*
- **Focus visible** (Medium): *"`focus-visible:ring-2`… Bad: `focus:ring-2`
  (shows on click too)."* — the base layer already uses `:focus-visible`.
- **Grid gaps**: *"Use consistent `gap` utilities. Bad: margins on individual
  items."*

### `--domain react` (`07-color-icons-stack.md`)

- **Memoized Components** (Medium): *"Extract expensive work into memoized
  components for early returns."* → the card is `memo()`d; a board of 40 cards
  re-rendered on every drag frame is the realistic worst case.
- **Derived State** (Medium): *"Use derived boolean state.
  Good: `useMediaQuery('(max-width: 767px)')`. Bad: `useWindowWidth()`."* →
  the existing `useMediaQuery` is the endorsed shape and is kept.
- **Use keys properly** (High, `--stack react`): stable ids as keys.

### `icons` (`07-color-icons-stack.md`)

`icon-context-accessibility` returns the same normative guidance as #308:
one visual family per surface; decorative-beside-text → `aria-hidden`;
interactive → accessible name plus state. Adopted. The Phosphor/Heroicons
library recommendation stays deferred for the reason recorded in Master §9 —
lucide-react is the app-wide family and swapping it on one surface would break
exactly the "one family per surface" rule the same record states.

---

## 4. Zero-result and retry log

Per the skill's Query Contract, retries are recorded rather than hidden.

| Query | Result | Action |
|---|---|---|
| `reorder live region announcement --domain ux` | 1 result, on-topic (`Contextual Live Badge Updates`) | Accepted |
| `drag handle affordance grab cursor --domain ux` | 3 results, 2 off-topic (Truncation, Input Affordance) | Only the on-topic `Dragging Movements` record used; the off-topic pair is left in the transcript rather than deleted |
| `scroll snap paging columns --domain ux` | Returned generic scroll/motion records, no scroll-snap record | **No verified match for scroll-snap paging.** No scroll-snap carousel is implemented; the decision falls back to `Gesture Conflicts`, which *is* a verified match |
| `productivity tool task status --domain color` | Returns the legacy teal palette | Recorded, not applied (§2) |

No search in this round returned 0 results, so the skill's 0-result fallback
path was not entered.

---

## 5. Board defects the research identifies

Each is a rule violation with a named source, not a taste judgement. This is the
inventory the redesign is measured against.

| # | Previous board behaviour | Rule |
|---|---|---|
| 1 | Board capped at `max-w-6xl` inside a full-width main region; the rightmost column is clipped at 1440 | `Data-Dense Dashboard` (*maximum data visibility*) |
| 2 | The whole page scrolls; column headers scroll away with the content | `Data-Dense Dashboard` (*sticky headers*) |
| 3 | canvas → column slab → card → blocker box: four nested bordered surfaces | Master §13.2 *card-in-card-in-card* |
| 4 | Five identically-styled pills per card mixing state, values and metrics | `Compact Label Semantics` |
| 5 | Per-column empty state carried `role="status"` — one live region per column | `Contextual Live Badge Updates` |
| 6 | Loading rendered a bare "Loading…" line, so the board popped in | `Loading Indicators`, `Content Jumping` |
| 7 | Focus filter and mobile column selection lived only in `useState` | `Deep Linking` |
| 8 | Drag handle occupied the card's top-left — the strongest position — for the least important control | Master §3 (*position is the strongest channel*) |
| 9 | Both card actions painted at full strength at rest, competing with the title | `Micro-interactions` (`@media (hover: hover)`), Master §3 |
| 10 | Dragged card translated inside the list with no floating representation | Master §6 (*dragged item genuinely floats*) |
| 11 | Column scroll chained to the page | `Pull to Refresh` (`overscroll-behavior: contain`) |
| 12 | Move control used a `MoveHorizontal` (↔) glyph, which reads as *resize* | `icon-context-accessibility` (*most semantically precise icon*) |

---

## 6. Contrast verification

No new colour values are introduced by this redesign — every board token is an
existing v2 semantic role. The verifier is re-run unchanged as a regression
check:

```bash
python3 design-system/tracker-v2/research/contrast-check.py
```

**140 checks, all passing.**

---

## 7. Transcript index

| File | Contents |
|---|---|
| `01-product.md` | Three `product` framings of the board |
| `02-ux-drag-drop.md` | Drag/drop interaction design, incl. WCAG 2.2 `Dragging Movements` |
| `03-ux-density.md` | Information density, scanning, compact-label semantics |
| `04-ux-responsive.md` | Horizontal scroll, gesture conflicts, breakpoints, sticky/focus |
| `05-ux-keyboard-states.md` | Keyboard access, empty/loading/optimistic states |
| `06-style.md` | Style searches: Swiss, Data-Dense Dashboard, Micro-interactions, rejections |
| `07-color-icons-stack.md` | Palette re-derivation, icon guidance, React render rules |
| `08-stack-tailwind.md` | Tailwind implementation guidance |
| `09-ux-controls.md` | Filters, undo, deep linking |
| `skill-output/design-system-runs.md` | Raw `--design-system` output, unmodified |
