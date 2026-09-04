# Tracker Design Foundation v2 — "Neutral Workbench"

**Status:** Active. This is the source of truth for all Tracker UI work.
**Supersedes:** `design-system/tracker-be/` (the "Cockpit" system), which is retained
as historical reference only. No value in this document is inherited from it.
**Established by:** #308, the Phase 0 foundation of the app-wide revamp roadmap #317.
**Design authority:** [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
Every research transcript is in `research/`; the raw generator output is in
`research/skill-output/MASTER.md`.

---

## 0. How this was chosen

The skill's `--design-system` generator was run six times across different framings
of the product. Two runs came back on-product and four did not (a storytelling
landing pattern, a children's/creative pairing, wellness neumorphism, and a
dark-only OLED system). See `research/00-method.md` for the full log.

The finding that shaped this document: **the two on-product generator runs
reproduce the legacy system.** Run B returns Flat Design + Plus Jakarta Sans +
teal `#0D9488`, which is `design-system/tracker-be/MASTER.md` verbatim; run C
returns the Fira Code / Fira Sans pairing the app actually ships. Accepting the
generator's verdict alone would have re-derived exactly what #308 says not to
start from.

So the direction was composed from the component domains instead — `style`,
`color`, `typography`, `ux`, `icons` — where the option space is visible and each
choice is individually justified.

---

## 1. Product design principles

Tracker is a single-user work-management workspace: tasks across four views,
projects, habits, a block-based notes editor, a calendar with planning, insights,
and search. The user opens it many times a day, for short bursts, to answer
"what now?" and to record what happened.

**P1. Chrome is neutral. Colour means state or action, never decoration.**
The governing rule. The legacy system spent its colour budget tinting the chrome
itself — a teal canvas, teal borders, teal insets. In an information-dense
tracker that budget belongs to *state*: overdue, blocked, at risk, streak health,
priority. Every theme below is the same neutral slate chrome carrying a different
accent hue.

**P2. Density is a feature, not a compromise.**
Density dial 8/10. Users compare many items at once; screen area is the scarce
resource. Spacious layouts here mean scrolling, and scrolling means losing the
comparison.

**P3. Hierarchy comes from structure, not ornament.**
Flat Design: no shadow stacks on inline surfaces, no gradients, no glass.
Difference is carried by border, weight, size and spacing — which survives
greyscale, high-contrast mode, and colour-vision deficiency.

**P4. The shell is furniture.**
Navigation should be findable and then forgotten. It does not compete with
content for attention, and it does not move between pages.

**P5. Nothing critical is signalled by colour alone.**
Every state that matters carries a second channel: an icon, a label, a weight
change, or a shape.

**P6. Every capability is reachable by keyboard and by touch.**
Not as an afterthought pass — as the definition of "done".

---

## 2. Information-density strategy

| Level | Applies to | Rule |
|---|---|---|
| **Chrome** | Shell, top bar, navigation | Tightest. 3.5rem top bar, 3.75rem tab bar, 4pt rhythm. |
| **Lists and tables** | Task lists, note libraries, search results | Dense. Row padding 8–12px; scannable in one pass. |
| **Records** | Task detail, note editor, settings | Comfortable. Reading measure applies (§4). |
| **Empty and error states** | Everywhere | Generous. These are the one place whitespace earns its keep. |

Spacing scale (4pt, per `spacing-scale`): `4 · 8 · 12 · 16 · 24 · 32 · 48`.
Nothing outside this scale without a written reason.

Touch density is not negotiated away by density: every interactive target clears
**44×44px** (`touch-target-size`), even where the visual control is smaller — the
hit area extends beyond the paint.

---

## 3. Visual hierarchy

Ranked by strength, strongest first:

1. **Position** — what sits at the top-left of a region is read first.
2. **Weight** — 600/700 for headings and active state; 400 for body.
3. **Size** — the type scale in §4, never arbitrary sizes.
4. **Contrast** — `fg` → `fg-muted` → `fg-subtle`, a deliberate three-step ramp.
5. **Colour** — last, and only for state or action (P1).

Anti-pattern: reaching for colour to fix a hierarchy that position and weight
should have solved.

---

## 4. Typography

**One family: Inter.** Weight variations only.

Source: the `typography` domain returns Inter three separate times as the top
match for this product class — `Minimal Swiss` ("Dashboards, admin panels,
documentation, enterprise apps, design systems"), a cross-platform system-UI
pairing, and a dashboard/precision pairing. This replaces the legacy two-family
Fira Sans + Fira Code UI system.

Fira Code survives for **code content only** (the notes code block) — a content
font, not chrome.

> **Documented deviation:** an older Tracker used Inter before the Fira change.
> Inter is selected here because the skill's dataset returns it repeatedly for
> this product class, not out of continuity. Letting a previous version veto the
> strongest current match would be the old design constraining the new one in
> reverse.

**Type scale** (`font-scale`, `readable-font-size`):

| Role | Size | Weight | Line height |
|---|---|---|---|
| Page title | 20px | 600 | 1.3 |
| Section heading | 16px | 600 | 1.4 |
| Body / control | 14px | 400 | 1.5 |
| Body (mobile input) | 16px | 400 | 1.5 |
| Secondary | 13px | 400 | 1.45 |
| Label / meta | 12px | 500 | 1.4 |
| Micro (rail label, badge) | 10–11px | 500 | 1.2 |

Body text never goes below 12px. Any `<input>` on mobile stays at 16px, because
iOS auto-zooms below that.

**Numerals.** `font-variant-numeric: tabular-nums` on `th`, `td`, `time`,
`output` and `[data-numeric]` (`number-tabular`), so counts, dates, streaks and
timers do not reflow as their digits change. This is why a second monospace UI
family is unnecessary.

**Measure.** 60–75 characters on desktop, 35–60 on mobile (`line-length-control`).
Applies to prose — note bodies, descriptions, empty-state copy — not to table cells.

**Wrapping.** Prose containers set `overflow-wrap: anywhere` so URLs, IDs and
pasted content reflow instead of forcing horizontal page scroll
(`long-token-wrapping`). Prefer wrapping to truncation; when truncation is
unavoidable, the full value stays available via `title` (`truncation-strategy`).

---

## 5. Colour system

**Palette source:** the `color` domain record `Knowledge Base/Documentation` —
"Neutral grey + link blue" — corroborated independently by `Portfolio/Personal`
("Monochrome + blue accent"). Two records converge on neutral chrome plus a
single blue.

### Semantic roles

Components consume **role tokens only** (`color-semantic`). Raw hex in a
component is a defect.

| Token | Role |
|---|---|
| `canvas` | The page ground |
| `card` | An inline surface sitting on the canvas |
| `inset` | A recessed area within a surface (toolbars, tab strips) |
| `raised` | A surface that genuinely floats (menu, dialog, toast) |
| `fg` / `fg-muted` / `fg-subtle` | The three-step text ramp |
| `line` | Decorative divider — separates, does not identify |
| `line-strong` | Emphasis divider |
| `line-control` | **Boundary of anything operable.** ≥3:1 |
| `brand` / `brand-hover` / `brand-soft` / `brand-fg` | Action and active state |
| `positive` / `caution` / `critical` / `neutral` (+ `-soft`) | State |

### The `line` / `line-control` split

The legacy system used one border token for both decoration and controls. WCAG
1.4.11 requires **3:1** only for boundaries that *identify* a component, but a
flat system has no shadow to fall back on — **the border is the affordance**. So
the tokens are split: `line` stays a quiet divider, and every input, checkbox,
select and outlined button uses `line-control`, verified ≥3:1 on `canvas`, `card`
*and* `inset`.

This split was found by running the verifier, not by inspection: `line-strong`
measured 1.42:1 in light and 1.82:1 in dark.

### Themes

Five themes, all preserved from the previous system as *capability* — the stored
`ui.theme` setting and the Settings picker keep working. Each is the same neutral
chrome with a different accent:

| Theme | Ground | Accent |
|---|---|---|
| Daylight | Neutral light | Blue `#2563EB` |
| Midnight | Neutral dark | Blue `#60A5FA` |
| Aurora | Neutral dark | Violet `#A78BFA` |
| Ocean | Neutral light | Deep cyan `#0E7490` |
| Forest | Neutral light | Green `#15803D` |

Dark themes use **lighter tonal variants, not inverted values** (`color-dark-mode`)
and are contrast-verified independently of light.

### Verification

`research/contrast-check.py` is executable and checks every pair in every theme:
text ≥4.5:1, control boundaries and focus ring ≥3:1. **140 checks, all passing.**
Run it whenever a colour changes:

```bash
python3 design-system/tracker-v2/research/contrast-check.py
```

---

## 6. Spacing, layout and surfaces

- 4pt scale (§2). Breakpoints **375 / 768 / 1024 / 1440** (`breakpoint-consistency`).
- Mobile-first: base styles are the narrow case, breakpoints add (`mobile-first`).
- One container measure for routes that do not paint their own layout: `max-w-6xl`,
  centred (`container-width`).
- `min-h-dvh`, never `100vh` (`viewport-units`).
- No horizontal page scroll at any breakpoint. Wide content (tables, boards,
  timelines) scrolls **inside its own region**, never the page (`horizontal-scroll`).
- Z-index is a fixed scale, not ad-hoc values: `--z-dropdown: 30`, `--z-sticky: 40`,
  `--z-overlay: 50`, `--z-toast: 60` (`z-index-management`).
- Shell metrics are variables (`--shell-topbar-h`, `--shell-tabbar-h`,
  `--shell-sidebar-w`, `--shell-rail-w`) so sticky offsets, scroll padding and
  content insets derive from one number and cannot drift (`fixed-element-offset`).

### Elevation

Near-flat by policy. Shadow marks *floating above the page*, nothing else.

| Surface | Treatment |
|---|---|
| Inline surface (card, panel, list) | 1px `line` border, **no shadow** |
| Recessed region | `inset` background, no border |
| Menu, dialog, sheet, toast | `raised` background + `shadow-lg` |
| Dragged item | `shadow-lg` — it genuinely floats |

No translucency or backdrop blur (`--blur-panel: 0`). The two styles that rely on
it were both `risk:conditional` for contrast in the skill's data.

---

## 7. Application shell and navigation

Full architecture and the ten rule-traced defects it fixes: see
`research/00-method.md` §4.

**Three tiers** (`adaptive-navigation`):

| Width | Model |
|---|---|
| ≥1024px | Full sidebar (collapsible to rail) + top bar |
| 768–1023px | Labelled rail + top bar |
| <768px | Top bar + 5-item bottom tab bar + "More" sheet |

**Exactly one navigation mechanism is live at each width** (`avoid-mixed-patterns`),
and its placement never changes between pages (`navigation-consistency`).

**Grouping** (`nav-hierarchy`): primary navigation is split into two *labelled*
groups — **Workspaces** (Today, Tasks, Habits, Notes, Calendar, Insights) and
**Manage** (Search, Settings, Import; plus Developer in dev builds). The groups
are real, not cosmetic: a workspace never appears under Manage.

**Labels are always visible** (`nav-label-icon`). The collapsed rail shows a
micro-label under each icon rather than going icon-only.

**Active state** (`nav-state-active`) is marked by an accent rail *plus* a
background change *plus* a weight change, so it never depends on colour alone,
and carries `aria-current="page"`.

**Bottom bar** (`bottom-nav-limit`, `bottom-nav-top-level`): exactly five slots,
all labelled, all destinations. Quick add is a FAB above the bar, not a tab.
Habits keeps a slot because a check-in is the highest-frequency, shortest-dwell
interaction in the product; Calendar and Insights are long-dwell and sit one tap
away in More.

**Search** is a persistent top-bar field (`search-accessible`), not a list item.

**Breadcrumbs** (`breadcrumb-web`) orient three-level routes, derived from routes
that already exist.

**Destructive separation** (`destructive-nav-separation`): log out lives behind
the account menu, below a separator, styled destructive — never loose in the chrome.

**Secondary navigation** stays in the feature surfaces (`SectionTabs`), visually
distinct from the shell so the two levels never read as one.

---

## 8. Components

**Buttons.** `primary` (filled brand), `secondary` (outlined, `line-control`
border — the border *is* the control), `ghost`, `danger`. All ≥32px tall with a
44px hit area, `cursor-pointer`, and a visible focus ring.

**Inputs.** Always a visible `<label>` — never placeholder-as-label
(`form-labels`). Errors sit next to the field they belong to, not only in a
summary at the top (`error-feedback`). Invalid state carries `aria-invalid` plus
a border change plus text — three channels.

**Navigation.** Links that change the URL are marked up as links, in a `<nav>`,
with `aria-current`. They are **not** `role="tab"` — tabs imply an in-page panel
swap that never happens, and the role suppresses the link semantics that make the
back button and "open in new tab" work.

**Empty / loading / error states.** Every data surface defines all three. Empty
states explain and offer the action that resolves them, never a blank region
(`empty-states`). Loading reserves the space the content will occupy so nothing
shifts (`cls-prevention`). Errors say what failed and what to do next.

---

## 9. Icons

**One visual family per surface**, outline style, SVG only — never emoji.
Decorative icons beside visible text get `aria-hidden="true"`; a meaningful icon
without equivalent text gets a text alternative; an icon control gets an
accessible name and exposes its state (`aria-pressed` / `aria-expanded`).

Sizes: 16px inline with text, 20px in navigation, 24px in a FAB.

> **Documented deviation:** the skill's `icons` guideline names **Phosphor
> (primary) + Heroicons (fallback)**; Tracker uses lucide-react. Its normative
> content — one family per surface, plus the context semantics above — is adopted
> in full. The library itself is not swapped in #308 because it would change icon
> weight on every already-revamped Tasks, Notes and Projects surface, which is
> exactly the feature-level churn #308 excludes. All icons route through
> `components/ui/icons.ts`, so the swap stays cheap if it is later taken up.

---

## 10. Motion

Tier: **Subtle** (motion dial 2/10).

Role-based durations, not one universal value (`motion-timing`):

| Token | Duration | Use |
|---|---|---|
| `--duration-fast` | 100ms | Colour / opacity state change |
| `--duration-base` | 160ms | Small position or size change |
| `--duration-slow` | 220ms | Panel or sheet entrance |

Easing: `--ease-standard: cubic-bezier(0.2, 0, 0, 1)`.

- At most **1–2 animated elements per view** (`animation-restraint`).
- Motion must carry meaning — spatial continuity, state change. Decorative motion
  is a defect.
- Never animate `width`/`height`; use `transform` and `opacity`.
- Infinite animation is for loading indicators only.
- **`prefers-reduced-motion: reduce` collapses all animation and transition
  durations globally and disables smooth scrolling.** Not per-component opt-in.

---

## 11. Focus and keyboard

- **Visible focus on every operable control.** 2px ring at 2px offset in `brand`,
  verified ≥3:1 against `canvas`, `card` and `inset` in all five themes
  (`focus-appearance`).
- **Focus is never obscured** (WCAG 2.2 AA 2.4.11): `scroll-padding-top` and
  `scroll-padding-bottom` reserve the sticky top bar and bottom tab bar, so a
  focused control can never end up underneath them.
- **Focus moves to `<main>` after a route change** (`focus-on-route-change`), with
  a live-region announcement. The previous shell set `tabIndex={-1}` on `<main>`
  and never focused it.
- **Skip link** is first in the tab order and visible when focused.
- Tab order follows visual order. No keyboard traps.
- Modals and sheets are dismissible with Escape and offer a visible close
  (`modal-escape`).
- Every drag interaction needs a single-pointer and keyboard alternative
  (`dragging-alternative`).

---

## 12. Accessibility constraints

Non-negotiable, verified before any UI change ships:

- **WCAG 2.2 AA.** Text ≥4.5:1; control boundaries and focus ring ≥3:1.
- Sequential heading levels, `h1`→`h6`, no skips.
- `aria-label` on every icon-only control.
- No meaning by colour alone (`color-not-only`).
- Touch targets ≥44×44px; pointer targets ≥24×24 CSS px.
- Live regions are **named** when more than one can be present, so page-level
  status is distinguishable from the shell's announcements.
- Text scales to 200% without loss of content or function; no zoom disabling.
- `prefers-reduced-motion` and `prefers-contrast: more` both honoured.
- Verified at **375 / 768 / 1024 / 1440**, in light *and* dark.

---

## 13. Anti-patterns for Tracker

Specific things not to do in this product:

1. **Tinting the chrome.** Colour belongs to state. A teal or blue canvas spends
   the budget that overdue and blocked need.
2. **Card-in-card-in-card.** A bordered surface inside a bordered surface inside a
   panel. Use one surface and structure within it.
3. **Shadow as decoration.** If it does not float, it does not get a shadow.
4. **`role="tab"` on navigation links.** They change the URL; they are links.
5. **Icon-only navigation.** Including collapsed states.
6. **Placeholder as label.**
7. **A second colour system for charts.** Data visualisation draws from the same
   semantic tokens.
8. **Status by colour alone** — the red/green dot with no icon or text.
9. **Adding a navigation mechanism** instead of fixing the one that exists. The
   previous shell ran three at once on mobile.
10. **Raw hex in a component.**
11. **New spacing values** outside the 4pt scale.
12. **Horizontal page scroll** to fit a wide table. The region scrolls, not the page.
13. **Blocking the browser back button** or breaking a deep link.
14. **Emoji as icons.**

---

## 14. Using this document

When building a surface:

1. Read this file.
2. Check `pages/<surface>.md` if it exists — its rules override this file.
3. Run the skill's own research for that surface (roadmap #317 requires it per PR).
4. Run `research/contrast-check.py` if any colour changed.
5. Verify at 375 / 768 / 1024 / 1440, light and dark, keyboard-only.

`design-system/tracker-be/` is history. Do not consult it for design decisions —
only to inventory functionality that must not be lost.
