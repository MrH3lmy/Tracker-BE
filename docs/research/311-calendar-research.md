# Issue #311 — Calendar / Week / Day / Auto-plan: Recommended Design Direction

**Lane E research output. DESIGN DIRECTION ONLY — no implementation, no repo files touched.**

> **Methodology honesty note:** The issue asks for output from a skill named **"UI UX Pro Max"**. That skill is **NOT installed in this session**. Nothing below is skill output and none of it should be presented as such. What follows is **structured design research (UI UX Pro Max skill unavailable in session)** — first-principles product/UX reasoning grounded in (a) the actual backend contracts read from this repo, (b) the current frontend surfaces, and (c) established, citable calendar/planning interaction conventions (WAI-ARIA APG Grid & Date Picker patterns, WCAG 2.2 AA incl. 2.5.7 Dragging Movements and 2.5.8 Target Size). Where a claim is a convention rather than a repo fact, it is marked *(convention)*.
>
> If the skill is required by the acceptance criteria, this document should be treated as a **pre-research brief**, and the skill re-run before the PR claims skill-derived evidence.

---

## 1. Capability inventory (repo facts — the design must fit these)

Read for context only: `frontend/src/pages/CalendarPage.tsx`, `CalendarWeekPage.tsx`, `SchedulerPage.tsx`, `PlanningPage.tsx`; `src/main/java/com/taskpriority/calendar/**`, `planning/**`, `scheduler/**`.

**Two distinct scheduling truths exist in the backend, and they are not the same thing.** This is the single most important finding for the redesign.

| Truth | Owner | Shape | Surfaced today by |
|---|---|---|---|
| **Task due date** — a *date-only* deadline (`Task.dueDate`, `LocalDate`) | `calendar/` | `GET /api/v1/calendar/month?year&month` → per-day `DaySummary{taskCount, hasOverdue, hasImportant}`; `GET /calendar/month/tasks` → day-keyed `TaskResponse[]` | Month view (`CalendarPage`) |
| **Scheduled time block** — a *date + start time + duration + priority* booking, for tasks **and habits** (`scheduler/`) | `scheduler/` | `GET /scheduler/day?date`, `GET /scheduler/week?startDate`; `PUT /scheduler/tasks/{id}`, `PUT /scheduler/habits/{id}` (`ScheduleTaskRequest{scheduledDate, startTime, durationMinutes, priorityLevel}`); `DELETE` to unschedule | Week (`CalendarWeekPage`), Day (`SchedulerPage`) |

