# Issue #310 — Habits & Habit Analysis redesign: design research (Lane D)

> **Provenance note:** The "UI UX Pro Max" skill named in issue #310 is **not installed in this
> session**. Nothing below is skill output. This is **structured design research (UI UX Pro Max
> skill unavailable in session)** — first-principles product/UX reasoning grounded in a direct read
> of the existing backend contracts and frontend surfaces. Whoever implements #310 should either
> install the skill and re-run its research, or cite this document explicitly as the substitute and
> say so in the PR. Do not present this as skill output.

Read-only research. No production code was modified. This file lives outside the repo working tree
on purpose so it cannot contaminate the #309 PR.

---

## 1. Capability inventory (what the backend actually supports)

Source of truth read for this research:

- `/home/user/Tracker-BE/src/main/java/com/taskpriority/habit/HabitController.java`
- `/home/user/Tracker-BE/src/main/java/com/taskpriority/habit/HabitService.java`
- `/home/user/Tracker-BE/src/main/java/com/taskpriority/habit/HabitResponse.java`
- `/home/user/Tracker-BE/src/main/java/com/taskpriority/habit/CreateHabitRequest.java`
- `/home/user/Tracker-BE/src/main/java/com/taskpriority/model/Habit.java`
- `/home/user/Tracker-BE/frontend/src/pages/HabitsPage.tsx`, `HabitAnalysisPage.tsx`
- `/home/user/Tracker-BE/frontend/src/components/habits/*` (types, presets, analysis math)
- `/home/user/Tracker-BE/frontend/src/pages/InsightsPage.tsx` (embedded analysis tab)
- `/home/user/Tracker-BE/frontend/src/router/routes.tsx`

**Endpoints (all `/api/v1/habits`):** `GET /`, `GET /{id}`, `GET /history?from&to`,
`POST /`, `PUT /{id}`, `DELETE /{id}`, `PATCH /{id}/check-in`, `DELETE /{id}/check-in`.

**Per-habit data available:** title, description, `area` (WORK/STUDY/PERSONAL/HEALTH/FAMILY),
`important`, `estimatedMinutes`, `dailyTargetCount`, `reminderEnabled`/`reminderTime`,
`createdDate`, `todayCheckInCount`, `todayTargetMet`, and a `recurrence` block
(frequency/interval/daysOfWeek/dayOfMonth/annualDate/nextDueDate/lastCompletedDate/
`currentStreak`/`longestStreak`).

**History:** `GET /history` returns `{habitId, date, count}` rows across *all* habits for a range —
enough for weekly strips and multi-week heatmaps with no new endpoint. There is **no per-habit
history endpoint**; the range query is the only history source and both current pages already
share it.

### 1a. Hard constraints the redesign must respect

| Constraint | Consequence for design |
|---|---|
| `checkIn()` hardcodes `LocalDate.now()`; `undoCheckIn()` deletes only *today's* latest row | **No backdating and no retroactive fixes.** A "tap any day in the week strip to fill it in" interaction is not implementable without a backend change. Past days are **read-only history**. |
| Streak advances inside `checkIn` when target is met, but `undoCheckIn` does **not** roll the recurrence/streak back (`lastCompletedDate`, `nextDueDate`, `currentStreak` stay advanced) | Undo is *not* a full inverse. The UI must not claim "streak restored". Treat undo as "remove one check-in", and let streak text re-derive from the server response rather than optimistically decrementing it. This asymmetry is a genuine backend bug candidate — document it, don't paper over it in the UI. |
| No pause / archive / skip. `DELETE` is a hard delete (`deleteByUserIdAndId`) even though `Habit.deleted` exists | No "pause for vacation" affordance can be offered. Delete stays destructive and needs a confirm step. |
| `reminderEnabled`/`reminderTime` are **stored only** — nothing in the backend schedules or delivers a notification | Reminder UI must be framed as **scheduling metadata** ("Show at 07:00", used for ordering/day planning), never "we'll notify you". Overstating this is a trust bug. |
| Goal "unit" (glasses/pages/km) is **frontend-only**, re-inferred from the title on load (`habitTypes.ts` comment + `HabitCreateForm` `inferHabitUnit`) | A habit created from the "8 glasses of water" preset reloads as "8 times" unless the title happens to infer. Either accept generic counts in the new UI or raise persisting a `unit` field as the one minimal, explicit backend addition. |
| Sorting/filtering is entirely client-side | Free to redesign filter/sort UX with zero backend risk; must keep an equivalent-or-stronger discoverable path for the existing four sorts and the category filter. |

