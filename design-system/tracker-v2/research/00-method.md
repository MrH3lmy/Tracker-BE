# UI UX Pro Max research method and log — #308

Skill: <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>, cloned at HEAD and
run via its own `scripts/search.py` against its bundled datasets (79 searchable
styles, 192 palettes/reasoning profiles, 74 font pairings, 119 UX guidelines, 105
icons, 22 stacks).

Every transcript in this directory is verbatim tool output. Nothing here was
written by hand and attributed to the skill.

---

## 1. Step 1 — requirements and stack detection

Per the skill's workflow, stack is detected from the project rather than assumed.

- `frontend/package.json` → **React 19 + Tailwind v4 + Radix + lucide-react**,
  Vite, react-router-dom v7, TanStack Query.
- **Product type:** single-user work-management workspace — tasks (list / board /
  matrix / projects), habits, block-based notes, calendar with planning, insights,
  search, settings, import.
- **Context:** many short sessions per day; comparison-heavy; light *and* dark
  both first-class.

Stack searches used: `--stack html-tailwind`, `--domain react`.
(`--stack react` with a layout query returned 0 results; retried as `--domain
react`, per the skill's zero-result rule.)

---

## 2. Step 2 — design-system generation, and why its verdict was not taken as-is

| Run | File | Query | Result | Verdict |
|---|---|---|---|---|
| A | `01` | `personal productivity work management workspace` | Scroll-Triggered Storytelling / Motion-Driven / Caveat + Quicksand | **Off-topic.** A landing-page narrative pattern and handwritten fonts. Retried per the Query Contract. |
| B | `02` | `task management dashboard productivity SaaS` | Flat Design / Plus Jakarta Sans / teal `#0D9488` + orange `#EA580C` | On-product. `risk:low`, `cost:low`. |
| C | `03` | `information dense data workspace application` | Data-Dense Dashboard / Fira Code + Fira Sans / `#1E40AF` + amber | On-product. `risk:low`, `cost:low`. |
| D | `03` | `personal planner habit tracker notes calendar` | Children's/creative palette + handwritten pairing | Off-product. |
| E | `04` | `focus writing knowledge workspace calm minimal` | Neumorphism / wellness lavender | Off-product; neumorphism is low-contrast by construction. |
| F | `04` | `keyboard driven professional software tool` | Dark Mode (OLED), dark-only | Fails the light-mode requirement. |

**The finding that changed the approach.** Run B reproduces
`design-system/tracker-be/MASTER.md` *exactly* — same style, same font pairing,
same teal primary and orange accent. Run C returns the Fira Code / Fira Sans
pairing the application actually ships.

The legacy design *is* the output of these searches. Since #308 forbids starting
from the legacy design, taking the generator's verdict alone would have
re-derived the thing being replaced. The research was therefore widened into the
component domains, where the option space is visible and each choice can be
justified on its own.

The generator's raw persisted output is kept unmodified at
`skill-output/MASTER.md` so the verdict remains reviewable.

---

## 3. Step 3 — component-domain searches

### `style` (files `05`, `06`, `07`)

`"productivity workspace application shell"` returned **0 results**; retried
narrower as `"dense productivity app dashboard"` per the zero-result rule.

| Style | Light+Dark | Perf | A11y risk | Outcome |
|---|---|---|---|---|
| Data-Dense Dashboard | ✓ | `cost:low` | `risk:low` | **Density doctrine adopted** |
| Flat Design | ✓ | `cost:low` | `risk:low` | **Surface doctrine adopted** |
| Adobe Spectrum | ✓ | `cost:moderate` (blur) | `risk:conditional` | Rejected — scope-locked to `react-spectrum` / `spectrum-web-components` |
| Shopify Polaris | ✓ | `cost:moderate` (blur) | `risk:conditional` | Rejected — "Keep scope tied to Shopify surfaces" |
| Liquid Glass | ✓ | `cost:moderate` (blur) | `risk:conditional` | Rejected — Apple-platform chrome; translucency costs contrast |
| Bento Box Grid | ✓ | — | — | Rejected — card-heavy, which #308 names as not-to-preserve |
| Neumorphism | — | — | `risk:conditional` | Rejected — low contrast by construction |
| E-Ink / Paper | ✓ | `cost:low` | `risk:low` | Rejected — `transition: none` removes required interaction feedback |
| Dark Mode (OLED) | dark only | — | — | Rejected — fails light mode |

Flat Design and Data-Dense Dashboard are the only two `risk:low` + `cost:low`
styles supporting both modes for this product class. The selected direction
composes them: Data-Dense density, Flat surfaces.

### `color` (files `09`, `10`, `11`)

- `Productivity Tool` → "Teal focus + action orange", background `#F0FDFA` — the
  legacy palette.
- **`Knowledge Base/Documentation` → "Neutral grey + link blue"**, background
  `#F8FAFC`, accent `#2563EB`. **Selected.**
- `Portfolio/Personal` → "Monochrome + blue accent", `#18181B` + `#2563EB`.
  Independent corroboration: two records converge on neutral chrome plus one blue.

This is the substantive break from legacy and the origin of principle P1 in
`MASTER.md`: the chrome stops consuming the colour budget so state can have it.

### `typography` (files `12`, `13`)

Three separate pairings return **Inter** for this product class:

- `Minimal Swiss` — "Dashboards, admin panels, documentation, enterprise apps,
  design systems". **Selected.** Note: *"Single font family with weight
  variations. Ultimate simplicity."*
- A cross-platform system-UI pairing — "dashboards, system UI, icon-heavy interfaces".
- A precision/technical pairing — "high-end productivity apps".

`Dashboard Data` (Fira Code / Fira Sans) is the legacy pairing and is aimed at
analytics/BI rather than task execution.

Combined with the `number-tabular` guideline, Inter's own `tabular-nums` covers
the data case, so the legacy two-family UI system collapses to one.

### `ux` (files `08`, `14`, plus `references/quick-reference.md` §1, §2, §5, §6, §9)

§9 Navigation Patterns is what actually drove the shell. See §4 below.

### `icons` (files `15`, `16`)

`icon-context-accessibility`: **Phosphor (primary) + Heroicons (fallback)**;
*"Keep one visual family per surface"*; context semantics for decorative /
meaningful / interactive icons. Normative content adopted; library swap
deliberately deferred — rationale in `MASTER.md` §9.

---

## 4. Shell defects the research identified

Each is traceable to a named rule, and each is fixed by the new shell.

| # | Previous behaviour | Rule |
|---|---|---|
| 1 | Nine flat sidebar items mixing workspaces with utilities | `nav-hierarchy` |
| 2 | Collapsed sidebar was icon-only (labels in `sr-only`) | `nav-label-icon` |
| 3 | Bottom bar **+** an inline duplicate of the whole sidebar **+** in-page tabs, all live at once | `avoid-mixed-patterns` |
| 4 | Quick add occupied one of five bottom-*navigation* slots | `bottom-nav-top-level` |
| 5 | `/tasks/projects/:id` and `/notes/:id` had no orientation | `breadcrumb-web` |
| 6 | Search was the 7th of 9 sidebar items | `search-accessible` |
| 7 | Log out sat inline between the bell and the user's name | `destructive-nav-separation` |
| 8 | Focus never moved to main on route change (`tabIndex={-1}` set but never focused) | `focus-on-route-change` |
| 9 | Sticky header and bottom bar could cover a focused control | `focus-not-obscured` (WCAG 2.2 AA) |
| 10 | `SectionTabs` put `role="tablist"`/`role="tab"` on navigating links with no `tabpanel` | ARIA misuse |

---

## 5. Contrast verification

`contrast-check.py` in this directory is executable and covers every
foreground/background pair in all five themes.

**A real failure surfaced.** `line-strong`, the legacy border token, measured
**1.42:1** in light and **1.82:1** in dark — fine for a decorative divider, but
the legacy system used the same token for control boundaries, where WCAG 1.4.11
requires 3:1. In a flat system the border *is* the affordance, so the tokens were
split: `line` (decorative) and `line-control` (operable, ≥3:1 — `#7C8BA1` light at
3.46:1, `#64748B` dark at 3.75:1).

Final: **140 checks, all passing.**

```bash
python3 design-system/tracker-v2/research/contrast-check.py
```

---

## 6. Transcript index

| File | Contents |
|---|---|
| `01-design-system-A.md` | Run A (off-topic) and the retry decision |
| `02-design-system-B.md` | Run B |
| `03-design-system-C-D.md` | Runs C and D |
| `04-design-system-E-F.md` | Runs E and F |
| `05-style.md` | Style searches, incl. the 0-result query |
| `06-style-retry.md` | Narrowed style retry |
| `07-style-admin.md` | Full records for the vendor systems |
| `08-ux-navigation.md` | Navigation UX searches |
| `09-color.md`, `10-color-neutral.md`, `11-color-kb.md` | Palette searches |
| `12-typography.md`, `13-typography-detail.md` | Typography and Google Fonts |
| `14-ux-states.md` | Empty/loading, reduced motion, focus, search, density |
| `15-icons-stack.md`, `16-icon-guideline.md` | Icons and stack guidance |
| `skill-output/MASTER.md` | Raw `--design-system --persist` output, unmodified |
| `contrast-check.py` | Contrast verifier |
