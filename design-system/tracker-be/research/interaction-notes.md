# Focused interaction research — actual tool output

Real results from the UI UX Pro Max search database (`--domain ux` unless noted). Full raw
transcripts: `tool-transcripts/03-focused-searches.md` and `tool-transcripts/04-icons-retry.md`.
Each entry below is the top verified result plus the concrete decision it drove.

## Blocked task explanation, progressive disclosure
Query returned one match (Typography/Heading Line Balance - not a strong fit; the database has
no dedicated "progressive disclosure" entry for blocked-state explanation specifically, noted
as a fallback per the skill's "no verified match" rule). Decision made from the closer badge/chip
+ keyboard-focus results below instead: blocked never shows without its blockers one interaction
away (`BlockerDisclosure`, collapsed in dense lists, expanded on Task Detail).

## Ready task, actionable status
Top results: "Submit Feedback" (show loading → success/error, not blocked) and "Contextual Live
Badge Updates" (announce badge/count changes as one atomic status message, not a bare number;
`<span role="status" aria-atomic="true">3 items in cart</span>` as the good example). Applied:
the Ready panel's count is a plain visual `font-mono` readout, not a live region that would
re-announce on every task completion - matches "don't make every badge a competing live region."

## Dashboard information hierarchy
Top results: "Color Only" (never convey state by color alone - already true, every readiness/
status indicator pairs an icon or text with its color), "Heading Hierarchy" (sequential h1-h6,
never skip levels - the new Ready/Blocked panel headings are real `<h3>`s, not styled `<div>`s).

## Activity timeline scanning
Top result: "Font Size Scale" - consistent modular type scale aids scanning. Applied via the new
`font-mono tabular-nums` treatment for every numeric/date readout (stat counts, due-date badges,
progress percentage) so numbers align and scan consistently, distinct from body text.

## Responsive tabs / mobile navigation
Top results: "Mobile First" (default mobile styles, add breakpoints upward) and "Table Handling"
(`overflow-x-auto` wrapper for content that can't reflow). Applied: the Command Center's
`TabsList` scrolls horizontally (`overflow-x-auto` + per-trigger `!flex-none`) rather than
cramming six tabs to fit, exactly the "wide content scrolls in its own container" pattern.

## Loading / empty / error states
Top results: "Empty States" (helpful message + action, not blank space), "Loading States"
(skeleton/spinner feedback, never a frozen UI), "Error Messages" (`role="alert"` or `aria-live`,
never color-only). Applied via the existing `EmptyState`/`QueryState` components, reused
unchanged across every new panel/tab.

## Badge / chip accessibility
Top results: "Compact Label Overflow" (`nowrap` + shrinkable label + full-value disclosure to
keyboard/touch, never a hover-only tooltip) and "Contextual Live Badge Updates" (see above).
Confirms the existing `Badge` component's approach (always renders full text, `truncate` +
`min-w-0`, no hover-only affordance) was already correct.

## Keyboard focus, interactive status
Top results: "Compact Control Semantics" (a real `<button>` with `aria-pressed`/`aria-expanded`
matching its visible label, never a clickable `<div>`), "Focus States" (visible ring on every
interactive control, never `outline-none` without a replacement), and WCAG 2.2 AAA "Focus Not
Obscured". Every new clickable element (readiness instrument buttons, blocker links, tab
triggers) is a native `<button>`/`<a>` reusing the app's existing `focus-visible` ring token.

## Task list information density
Top result: "Color Only" again (recurring guideline, applies here too - readiness/status never
color-only in list rows either).

## Project cockpit dashboard layout
Top results: "Fixed Positioning" (account for safe areas / other fixed elements), "Stacking
Context", "Viewport Units" (`min-h-dvh`/`min-h-screen`, not bare `100vh`, on mobile). None of the
new layout uses fixed positioning or a hardcoded viewport height, so no change needed - noted as
verified-clean rather than skipped.

## Icons (status/warning/success)
Recommended library: Phosphor. Not adopted - see `REDESIGN-296.md` §2 for why (one visual family
per surface; lucide already covers every semantic icon requested).

## Stack: React
Top results: profile before optimizing (React DevTools Profiler), colocate related files, keep
components small/focused. No code changes driven directly by this search; consistent with
existing patterns already in the codebase (feature-folder colocation under `components/tasks`,
`components/projects`, etc.).

## Stack: html-tailwind (chip/badge overflow)
Top result: `flex flex-wrap gap-2` for a collection of chips; for a single label,
`whitespace-nowrap` + `min-w-0 truncate` + `shrink-0` on any dismiss/icon control. Matches the
existing `Badge`/`ReadinessBadge` implementation already in this codebase.