### 1b. Documented backend gaps (raise before implementation, per issue text)

1. **Undo does not reverse recurrence rollover / streak** (correctness; smallest fix is to recompute
   streak state on undo when the day drops below target).
2. **No backdated check-in** (`PATCH /{id}/check-in` could accept an optional `date`), which is the
   single biggest limiter on habit-tracker UX conventions.
3. **Goal unit not persisted** (cosmetic but user-visible data loss).
4. **Reminders have no delivery path** (product gap; the UI should stop implying otherwise).

Recommendation: ship the redesign against the current contract, treat (1) as the only change worth
bundling if the reviewer agrees, and file (2)–(4) as follow-ups. Keep any backend change minimal and
explicit, as the issue requires.

---

## 2. Chosen product direction

**Direction: "Today first, history second, analysis on demand."**

First principles for a habit tracker:

- The daily job is **tiny and repeated** — usually under 15 seconds, often on a phone, often twice a
  day. Cost per check-in dominates everything else in the experience.
- Habit tools are **motivational instruments**, not reporting tools. The main screen's job is to make
  the next action obvious and to make consistency feel visible.
- Analysis is a **weekly or monthly** activity, not a daily one. Mixing dense analytics into the
  daily screen taxes the 95% case to serve the 5% case.

The current `/habits` page violates this: it stacks a stats card, a filter row, a two-column card
grid *and* a full weekly table on one screen, so the daily action competes with three analytical
surfaces. The redesign should invert the ratio.

**Concretely:**

- `/habits` becomes a **focused daily execution surface** — the habits due *today*, in the order the
  user will do them, with a single primary action per habit; everything else (all habits, week
  history, management) is reachable but subordinate.
- `/habits/analysis` stays a **distinct reflective surface** and keeps its URL. It is where the
  multi-week view, completion rates, trends and per-habit comparison live.
- Insights keeps embedding the analysis surface via the existing `embedded` prop contract. Preserving
  that boolean-prop contract is the cheapest way to satisfy "embedded analytics compatibility" — if
  the redesign splits analysis into multiple components, export a single `HabitAnalysisPanel` that
  Insights renders, and document that as the replacement contract.
- Reject the "one mega-page with tabs" restructure: it would force the Insights embed to reach into a
  tab's internals and would push the daily action behind a tab selection.

**Explicitly dropped legacy patterns** (issue forbids using them as references): the emoji-decorated
stat card (🔥/👑 as meaning-bearing glyphs), the `inferHabitIcon` title-guessing emoji, the
two-column HabitCard grid, the separate always-on `WeeklyOverviewTable` under the grid, and the
drawer-with-template-header composition.

---

## 3. Primary Habit workflow

The workflow that the design should optimize, in order of frequency:

1. **Open → see what's outstanding today** (many times/day).
2. **Check in** (the one high-frequency mutation).
3. **Correct a mistap** (undo — rare but must be immediate and adjacent).
4. **Glance at consistency** (streak/week — passive, should require no interaction).
5. **Add a habit** (rare, usually in a burst during onboarding).
6. **Edit / delete** (rare; must not be reachable by accident next to the check-in target).
7. **Analyze** (weekly).

Design consequences:

