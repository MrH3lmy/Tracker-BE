# Tracker — Design System (MASTER)

Generated for issue #296 (Project Command Center + readiness UX). The `ui-ux-pro-max`
Claude Code plugin named in the issue could not be installed in this session — both
`claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` and
`npm install -g ui-ux-pro-max-cli` were refused by the session's auto-mode safety
classifier (installing/executing an unverified third-party package during an
unattended run), and the plugin is not present in the vetted claude.ai catalog either.
This document runs the same *workflow* the issue describes by hand: product framing,
explicit design dials, a persisted Master + per-page override structure, and focused
interaction research — applied on top of Tracker's real, already-solid design system
rather than a generic template.

## 1. Product framing

**Product query:** personal productivity project operating system, task planning
dashboard.

Tracker is, in one line: **a personal project operating system** — task manager +
project command center + notes/knowledge workspace + daily planning cockpit, for one
user managing their own work. It is not a team PM tool (no assignees, no multi-user
permissions surface visible in the UI) and not a note-taking app with tasks bolted on.
Every screen should answer, within seconds: *what do I work on now, what's blocked and
why, what's happening in this project, what changed.*

Non-goals this pass: no new visual language, no new component library, no backend
changes beyond what's needed to consume already-shipped contracts (today, readiness,
project today/activity, typed notes — see `API_DOCS.md` / `CLAUDE.md` package map).

## 2. Existing system audit (reuse, don't replace)

Audited before designing anything (`frontend/src/components/ui`, `styles/theme.css`,
`theme.ts`, `router/routes.tsx`, `TodayPage.tsx`, `ProjectDetailPage.tsx`,
`components/notes/*`, `components/tasks/*`):

- **Stack**: Tailwind v4 (`@tailwindcss/vite`), Radix primitives (Tabs, Dialog,
  Popover, Dropdown, Collapsible), `lucide-react` via a single curated re-export
  (`components/ui/icons.ts`) — no emoji icons anywhere, no ad-hoc icon imports.
- **Design tokens** (`styles/theme.css`, five themes: Light Modern, Midnight Pro,
  Aurora, Ocean Breeze, Forest, switched via `[data-theme]`): semantic color roles
  (`brand`/`brand-soft`/`brand-hover`, `positive`/`caution`/`critical` + `-soft`
  pairs, `neutral`/`neutral-soft`, `fg`/`fg-muted`/`fg-subtle`, `card`/`glass`/
  `raised`/`inset`/`canvas`, `line`/`line-strong`, `scrim`), a radius scale
  (`xs`→`2xl`), a shadow scale incl. brand glow, and **motion tokens**
  (`--duration-fast/base/slow`, `--ease-standard`) plus a z-index scale
  (`dropdown`/`sticky`/`overlay`/`toast`).
- **Primitives** (`components/ui`): `Card`/`CardHeader`, `Badge` (6 variants:
  neutral/brand/positive/caution/critical/outline), `Tabs*` (Radix, active state =
  `bg-card` chip inside an `bg-inset` track), `SegmentedControl`, `EmptyState`
  (icon + title + description + action — already the "empty states teach the next
  action" pattern the issue asks for), `QueryState` (loading/error/empty one-liner),
  `Drawer`/`Dialog`/`Popover`/`Menu`, `Field`/`Input`/`Select`/`Textarea`/`Checkbox`.
- **Navigation**: `SectionTabs` — a small `NavLink`-based tab row already used to
  group "views of the same data" under one primary nav item (Tasks: List/Board/
  Matrix/Projects; Calendar: Month/Week/Day/Auto-plan). This is the existing pattern
  for exactly the kind of sub-navigation the Project Command Center needs.
- **Verdict**: this system is already professional, token-driven, and accessible in
  intent (semantic roles, not raw colors). The job is to **extend** it — a couple of
  new semantic primitives for readiness (see §5) and page composition — not replace
  any of it. No Tailwind config forked, no new icon set, no new color tokens besides
  the ones §5 explicitly justifies.

## 3. Design dials

| Dial | Value | Why |
|---|---|---|
| Variance | 5/10 | Enough distinctiveness for a command-center feel (section headers with real hierarchy, a timeline rail, readiness treated as a first-class visual concept) without inventing a new visual language on top of five existing themes. |
| Motion | 3/10 | "Restrained animation" + `prefers-reduced-motion` requirement. Reuse `--duration-fast`/`--ease-standard` for hover/focus/expand only. No page-transition choreography, no decorative motion. Disclosure (blocked-reason expand, tab switch) gets a fast opacity/height transition and nothing else. |
| Density | 7/10 | Information-dense but scannable: today/task rows stay single-line with progressive disclosure for blockers; the command center overview is a stat/summary grid, not a slide. Held at 7 rather than 8 because mobile (375px) needs the same content without cramming — density adapts down on small screens (stacked cards, disclosure collapsed by default) rather than shrinking type. |

These match the issue's suggested starting point; no adjustment was needed.

## 4. Information hierarchy rules (apply everywhere)

1. **Workflow status ≠ derived readiness.** `Status` (NOT_STARTED/IN_PROGRESS/
   WAITING/BLOCKED/DONE/CANCELLED/ARCHIVED) is a manual field the user sets.
   `ready`/`blocked`/`blockers[]` is a computed dependency-graph fact from the
   backend. These are rendered with **visually distinct chip families** (see §5) so
   a task manually marked `WAITING` is never confused with a task the backend has
   computed is `BLOCKED` on another task. Never merge them into one badge.
2. **Explain, don't decorate.** A `BLOCKED` chip is only ever accompanied by (or one
   click from) the actual blocker list. No status badge exists without a reason a
   user can reach in ≤1 interaction.