Additional capabilities already in the backend:
- **Slot suggestion:** `GET /scheduler/tasks/{id}/suggestion?earliestDate` and `.../habits/{id}/suggestion` → `SuggestedSlot{scheduledDate, startTime, durationMinutes}`; **204 when no slot exists** (a real, designable empty state).
- **Auto-schedule:** `POST /scheduler/auto-schedule` `{startDate, endDate, scope}` → `AutoScheduleResult{scheduledTaskIds, scheduledHabitIds, unresolvedTaskIds, unresolvedHabitIds}`. Note the result returns **IDs only, no per-item reason** — see §9 contract gaps.
- **Conflict data already exists:** `SchedulerService.overlapIds(...)` computes overlapping booking IDs and they ride along on the scheduled-entry response. The current UI barely uses this; the redesign should make conflicts first-class.
- **Working calendar:** `WorkingCalendarService` → excluded weekdays, holiday dates, `defaultDailyCapacityHours` (from `SettingsService`). Auto-plan and capacity bars must be driven by this, not by a hardcoded Mon–Fri.
- **Planning/Auto-plan surface:** `GET /planning/today`, `/weekly`, `/recommendations` (`TaskRecommendationResponse{task, recommendedAction, reasonCodes, explanation, confidence, blockerWarnings, rank}` — an *explainable* recommendation payload that today's UI under-uses), `/project-board` with per-column `totalEstimatedHours` / `availableCapacityHours` / risk.
- **Export:** `GET /calendar/export.ics` — **`@RequiresTier(Tier.PREMIUM)`**. Export must have a designed entitlement state, not a silent failure.
- **Undo** exists today via `useUndoToast` on month drop, week reschedule, and day unschedule. It is an invariant.
- **Quick capture** exists via `useQuickCapture(dateKey)` from a month-day click — date context only, no time context.
- **Timezone:** Month view computes in **UTC** (`Date.UTC`, `timeZone: 'UTC'`); Day view computes in **local time** (`toIsoDate(new Date())`). **This is a live inconsistency and a date-boundary bug source.** See §8.

---

## 2. The core design problem

The four surfaces are currently four unrelated pages wearing the same `SectionTabs` hat. They answer four different questions with four different mental models, and the user has to re-orient at every tab switch:

- Month = "when are things **due**?" (deadline space)
- Week = "when am I **doing** things?" (booking space)
- Day = "what is my **hour-by-hour** today?" (booking space, fine-grained)
- Auto-plan = "what **should** I do?" (advice space)

Tabs imply peers. These are not peers — they are **three zoom levels over one timeline (Month → Week → Day)** plus **one assistant that acts on that timeline (Auto-plan)**.

### Recommended IA: **one Planner shell, a zoom control, and Auto-plan as a co-pilot panel — not a fourth tab**

```
┌─ Planner ────────────────────────────────────────────────────────────┐
│ [‹ Today ›]  Sep 2026        [Month│Week│Day]      [Auto-plan] [⤓ICS]│
├──────────────────────────────────────────┬───────────────────────────┤
│                                          │  RAIL (desktop ≥1024)     │
│           TIMELINE CANVAS                │  ▸ Unscheduled            │
│      (month grid / week / day)           │  ▸ Recommended next       │
│                                          │  ▸ Auto-plan (on demand)  │
└──────────────────────────────────────────┴───────────────────────────┘
```

Rationale:
1. **Shared context survives zoom changes.** Switching Month→Week keeps the focused date; switching Week→Day drills into the focused day. Today, every switch resets to "now" — the user loses their place. This alone removes most of the tab-thrash.
2. **Auto-plan needs a target range to act on.** As a separate page it has no date context and hardcodes `startDate=date, endDate=date+6`. As a rail panel it inherits the visible range, which is both more honest and more controllable.
3. **The rail solves the "where does unscheduled work live" problem** for all three zooms, not just Day.

**Route compatibility (hard requirement):** keep `/calendar`, `/calendar/week`, `/calendar/day`, `/calendar/auto-plan` as real, bookmarkable URLs that set the shell's zoom (and open the rail for `auto-plan`), plus existing `/planning` → `/calendar/auto-plan` and `/scheduler` → `/calendar/day` redirects. The shell is a presentation change; the URL contract is not.

---

## 3. Month view

**Purpose: deadline pressure at a glance, and coarse rescheduling.** Not a mini agenda.

- **Grid, 6×7, fixed cell height, internal scroll per day.** Cells must not grow with content — a 14-task day must not push the grid off-screen. Overflow renders `+N more` which opens that day's **day-peek popover** *(convention: the "+N more" affordance is the standard resolution for dense month cells)*.
- **Task chips carry: title (truncated with `title`/tooltip), an overdue/important marker, and nothing else.** Month is a density surface; resist metadata.
- **Per-day load signal.** `DaySummary` already gives `taskCount`, `hasOverdue`, `hasImportant`. Render load as a **non-color-only** signal (a small count + a weight bar), because `hasOverdue` communicated by red alone fails WCAG 1.4.1.
- **Today** gets a persistent ring **and** an `aria-current="date"`; the *focused* cell gets a distinct focus ring. Two different states, two different visuals — never one.
- **Working/non-working days** shaded from `WorkingCalendarService` settings so the month agrees with what Auto-plan will actually do.
- **Empty month** = a real illustration-free empty state with one CTA ("Add a task for September"), not a blank grid.
- **Month reschedules `dueDate` only** (`PATCH /tasks/{id}` due date, as today). Never let a month drag invent a `startTime`. If a task has a scheduler booking, a month move must **say** what it did and did not change: *"Due date moved to Sep 12. Its 09:00 booking on Sep 9 was not moved."* This is the highest-risk trust bug in the current design and the redesign must address it explicitly.

## 4. Week view

**Purpose: distribute effort across the week.** This is the primary planning surface for most users *(convention: week is the dominant default in calendar products because it matches the human planning horizon)*.

- **Two week modes, user-selectable, remembered:**
  - **Time grid** (7 columns × hour rows) — exact, matches `startTime`+`durationMinutes`, right for people whose day is booked.
  - **Column/agenda** (7 columns, stacked chips, no hour axis) — right for the many Tracker users whose entries are `durationMinutes` blobs without meaningful clock positions, and **the only mode that works at 375px**.
- **Week start honors locale/settings, not a hardcoded Sunday.** Current code hardcodes `-date.getUTCDay()`. Derive from settings/locale.
- **Per-day capacity header:** `booked hours / defaultDailyCapacityHours`, with over-capacity called out in text ("6.5h booked, 1.5h over capacity"), not just a red bar.
- **Tasks and habits are visually distinguished** (`kind: 'TASK' | 'HABIT'`) by shape/icon plus label — the response already carries `kind`.
- **Conflicts:** entries whose `overlapIds` is non-empty get a persistent conflict badge and are reachable via a "Jump to next conflict" control. Overlap is data the backend already returns; showing it is free trust.
- **Now-indicator line** in the time grid, only for the current day, respecting `prefers-reduced-motion` (position updates on a timer, no animated slide).

## 5. Day view

**Purpose: execution.** The only surface where minute-level truth matters.

- **Two-pane on ≥1024: timeline + Unscheduled rail** (this part of the current `SchedulerPage` is correct and should be preserved in substance).
- **Timeline shows the working window from settings**, collapsing empty early/late hours behind an "Show earlier hours" expander so the useful range fills the viewport.
- **Every scheduled entry exposes, without a hover:** time range, duration, priority level, complete/check-in, unschedule, and open-task. Hover-only actions fail touch and keyboard.
- **Unscheduled rail is the scheduling engine:** each item offers **"Suggest a time"** (`GET /suggestion`) which returns a concrete slot the user confirms — this is the keyboard/touch-native alternative to dragging, and it already exists in the API.
- **204 from `/suggestion` is a designed state**, not silence: *"No free slot before Friday. Extend the range or shorten this task."*
- **Focus filter** (All / Work / Training & Life) preserved; it should scope the rail and the timeline together, and its state should be reflected in the URL so a filtered day is shareable.

## 6. Auto-plan

**Purpose: propose a schedule, explain it, and let the user accept or reject it — never a black-box mutation.**

The current flow fires `POST /auto-schedule` immediately and reports a sentence. That is a destructive bulk write with a toast. The redesign should be **propose → review → apply**.

Recommended interaction:

1. **Scope panel** — range (inherited from the visible timeline, editable), scope (`ALL` / tasks / habits), and a visible statement of the constraints being applied: *"Skipping Sat, Sun and 2 holidays. 6h/day capacity."* Constraints come from `WorkingCalendarService`; showing them is what makes the result legible.
2. **Run** → the timeline renders **proposed** blocks in a visually distinct "ghost" treatment (dashed border + "Proposed" label, never color alone) alongside existing bookings.
3. **Result summary, explainable:** *"Scheduled 9 items. 3 could not be placed."* The three unplaced items are listed **by name with a reason and a next action** ("no free slot before its due date → extend range / shorten / schedule anyway").
4. **Apply** / **Discard**, with **Undo** after Apply (the undo pattern already exists; for a bulk apply it must restore every prior booking, so the client must snapshot pre-state before the call).
5. **Recommendations are the other half of Auto-plan.** `TaskRecommendationResponse` already returns `recommendedAction`, `reasonCodes`, `explanation`, `confidence`, `blockerWarnings`, `rank`. Surface `explanation` + `blockerWarnings` inline in the rail. **Do not render `confidence` as a bare percentage** — it is a heuristic, and a number implies calibration the engine does not have; use a coarse label (Strong / Possible) plus the explanation text.

**Honesty rule:** the label "Auto-plan" must never imply an LLM. It is a deterministic slot-filling heuristic (`ScheduleSuggestionService`). Copy should say "fills your free slots by priority and due date", not "AI plans your week".

---

## 7. Rescheduling: drag, and its first-class keyboard/touch equivalent

WCAG 2.2 **SC 2.5.7 Dragging Movements (AA)** requires a single-pointer, non-dragging alternative for every drag action. Treat this as a hard gate, not a nice-to-have.

**Recommendation: build the non-drag path first, then add drag as an accelerator on top of it.** If the keyboard path is designed second it always ends up as a degraded shim.

| Layer | Interaction | Applies to |
|---|---|---|
| **Primary (all inputs)** | **"Move…" action** on every entry (in its menu, and `M` when focused) opens a **Move dialog**: target date (date field + relative shortcuts: Tomorrow, Next working day, Next week), and for scheduler entries a start time + duration, with a **"Suggest a time"** button hitting `/suggestion`. Confirm applies; toast offers Undo. | Month, Week, Day |
| **Keyboard grab (accelerator)** | Focus an entry → `Space` "grabs" it → arrow keys move the *proposed* target cell/slot → `Space` drops, `Esc` cancels. Live-region narrates every step. *(convention: this is the standard accessible-DnD grab model.)* | Week, Day, Month |
| **Pointer drag (accelerator only)** | Mouse/trackpad drag to a day (Month) or slot (Week/Day). Never the only path to any outcome. | Desktop |
| **Touch** | **No drag on mobile.** Tap → "Move…" sheet. Long-press-drag inside a scrolling calendar is a known reliability failure and conflicts with scroll. | ≤768 |

Supporting rules:
- **Drop targets ≥ 44×44 CSS px** (SC 2.5.8) and highlighted with an outline + label, not a fill-color change alone.
- **Optimistic move with rollback** (the pattern already used for task reorder in `useApiQueries`), because a slow PUT under a drag feels broken.
- **A move that creates an overlap must not be silently accepted.** Confirm inline: *"This overlaps 'Standup' at 09:00. Schedule anyway / pick another time."* The overlap data is already returned.
- **Undo is mandatory after every reschedule** — including the bulk Auto-plan apply — and the toast must be keyboard-reachable and not auto-dismiss before ~10s.

---

## 8. Date, time and timezone semantics (correctness, not polish)

- **Adopt one rule: all calendar dates are date-only strings (`YYYY-MM-DD`) manipulated as strings, never as `Date` objects.** The repo already has `lib/dateOnly.ts` (`addDaysToDateOnlyKey`, `todayDateOnlyKey`, `formatDateOnly`) — it should be the *only* date arithmetic in these surfaces.
- **Fix the current split:** `CalendarPage` uses UTC (`Date.UTC`, `timeZone:'UTC'`), `SchedulerPage` uses local (`new Date()` getters). A user east/west of UTC sees "today" highlighted on different days in Month vs Day. Month/Week/Day must agree on "today" = **local** civil date.
- **Times (`startTime`, `durationMinutes`) are wall-clock, no zone.** Do not convert them. Render as given.
- **DST:** because bookings are wall-clock and dates are date-only, DST is mostly a non-issue — *provided* no code path builds a `Date` and adds 86 400 000 ms. Test the spring-forward and fall-back days at week boundaries anyway.
- **Month boundaries:** week rows crossing month edges must render the adjacent month's days as visibly de-emphasized but still focusable and droppable.

---

## 9. Accessibility specification

**Grid semantics**
- Month = a **date grid**: `role="grid"` with `role="row"` / `role="gridcell"`, column headers as `role="columnheader"` with `abbr`. One tab stop for the whole grid (roving `tabindex`) — never 42 tab stops.
- Each day cell's accessible name is the **full date, spoken naturally**: "Saturday, September 12, 2026, 3 tasks, 1 overdue". Not "12".
- Week time-grid = a grid of day columns; each entry is a focusable element inside its day's cell with a name of the form **"09:00 to 09:30, Standup, habit, conflicts with Design review"**.
- Day timeline is a **list** (`role="list"`), not a grid — it is one dimension. Do not over-ARIA it.

**Keyboard map** *(WAI-ARIA APG date-grid conventions)*
`←/→` day · `↑/↓` week · `Home/End` week start/end · `PageUp/PageDown` month (Week view: week) · `Shift+PageUp/PageDown` year · `Enter` open focused day (Month) or entry · `Space` grab/drop · `Esc` cancel grab or close popover · `M` move · `N` new item on focused date/slot · `T` today · `[`/`]` previous/next range. Publish this map in a `?`-triggered shortcut sheet.

**Screen-reader announcements** — one polite live region for navigation, one assertive for conflicts/errors. The repo already has `announcementContext.tsx`; use it rather than inventing a second mechanism.
- Range change: *"September 2026. 24 tasks."*
- Focus move: the cell's own accessible name (from the grid, not an announcement — avoid double-speaking).
- Grab: *"Grabbed Design review, currently Tuesday September 8 at 09:00. Use arrow keys to move, Space to drop, Escape to cancel."*
- During grab: *"Wednesday September 9, 10:00. Free."* / *"…10:00. Conflicts with Standup."*
- Drop: *"Design review moved to Wednesday September 9 at 10:00. Press Undo to revert."* (assertive)
- Auto-plan: *"Scheduled 9 items, 3 unplaced. Review proposed changes."* (assertive)

**Reduced motion (`prefers-reduced-motion: reduce`)**
- No slide/animate on view or range change — cross-fade at most, or nothing.
- Drag ghosts follow the pointer without spring/inertia; drop snaps instantly.
- The now-indicator repositions, it does not glide.
- Skeletons: static shapes, no shimmer sweep.

**Other AA gates**
- Never encode overdue / conflict / proposed / habit-vs-task in color alone — pair with icon, shape or text.
- Visible focus ring at ≥3:1 against both adjacent surfaces, in light and dark.
- Chip text must reach 4.5:1 on its own background in both themes — verify against the #308 tokens, don't assume.
- Long titles: single-line truncate with a full-text `title` and full text in the accessible name; never clip mid-glyph or reflow the grid.

---

## 10. Mobile planning strategy (375 / 768)

The month grid is the wrong default on a phone: 42 cells × chips is unreadable and a 7-column time grid at 375px gives ~48px columns.

- **Default zoom on ≤768 is Day**, not Month. Phones are for executing today, not surveying the quarter *(convention, and consistent with the fact that the Day surface is the only one that fits)*.
- **Month on mobile = compact date-strip + agenda below.** A tappable month grid with count dots only (no chips); tapping a day scrolls the agenda list beneath it. This preserves month navigation and task-date visibility without a horizontal-scrolling grid.
- **Week on mobile = the column/agenda mode**, vertically stacked as seven day sections, or a horizontally swipeable single-day carousel with a day strip — **never** a pinch-zoomable 7-column time grid.
- **Swipe left/right changes range** (with the arrow buttons always present as the accessible equivalent).
- **No horizontal page overflow at 375** is a hard gate: any wide element scrolls inside its own container.
- **Mobile actions are a bottom sheet**, thumb-reachable, with ≥44px targets: Move, Suggest a time, Complete, Open task, Unschedule.
- **Auto-plan on mobile** is a full-screen flow (scope → review list → apply), not a rail.
- **The rail collapses into a sheet** on <1024, reachable from a persistent "Unscheduled (7)" button so unscheduled work is never invisible.

---

## 11. States: loading, empty, error, dense

- **Loading:** grid-shaped skeletons that hold layout, so nothing jumps when data lands. Range navigation while loading must remain enabled (keep the previous range visible, dim it) — disabling the controls during every fetch is the current feel and it reads as frozen.
- **Error:** inline retry inside the canvas ("Couldn't load this week. Retry"), never a whole-page wipe; the header/navigation must stay usable so the user can move to a range that works.
- **Empty month/week/day:** distinct copy per zoom, each with one CTA (add task / schedule something / run Auto-plan). "No tasks" alone is a dead end.
- **Dense day (20+ entries):** month cell caps at N chips + "+N more"; week column scrolls internally with a sticky day header; day timeline lanes side-by-side for overlaps, with a hard cap and a "3 more overlapping" affordance.
- **Export ICS:** it is `@RequiresTier(PREMIUM)` — design the locked state (visible, explained, upgrade path) rather than letting the download 403 silently. Also a pending state, since export is synchronous and can be slow with many tasks.

---

## 12. Contract gaps to document before touching the backend

The issue requires naming any gap *before* backend changes. Candidates, in priority order:

1. **`AutoScheduleResult` has no reasons.** `unresolvedTaskIds` are bare IDs — the UI cannot say *why* an item could not be placed, and cannot even name it without extra fetches. A per-item `{id, title, reasonCode}` would make the review step honest. **Workaround without backend change:** correlate IDs against the already-fetched unscheduled lists and use generic reason copy.
2. **No dry-run for auto-schedule.** The propose→review→apply flow above is the right UX, but `POST /auto-schedule` writes immediately. **Workaround:** snapshot pre-state client-side, apply, then present the result as reviewable with a real bulk Undo. A `dryRun` flag would be the clean fix.
3. **Month endpoint is year+month only.** A month grid renders leading/trailing days from adjacent months, so a full 6-week view needs 2–3 calls. A `?from=&to=` range param would collapse it to one. **Workaround:** fetch adjacent months and merge (also gives instant prev/next via prefetch).
4. **Month summary vs month tasks are two calls with overlapping data.** Fine, but the redesign should pick one (`/month/tasks`, which is a superset) rather than fetching both.
5. **No bulk reschedule.** Multi-select "move 5 tasks to next week" would need N calls. Out of scope for #311 unless the design commits to multi-select — recommend it does not, this round.

---

## 13. What to explicitly *not* carry forward

- `SectionTabs` as the relationship model between the four surfaces (they are zooms + an assistant, not peers).
- Resetting date context on every view switch.
- Hardcoded Sunday week start and hardcoded Mon–Fri assumptions.
- Mixed UTC (Month) / local (Day) "today".
- Auto-plan as an immediate bulk write reported by a sentence.
- Drag as the only path to a reschedule.
- Hover-only entry actions.
- `confidence` rendered as a bare percentage.

## 14. Validation checklist for the eventual PR

375 / 768 / 1024 / 1440 × light/dark, all three zooms + Auto-plan · keyboard-only full reschedule (no pointer) · screen-reader pass on grid navigation, grab/drop and conflict announcement · `prefers-reduced-motion` on · no horizontal page overflow at 375 · empty and dense month/week/day · loading/error/retry per surface · ICS export in both entitled and non-entitled states · undo after single move, unschedule and Auto-plan apply · DST spring-forward/fall-back weeks · month-boundary weeks · 120-character task titles · quick capture from a month day and from a week/day slot · legacy `/planning` and `/scheduler` redirects still land correctly.