- Steps 1–3 must be reachable with **zero navigation and zero disclosure**. Steps 5–7 may be one
  interaction away.
- Sort/filter serve step 1, not step 4 — so the default ordering matters more than the control.
  Recommended default: **due-today, not-yet-met first**, then by reminder time, then title. That
  preserves the existing `reminderTime` default sort's intent while making the "what's left" question
  answer itself. Keep name / current-streak / recently-created as alternates.
- Because `nextDueDate` and `daysOfWeek` are available client-side, the page can separate
  **"scheduled today"** from **"not scheduled today"**. Do this — showing a Monday-only habit as an
  un-checked item on Thursday is the single most common false-guilt bug in habit UIs. Non-scheduled
  habits belong in a quieter "not due today" group, still visible (users do check in early), never
  counted as misses.

---

## 4. Check-in UX

**The check-in control is the most important pixel in the feature.** Requirements derived from the
data model:

- **One habit = one primary control.** For `dailyTargetCount === 1` it is a binary commit ("Done").
  For `dailyTargetCount > 1` it is an increment (`+1`) that also reports `n/target` progress. Both
  map to the same `PATCH /{id}/check-in`; only the label and the progress readout differ.
- **Touch target ≥ 44×44 CSS px** and placed on the side of the row where a thumb lands on mobile.
  It must never share an edge with edit/delete.
- **Optimistic, then reconciled.** The server returns the full `HabitResponse`, including
  `todayCheckInCount`, `todayTargetMet` and the recurrence block. Optimistically bump the count for
  perceived speed, but let the response be authoritative for streak text (see the undo asymmetry in
  §1a). On error, roll back and announce the failure.
- **Undo is adjacent and immediate**, not hidden in a menu: once `todayCheckInCount > 0`, expose an
  explicit "Undo" affordance in the same row (and, for count habits, a "−1"). Given that undo does
  not reverse a completed rollover, prefer wording like "Remove last check-in" over "Undo completion".