3. **Progressive disclosure over badge pileup.** A task row shows at most: title,
   one readiness indicator, one due/overdue indicator, importance star. Everything
   else (full blocker list, activity metadata, note type detail) sits behind a
   click/expand — this is the direct answer to "five badges on every card."
4. **Today ordering is server truth.** The client never re-sorts or re-derives
   `todayReason`/overdue/ready — it groups the backend's already-ordered array by
   `todayReason` + `blocked`, preserving intra-group order.

## 5. New semantic primitives

Two small additions, both composed from existing tokens (no new colors):

- **`ReadinessBadge`** (`components/tasks/ReadinessBadge.tsx`) — renders `Ready`
  (positive-soft, `CheckCircle2`) or `Blocked` (caution-soft, `AlertTriangle`) *only
  when the value is worth surfacing* (a task that's simply not blocked and has no
  dependents renders nothing — avoids badge noise on the 90% common case). Text
  label always present alongside color/icon (status never color-only, per a11y
  rule). Deliberately a different shape/variant family from `taskStatusVariant`
  Badges so it reads as "a different axis," reinforcing rule #1.
- **`BlockerDisclosure`** (`components/tasks/BlockerDisclosure.tsx`) — a
  `Collapsible`-based (existing Radix wrapper) "Waiting for →" list under a blocked
  task, each blocker a link to `/tasks/{id}` when practical, showing the blocker's
  own status Badge. Collapsed by default in dense lists (Today, Project Tasks),
  expanded by default in single-task contexts (Task Detail).
- **`NoteTypeBadge`** (`components/notes/NoteTypeBadge.tsx`) — outline-family Badge,
  one fixed icon+label per `NoteType` (GENERAL/MEETING/RESEARCH/TECHNICAL/
  REQUIREMENTS/DECISION/RETROSPECTIVE), reusing existing icons where semantically
  apt (`Sparkles` for decision, `Users`-less — see icon audit below) rather than
  inventing new colors per type.
- **Activity timeline row** (`components/projects/ActivityTimelineItem.tsx`) — an
  icon-in-circle + summary + relative time row (visually related to the existing
  `TimelineCard` pattern in `TodayPage.tsx`), with metadata behind a small
  "Details" disclosure instead of raw JSON.

No new icons needed beyond what's already curated in `components/ui/icons.ts` plus
a small, justified addition (`Link2`/`ArrowRight` already exist for navigable
references; `History`/`ListChecks`/`Users` types get added to the curated icon
export only if a note-type/activity mapping genuinely needs one — see
`pages/project-command-center.md`).

## 6. Responsive & accessibility acceptance criteria (binding for every phase)

- Breakpoints checked: 375 / 768 / 1024 / 1440. No horizontal scroll on the page
  body; wide content (activity metadata, long blocker lists) scrolls in its own
  container if needed.
- Command Center navigation: `Tabs`/`SectionTabs` reflow to a horizontally
  scrollable strip below ~768px rather than wrapping or truncating labels (see
  `pages/project-command-center.md` §Navigation).
- Contrast: reuse only existing token pairs already proven at ≥4.5:1 in both
  light and dark themes (`fg`/`fg-muted` on `card`/`canvas`, `*-soft` backgrounds
  with their matching foreground token) — no new raw hex values.
- Every interactive target ≥44×44px on touch; hover-only affordances are never the
  only way to reach an action (menus/disclosures open on tap/click, not hover).
- Keyboard: all new disclosures/badges-as-buttons are real `<button>`/`<a>`
  elements with visible focus rings (existing `focus-visible` treatment on
  `Button`/`TabsTrigger` — reused, not reinvented).
- `prefers-reduced-motion`: reuse the existing app-wide handling (durations
  collapse via CSS media query already present in `theme.css`); no
  animation is added outside `--duration-*` tokens.

## 7. Page docs

- [`pages/today.md`](pages/today.md) — Today v2 section hierarchy and readiness
  presentation.
- [`pages/project-command-center.md`](pages/project-command-center.md) — Command
  Center tab structure, Overview composition, Project Today/Notes/Activity.
- [`pages/notes.md`](pages/notes.md) — typed project notes, note-type visual
  treatment, structured action → task conversion UX.
- [`pages/activity.md`](pages/activity.md) — activity timeline scanning pattern.

## 8. Research notes

See [`research/interaction-notes.md`](research/interaction-notes.md) for the
focused-topic pass (blocked-task disclosure, ready status, dashboard hierarchy,
timeline scanning, responsive tabs, async states, badge/chip accessibility,
keyboard focus, list density, cockpit layout) and how each maps to a concrete
decision in this repo.