- **Rapid repeat must be safe.** Counting habits invite five taps in a row; disable-on-pending across
  the whole page (today's `busy` flag pattern) is the wrong model — it freezes every habit while one
  mutation is in flight. Scope pending state **per habit id**.
- **Overshoot is legal.** `checkIn` has no cap; `todayCheckInCount` can exceed the target. Render
  `9/8` honestly rather than clamping the number, while capping the visual meter at 100%.
- **Completion feedback should be quiet and non-blocking.** No modal, no confetti that blocks input,
  and any celebratory motion must be gated behind `prefers-reduced-motion`.

---

## 5. Recurrence and streak presentation

**Recurrence** must be legible *without* opening an editor, because "is this due today?" is the
question the daily surface answers. Render the rule as a short human phrase derived from the
recurrence block — "Every day", "Mon, Wed, Fri", "Every 2 weeks on Tue", "Day 1 of each month",
"Every 14 Mar" — with a `nextDueDate` fallback ("Next: Tue 9 Sep") when the phrase would be long.
Every derived phrase must be real, never approximated.

**Streaks** need three rules:

1. **Never color-only.** `currentStreak`/`longestStreak` are numbers with a text label
   ("12-day streak", "Best 31"). A flame glyph may decorate but must be `aria-hidden` and must not be
   the only carrier of "current vs best" — the current page uses 🔥 vs 👑 as the *only* distinction,
   which fails both WCAG 1.4.1 and screen-reader parity.
2. **Zero and one are first-class states.** A brand-new habit and a broken streak must read as
   neutral ("No streak yet" / "Start today"), never as failure. Nothing motivating is lost and a lot
   of shame is avoided.
3. **Streak semantics must match the backend.** The streak only advances when the daily target is
   met *and* the recurrence rolls over; it is a *recurrence* streak, not a calendar-day streak. Label
   it "scheduled completions in a row" in help text rather than implying consecutive calendar days.

**Week history on the daily surface**: keep a compact per-habit 7-day strip (Mon–Sun, from the
existing `/history` range call) instead of the separate full-width `WeeklyOverviewTable`. Each cell
carries: a shape/fill state, an accessible name ("Tuesday 2 September: 2 of 2 check-ins"), and a
distinct rendering for *not scheduled* vs *scheduled and missed* vs *future*. Because check-ins can't
be backdated, cells are **not interactive** — do not style them as buttons.

---

## 6. Relationship to analytics

Three-tier model, each tier answering a different question:

| Tier | Surface | Question | Data |
|---|---|---|---|
| Glance | `/habits` row | "Did I do it today, and am I on a run?" | `todayCheckInCount`, `todayTargetMet`, `currentStreak`, 7-day strip |
| Review | `/habits/analysis` | "How consistent have I been, and which habit is slipping?" | 12-week heatmap, completion rate, per-habit trend |
| Cross-domain | Insights → Habits tab | "How do habits sit next to tasks and focus?" | same panel, embedded |

Rules:

- `/habits` shows **no percentages beyond today's simple count**. The "x% today" aggregate on the
  current page is noise at n=5 habits (each habit moves it 20 points).
- `/habits/analysis` keeps the URL and stays reachable from `/habits` via one clearly labelled link;
  no redirect churn is needed since both routes already exist in `router/routes.tsx`.
- Preserve every existing analytic quantity: overall completion, total check-ins, best active and
  longest-ever streak, per-day completion heatmap, check-ins by category, and per-habit
  completion/check-ins/streaks/trend. All of it derives from `GET /habits` + `GET /habits/history`;
  none of it is fabricated, and the redesign must keep it that way — **no invented history, no
  placeholder trend lines, no synthetic averages.**
- Heatmap accessibility is currently a single `role="img"` with one summary label and `title=`
  tooltips (invisible to keyboard users). Replace with a real table semantic or per-cell accessible
  names plus a text summary, and provide the same information in a list/table form for screen
  readers.
- "No data" must stay a distinct state from "0%" — a habit with `dueDays === 0` in the window is not
  a 0% habit. The current code already distinguishes these; keep that.

---

## 7. Creation flow and templates

The create/edit form has real complexity — recurrence (4 frequencies with conditional fields),
target/goal type, reminder, category, importance, estimate. Recommendations:

- **Keep create in a side panel/sheet, not a full page.** It preserves context and matches the
  "add three habits in a burst" onboarding pattern. On mobile it should present as a full-height
  sheet.
- **Templates lead for first-time creation, and are secondary afterwards.** From an empty state, the
  preset gallery *is* the create flow — the fastest path from zero to a working habit is picking
  "Drink water". Once the user has habits, a blank-first form with templates behind a labelled
  section is right. The current page's two competing header buttons ("Browse templates" / "New
  habit") force a choice the user cannot yet make; collapse to one primary "New habit" entry whose
  panel offers templates in-context.
- **A template must be a starting point, not a commitment.** After applying a preset, every field
  stays editable and the panel should say which template was applied and offer to clear it.
- **Progressive disclosure inside the form:** name + recurrence + target are the required core;
  category, importance, estimate, reminder are secondary and can sit under a clearly labelled
  section that is *expanded by default on desktop* (hiding four fields behind a chevron makes editing
  slower) and collapsed on narrow screens.
- **Validation must be inline and mirror the server rules exactly** (title required ≤255; interval
  1–365; WEEKLY requires ≥1 weekday; MONTHLY requires day 1–31; YEARLY requires a date; reminder time
  required when reminders are on; `dailyTargetCount` > 0; `estimatedMinutes` ≥ 0). Errors belong on
  the field, referenced by `aria-describedby`, plus a summary announced on submit.
- **Edit reuses the same panel** with a different title and submit label; it must not offer template
  application (applying a template mid-edit silently rewrites the user's fields).
- **Delete stays a confirm dialog** naming the habit, and must state that check-in history is
  removed — this is a hard delete.

---

## 8. Responsive and mobile strategy

Validate at 375 / 768 / 1024 / 1440.

- **375 (primary for check-in):** single column, one row per habit. The check-in control is a
  full-height tap target on the trailing edge; edit/delete move into an overflow menu so nothing
  destructive sits within a thumb-width of the primary action. The 7-day strip stays (7 small cells
  fit comfortably) but drops to a compact scale. Filter chips scroll horizontally *inside their own
  container* — the page body must never scroll horizontally. Create opens as a full-height sheet.
- **768:** same single-column list with more breathing room, or two columns only if the row content
  stays legible; grouping headers ("Due today" / "Not due today") become more prominent.
- **1024 / 1440:** resist the urge to fill width with a wide grid. A **constrained content column**
  (roughly 720–880px) for the daily list keeps the scan short; optional secondary rail for the day
  summary and filters at ≥1280. Analysis, by contrast, legitimately wants the full width for the
  heatmap and comparison table — a different max-width per surface is correct, not inconsistent.
- Analysis tables must scroll inside an `overflow-x:auto` wrapper, or collapse to stacked cards below
  ~640px. The heatmap already scrolls horizontally; keep that container and make sure it is
  keyboard-scrollable.
- Long habit titles: clamp to two lines with the full text available via the accessible name; never
  truncate to a single word, and never let a long title push the check-in control off-screen.

---

## 9. Accessibility considerations

- **WCAG AA contrast** in light and dark for every state, including "met" fills, muted "not due"
  rows, and heatmap levels. The existing heatmap's `bg-brand/15` step is a likely AA failure against
  its neighbours as an information carrier.
- **No color-only meaning** for completion, streak, trend, or heatmap intensity. Every one needs text
  or shape: "Done", "2/8", "Up 12%", "3 of 4 completed".
- **Keyboard:** the whole daily flow must be operable — tab to a habit, activate check-in, activate
  undo, open the overflow menu, open create, escape to close. Visible focus rings on every control,
  including the compact ones. Focus must move into the create panel on open and return to the trigger
  on close; delete confirm must trap focus.
- **Live announcements:** check-in and undo are asynchronous mutations with no page change — announce
  results via the app's existing `useAnnouncement()` live region ("Drink water, 3 of 8 today"),
  including failures. Do not rely on visual state change alone.
- **Progress semantics:** use `role="progressbar"` with `aria-valuenow/min/max` and a real
  `aria-label` (or a native `<progress>`), and make sure the value is also present as text.
- **Decorative glyphs** (🔥, 👑, template icons, inferred habit emoji) get `aria-hidden` and are never
  the sole carrier of meaning. The title-inference emoji should be dropped entirely: guessing an icon
  from a title is unreliable and adds a semantic claim the data doesn't support.
- **Reduced motion:** any completion animation, streak count-up, or bar transition must collapse to an
  instant state change under `prefers-reduced-motion: reduce`.
- **Every required state gets a design**, not a fallback: first-use empty (no habits), filtered-empty
  (filters return nothing — with a clear-filters action), loading skeletons that don't shift layout,
  error with a retry, and the "no reminder / no history / no streak" per-habit variants.
- **Touch targets ≥ 44px**, with adequate spacing between the primary action and any destructive one.

---

## 10. Testing implications (for whoever implements)

Preserve coverage for: create (incl. each recurrence frequency's conditional validation), edit,
delete-with-confirm, check-in, undo, count-habit multi-check-in, template application, week-history
rendering, filter and each sort option, embedded-analysis rendering from Insights, and every empty /
loading / error state. Existing colocated tests to keep green:
`frontend/src/components/habits/HabitCreateForm.test.tsx` and
`frontend/src/components/habits/HabitTemplateSelector.test.tsx`. Add keyboard-operation and
announcement assertions for the redesigned check-in row.
