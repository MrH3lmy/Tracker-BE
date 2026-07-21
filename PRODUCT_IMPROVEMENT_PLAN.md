# Tracker Product Improvement Plan

Status: living document. Updated at the end of each phase with what shipped and what moved to `BACKLOG.md`.

## 1. Current UX problems (found in the actual code)

Findings from a direct audit of `frontend/src` and `src/main/java/com/taskpriority` before any changes were made.

1. **Sidebar icon fallback bug.** `App.tsx`'s `navIcons` map was missing entries for Habits, Board, and Scheduler, so all three silently rendered the Dashboard icon (`LayoutDashboard`) via the `navIcons[label] ?? LayoutDashboard` fallback.
2. **A genuinely dead button.** `PlanningPage.tsx`'s `SecondarySuggestionCard` rendered a "View details" button with no `onClick` at all, even though `TaskDetailPage` / `/tasks/:id` already exists.
3. **Redundant CTAs.** `HabitsPage.tsx`'s "Browse templates" and "New habit" buttons called the exact same handler (`showCreatePanel`), so they did the same thing despite implying different flows.
4. **Developer/API language leaking into normal screens.** `DashboardPage.tsx` literally showed strings like "Summaries from /api/v1/dashboard", a raw JSON `<pre>` dump, and had a manual "Refresh"/"Check API" flow instead of loading on mount — it reads as an API-testing scaffold, not a finished dashboard. `SettingsPage.tsx` repeated "Saved as `<settingKey>`" captions showing raw backend keys. `ImportPage.tsx` told users to "POST plain text to `/api/v1/import/csv`".
5. **Raw enum values rendered verbatim.** `PlanningPage.tsx` and `MatrixPage.tsx` printed `task.status` / `task.priorityCategory` straight from the API (`IN_PROGRESS`, `DO_NOW`, `DEEP_WORK`, `FOLLOW_UP_OVERDUE`, ...) with no humanization, unlike the one local `formatBadgeLabel` helper that was already applied inconsistently.
6. **No undo for reversible actions.** Completing a task, changing its status (which is how "archiving" works — status flips to `DONE`/`CANCELLED`), moving a task on the board, and unscheduling a task/habit are all backed by fully reversible endpoints, but the UI gave no way to undo a misclick.
7. **No mobile bottom navigation.** Mobile nav was a top hamburger opening a dropdown list — workable, but not the fast thumb-reachable navigation a "daily driver" app needs.
8. **Fragmented information architecture.** Eleven top-level sidebar items (Dashboard, Tasks, Habits, Board, Notes, Planning, Scheduler, Matrix, Calendar, Settings, Import) for what are largely different *views* of the same two concepts (tasks, time). Board and Matrix are task views; Planning and Scheduler are both "what should I do and when" tools with overlapping data (`PlanningService` vs the `scheduler` package).
9. **Dashboard isn't a command center.** It requires a manual click to load anything, shows generic workspace tiles instead of "what do I do right now," and has no habits, no timeline, no recommended-next-task surface even though `TaskRecommendationService` and `PlanningService.getTodayView()` already compute exactly that data.

## 2. What already exists and should be reused, not rebuilt

This matters because the original ask assumed some of this was missing — it is not:

- **Auth & per-user isolation is mature.** JWT (`app/auth` package, `JwtAuthenticationFilter`, `CurrentUserService`), a real `User` entity, and `user_id` scoping on every domain table (migrations V26–V29). All new backend code follows the existing `currentUserService.requireUserId()` + `findByUserId(...)` pattern — no new auth work needed.
- **Habits** is a fully shipped feature end-to-end (entity, service, controller, reminders, frontend pages/components, tests) — not greenfield.
- **A recommendation engine already exists**: `TaskRecommendationService` (`/api/v1/planning/recommendations`) scores tasks and returns ranked actions with reason codes and confidence.
- **Auto-scheduling already exists**: `ScheduleSuggestionService.autoSchedule` (`POST /api/v1/scheduler/auto-schedule`) bulk-assigns tasks/habits into open slots.
- **Genuinely greenfield**: Projects/Goals (no entity — only `Task.track`/`Task.phase` string grouping), global search, focus sessions, weekly review, and reminder *delivery* (only `Habit.reminderEnabled`/`reminderTime` data fields exist; no `@Scheduled` job or notification system anywhere).

## 3. Proposed information architecture

Primary nav: **Today · Tasks · Habits · Notes · Calendar · Insights**
Secondary: **Search · Settings · Import**

| New location | Absorbs |
|---|---|
| Today (replaces Dashboard) | New `/api/v1/home/today` aggregation |
| Tasks → List / Board / Matrix views | `TasksPage`, `BoardPage`, `MatrixPage` (existing pages, now view-switched under one route) |
| Calendar → Day / Week / Month / Auto-plan | `CalendarPage`, `SchedulerPage`, `PlanningPage` weekly/board views |
| Insights | New: task analytics, habit analytics, planning performance (Phase 4+ backlog) |

Old routes (`/dashboard`, `/board`, `/matrix`, `/planning`, `/scheduler`) redirect to their new home so bookmarks/saved links keep working (`Navigate replace` routes, not deletions).

**Search was intentionally left out of the nav in Phase 2** (`GET /api/v1/search` didn't exist yet -- adding a "Search" sidebar entry would have been exactly the dead-link pattern this plan is trying to remove elsewhere) and added once it shipped for real in Phase 6.

## 4. Backend changes

- Phase 3: `GET /api/v1/home/today` — new `home` package (`HomeController`, `HomeService`) composing existing services: `DashboardService` (counts), `PlanningService.getTodayView()` (overdue/due-today/top-priority tasks), `TaskRecommendationService` (top 3 recommendations), `SchedulerService.getDaySchedule()` (today's timeline + focus minutes), `HabitService.findAll()` (check-in state), and a single `TaskRepository.findByUserId()` scan (in-memory filtered for upcoming/waiting-blocked/follow-ups-due, avoiding N extra queries). No new tables — pure composition, read-only, scoped by `currentUserService.requireUserId()` like every other service.
  - **Known simplification**: "habits today" returns all active habits (no backend concept of "due today" exists per habit's recurrence rule — e.g. a WEEKLY habit's `daysOfWeek` isn't checked against today). This matches how `HabitsPage` already treats habits today, so it's not a regression, but a real "due today" filter is backlog work if habits with sparse schedules turn out to need it.
  - **Known tradeoff**: composing 5+ existing services means 5+ separate DB round trips per Today page load (each bounded, none N+1) rather than one fully unified query. Chosen deliberately over refactoring every composed service to share a single pre-fetched task list, per the instruction to reuse existing services rather than duplicate their logic.
- Phase 7+ (backlog): `Project`/`Milestone` entities + Flyway migrations, `ProjectController`.
- Phase 8+ (backlog): `FocusSession` entity + Flyway migration, session controller.
- Phase 9+ (backlog): `WeeklyReview` entity + Flyway migration.
- Phase 10+ (backlog): `Reminder`/`NotificationOutbox` entities, a `@Scheduled` delivery worker (first one anywhere in this codebase).

## 5. Frontend changes

- New shared primitives: `lib/enumLabels.ts` (SCREAMING_SNAKE_CASE → friendly label, with the exact overrides requested: `IN_PROGRESS` → "In progress", `DO_NOW` → "Do now", `DEEP_WORK` → "Deep work", `FOLLOW_UP_OVERDUE` → "Follow-up overdue"), `undoToastContext.tsx` (bottom undo toast, auto-dismiss, wired into `AuthenticatedApp` in `App.tsx` next to the existing `AnnouncementContext`).
- Mobile bottom nav (`Today · Tasks · Quick add · Habits · More`), replacing the header hamburger (avoids two competing mobile nav triggers).
- New `TodayPage` replacing `DashboardPage` as the `/dashboard`(→`/today`) route.
- Route consolidation in `router/routes.tsx` + redirect routes for old paths.

## 6. Database migrations

Phase 1–3 ship **zero** new migrations (pure composition + frontend work). Future phases will need (see `BACKLOG.md` for exact DDL sketch):
- `V33__create_projects.sql` (Projects/Goals/Milestones)
- `V34__create_focus_sessions.sql`
- `V35__create_weekly_reviews.sql`
- `V36__create_reminders_and_outbox.sql`

All forward-only, all with a `user_id` FK following the established pattern from V28/V29.

## 7. API changes

| Endpoint | Phase | Notes |
|---|---|---|
| `GET /api/v1/home/today` | 3 | New, additive. Existing `/api/v1/dashboard`, `/api/v1/planning/today` etc. remain unchanged — nothing is removed. |
| `GET /api/v1/search` | 6 (backlog) | New |
| `/api/v1/projects/**` | 7 (backlog) | New |
| `/api/v1/focus-sessions/**` | 8 (backlog) | New |
| `/api/v1/weekly-reviews/**` | 9 (backlog) | New |
| `/api/v1/reminders/**`, `/api/v1/notifications/**` | 10 (backlog) | New |

No breaking changes to any existing v1 contract in Phases 1–3.

## 8. Risks

- **Scope**: the full 10-phase brief (including a first delivery-guaranteed reminder system, projects/goals, focus sessions, and global search with new indexes) is multiple weeks of work with real data-model decisions. Shipping it unreviewed in one pass risks exactly the kind of half-finished, untested code the brief explicitly forbids.
- **Nav consolidation risk**: moving Board/Matrix under Tasks and Planning/Scheduler under Calendar touches routing, the sidebar, and every internal link; redirects mitigate bookmark breakage but need testing against every old path.
- **Today endpoint risk**: composing four existing services into one response is straightforward, but must stay read-only and avoid N+1 (reuse existing repository methods, no per-task extra queries).
- **Mitigation for both**: ship Phases 1–3 fully tested now; everything else specified as implementation-ready backlog items rather than rushed code.

## 9. Test strategy

- Backend: `mvn test` (JUnit 5 + Mockito + MockMvc slice tests for the new `HomeController`; reuse of already-tested services means no new service-level logic to re-test).
- Frontend: `npm run lint`, `npm run test` (Vitest + Testing Library — this predates this plan; `CLAUDE.md` incorrectly said no test framework existed, corrected as part of Phase 4), `npm run build` (`tsc -b && vite build`), plus manual dev-server smoke checks for things not worth a full render test.
  - **Correction**: while verifying Phase 4, discovered `npm run test` was never actually run during Phases 1-3, and it had 3 pre-existing failures unrelated to those phases (the app shell test never reached an authenticated render because the mock `fetch` always rejected, including the auth-refresh call). Fixed alongside Phase 4 and folded into every phase's verification from here on.
- Both suites run after every phase; regressions are fixed before moving on.

## 10. Ordered implementation phases

1. **UI polish and correctness** — icons, dead buttons, redundant CTAs, dev-string cleanup, enum labels, undo, mobile bottom nav.
2. **Consolidate navigation IA** — Today/Tasks/Habits/Notes/Calendar/Insights, view-switching, redirects.
3. **Real Today page** — `/api/v1/home/today` + command-center UI.
4–10. **Backlog** (see `BACKLOG.md`): global quick capture, real calendar experience, global search, projects/goals, focus sessions, weekly review, reminder foundation.

## 11. Checklist

- [x] Phase 1 — UI polish and correctness
  - [x] Fix sidebar icons (Habits, Board, Scheduler)
  - [x] Fix dead "View details" button
  - [x] Differentiate "Browse templates" / "New habit"
  - [x] Remove developer language from Settings/Import; consolidate raw JSON under Settings → Advanced → Developer configuration
  - [x] Humanize enum labels in Planning/Matrix
  - [x] Undo support for complete / status change / board move / unschedule
  - [x] Mobile bottom navigation
- [x] Phase 2 — Consolidate navigation IA
  - [x] Sidebar reduced to Today, Tasks, Habits, Notes, Calendar, Insights, Settings, Import
  - [x] Tasks section: List / Board / Matrix as in-page views (`SectionTabs`) instead of separate top-level products
  - [x] Calendar section: Month / Day / Auto-plan absorbing the old Calendar / Scheduler / Planning pages
  - [x] Redirects from `/dashboard`, `/board`, `/matrix`, `/planning`, `/scheduler` to their new homes
  - [x] New Insights page (Task analytics + Habit analytics, both backed by real existing data)
- [x] Phase 3 — Real Today page (`/api/v1/home/today`)
  - [x] New `home` package (`HomeController`, `HomeService`, `HomeTodayResponse`) composing `DashboardService`, `PlanningService`, `TaskRecommendationService`, `SchedulerService`, `HabitService` -- no duplicated scoring/planning logic
  - [x] Backend tests: `HomeServiceTest` (unit), `HomeControllerTest` (`@WebMvcTest` slice), extended `ApiV1IntegrationTest` (full Spring context + H2 + real JWT auth)
  - [x] New `TodayPage` auto-loads on mount (no manual Refresh required); replaces `DashboardPage` (deleted)
  - [x] Greeting + date, Quick Add, summary cards (due today / overdue / habits completed / focus time), today timeline, top 3 recommended tasks, habits with one-click check-in, upcoming tasks, waiting & blocked, follow-ups due, empty-state onboarding for new accounts
- [x] Phase 4 — Global quick capture
  - [x] Ctrl+K / Cmd+K, header button, and mobile bottom nav all open one global `QuickCaptureModal`
  - [x] Local rule-based natural-language parser (`lib/naturalLanguageTaskParser.ts`, 15 unit tests) extracts title/date/time/tag→area/important/estimate
  - [x] Simple default fields (Title, When, Priority, Project/area) with Estimate/Recurrence/Follow-up/Risk/Track/Phase/Parent task under "More options"; dependencies deliberately left to the full Tasks flow (see plan notes)
  - [x] Low-confidence parses (e.g. a time with no explicit date) show a confirmation notice instead of silently guessing
  - [x] Can create a Task, Note, or Habit from the same modal
  - [x] 7 component tests (`QuickCaptureModal.test.tsx`) + 15 parser tests
  - **Data-model note**: `Task.dueDate` is date-only (`LocalDate`) -- there is no due-*time* field on `Task`. When quick capture parses or is given a time-of-day, the task is still created with a date-only `dueDate`, and a follow-up `PUT /api/v1/scheduler/tasks/{id}` call places it at that time via the existing Scheduler/`TaskSchedule` mechanism, which is the app's actual time-of-day concept. This is the correct integration, not a workaround -- it mirrors how Day/Week scheduling already works everywhere else.
  - **Fixed alongside**: `npm run test` was discovered to be a real, pre-existing suite (see the "Fix pre-existing App.test.tsx failures" commit) -- it now runs as part of every phase's verification, and `QuickCaptureModal`/the parser both ship with real Vitest coverage rather than being reasoned about by hand.
- [x] Phase 5 — Real calendar experience
  - [x] Real Month grid (`MonthGrid`) replacing the old summary-card list: current month loads automatically, Prev/Next/Today navigation, real per-day task lists (new `GET /api/v1/calendar/month/tasks`), overdue/important indicators, click a day to quick-capture a task on that date, click a task to open it
  - [x] Real Week view (`CalendarWeekPage` + `WeekTimeline`), backed by new `GET /api/v1/scheduler/week?startDate=`; drag a scheduled task/habit onto another day to reschedule it (with undo), Previous/Next/Today navigation
  - [x] Extracted `lib/dateOnly.ts` (parse/format/add-days, all UTC-anchored) out of `PlanningPage`'s local duplicate, shared by Month/Week/Planning; 9 unit tests including month/year/leap-day boundaries
  - [x] Existing ICS export preserved on the Month view; existing Day view (`SchedulerPage`) and Auto-plan (`PlanningPage`) untouched
  - [x] `QuickCaptureContext.openQuickCapture` now accepts an optional date to prefill, used by Month's "click a day" affordance
  - [x] Test coverage: `SchedulerServiceTest` (+2, week schedule composition), `ApiV1IntegrationTest` (2 new endpoint assertions), `MonthGrid.test.tsx` (5), `WeekTimeline.test.tsx` (4)
  - **Scope decision**: drag-and-drop ships on the Week view (dragging a *scheduled* item onto another day is an unambiguous `TaskSchedule`/`HabitSchedule` date change) but not on the Month grid (dragging a task there would mean changing `Task.dueDate`, a different and riskier operation to get right for tasks that may also be scheduled -- "drag tasks between dates when supported safely" per the brief). Month supports click-to-view and click-a-day-to-capture instead. Month drag-and-drop is a reasonable follow-up, not done here.
- [x] Phase 6 — Global search
  - [x] `GET /api/v1/search?q=&type=&status=&due=&area=&tag=&page=&size=` -- searches tasks, notes (reusing the existing `NoteSpecifications` dynamic-filter pattern), habits, and tags; auth-scoped, paginated, sorted alphabetically across types
  - [x] `V33__add_search_indexes.sql` -- `(user_id, lower(title))` indexes on tasks/notes/habits
  - [x] New `/search` page with a filter-token DSL (`type:task`, `status:blocked`, `due:this-week`, `area:work`, `tag:decision`) parsed client-side (`lib/searchQueryParser.ts`, 8 unit tests) into explicit query params -- no ambiguous DSL parsing on the backend
  - [x] Ctrl+K / Cmd+K palette gained a 4th "Search" mode (reuses the same modal shell) -- typing searches live, clicking a result navigates and closes the palette
  - [x] `/notes` now accepts `?q=` and `?tag=` to deep-link into a pre-filtered note list, so search results that point at a note actually land somewhere useful
  - [x] Test coverage: `SearchServiceTest` (9), `ApiV1IntegrationTest` (+2 assertions), `searchQueryParser.test.ts` (8), `SearchPage.test.tsx` (4), `QuickCaptureModal.test.tsx` (+2)
  - **Known simplification**: an empty query shows a "start typing" prompt rather than recent items (no "recently viewed" concept exists yet to back that), and result navigation is click/Tab, not dedicated arrow-key roving. Both are reasonable follow-ups, not required for search to be genuinely useful today.
- [x] Phase 7 — Projects and goals
  - [x] New `model/Project.java` / `model/Milestone.java` entities (`V34__create_projects.sql`); `Task.projectId` additive nullable FK, `ON DELETE SET NULL` so deleting a project never deletes its tasks (`V35__add_project_id_to_tasks.sql`); existing `track`/`phase` free-text grouping untouched
  - [x] `project` package: `ProjectController` (`/api/v1/projects` CRUD, `GET /{id}/overview`, `GET/POST/PUT/DELETE /{id}/milestones`, `GET /{id}/tasks`), `ProjectService` computing task counts, estimated/actual hours, milestone completion, and a LOW/MEDIUM/HIGH risk level from overdue tasks + target-date proximity + progress
  - [x] Task→project assignment ships as its own `PATCH /api/v1/tasks/{id}/project` endpoint (mirroring the existing `PATCH /{id}/parent`) rather than threading `projectId` through the high-fan-out `CreateTaskRequest`/`UpdateTaskRequest`/`TaskApiMapper.applyCommonFields` positional chain -- `TaskResponse` gained a read-only `projectId` field so the frontend can display assignment
  - [x] Frontend: `/tasks/projects` (4th tab in the Tasks section, alongside List/Board/Matrix) lists projects as cards; `/tasks/projects/:id` has Overview (progress bar, risk badge, task/hour counts, milestone summary) / Milestones (add, toggle done, delete) / Tasks (assigned tasks, unassign) tabs; the task create/edit form gained a "Project" picker under "More options" that calls the dedicated project-assignment endpoint after task create/update succeeds
  - [x] Test coverage: `ProjectServiceTest` (11 -- CRUD, ownership 404s, overview risk/progress computation across 0/some/all-done tasks, milestone create/update/delete), `ProjectControllerTest` (5 -- slice tests incl. validation)
  - [x] Verified end-to-end in a real browser against a local Postgres + backend (not just unit tests): register → create project → add milestone → create a task with that project selected → task shows up under the project's Tasks tab → Overview reflects real counts. Zero console/page errors.
  - **Scope decision**: a project's "Notes" view (union of notes linked to tasks in the project) was cut from `ProjectDetailPage` for this pass -- `NoteTaskLink` already supports the query, it's just not surfaced as a tab yet. Reasonable follow-up, not required for Projects to be genuinely useful today.
- [x] Phase 8 — Focus sessions
  - [x] `model/FocusSession` (id, userId, taskId nullable, startedAt, endedAt, status RUNNING/PAUSED/COMPLETED/ABANDONED, note, actualMinutes) + `model/FocusSessionPause` child table for pause/resume intervals (`V36__create_focus_sessions.sql`), following the codebase's relational-modeling convention rather than a JSON blob
  - [x] `focus` package: `FocusSessionController` (`POST /api/v1/focus-sessions` start, `PATCH /{id}/pause|resume|stop`, `GET /active`, `GET ?from=&to=`, `GET /analytics?from=&to=`), `FocusSessionService` -- pause math subtracts closed *and* still-open paused intervals from elapsed time; starting a new session auto-abandons any previous RUNNING/PAUSED one (capped at 8h so a forgotten browser tab can't inflate analytics); stopping with `completeTask: true` reuses the existing `TaskService.markComplete`, and `actualMinutes` is summed onto `Task.actualMinutes` (a task can have multiple sessions)
  - [x] Analytics aggregates real session data: total/by-day/by-area minutes, most-productive-hour bucketing, and an estimate-vs-actual divergence list (tasks where actual time differs from `Task.estimatedMinutes` by 25%+)
  - [x] Frontend: `FocusTimerWidget` (persistent bottom-right widget, live-ticking timer, Pause/Resume/Stop with an optional note + "mark task complete" checkbox) mounted globally in `AuthenticatedApp` so it survives page navigation; "Start focus session" wired from the task list row menu and `TaskDetailPage`; "Focus analytics" is a 3rd tab under Insights (bar chart by day, by-area breakdown, divergence list) -- consistent with the "don't over-fragment the sidebar" principle from Phase 2
  - [x] Session-in-progress persistence across a refresh comes for free from `GET /active` being a normal React Query hook (no `localStorage` timer state needed) -- this is why sessions are server-persisted in the first place
  - [x] Test coverage: `FocusSessionServiceTest` (12 -- start/pause/resume/stop state machine, pause-time subtraction incl. an open pause at stop time, the 8h abandonment cap, task actual-minutes accumulation + complete-on-stop, analytics aggregation/divergence-threshold/hour-bucketing), `FocusSessionControllerTest` (6), `FocusTimerWidget.test.tsx` (3), `FocusAnalyticsPanel.test.tsx` (2)
  - [x] Verified end-to-end in a real browser against local Postgres + backend: created a task, started a focus session from the row menu, watched the widget tick, paused, resumed, stopped with a note and "mark complete" checked -- task moved to Done and the widget disappeared -- then confirmed Insights > Focus analytics showed the real session (1 session, correct area, correct most-productive-hour). Zero console/page errors.
  - **Found, not fixed (out of scope for this phase)**: reproduced a pre-existing race in the auth-refresh flow -- on a hard page reload, `AuthProvider`'s own session-restore call to `POST /api/v1/auth/refresh` can race a second, independent refresh triggered by `apiClient.ts`'s 401-retry interceptor (each holds its own in-flight-request dedup, but the two paths don't share one), and since refresh tokens are single-use/rotating, the loser gets a 400 and the user is bounced to `/login`. Reproduced via repeated full-page `page.goto()` navigations in the Playwright smoke test; worked around there by using in-app link clicks instead. Real fix belongs in `AuthProvider`/`apiClient.ts` together (one shared refresh-dedup path), not in this phase's scope -- noted here for a future auth-hardening pass.
- [x] Phase 9 — Weekly review
  - [x] `model/WeeklyReview` (id, userId, weekStartDate, completedAt, summary, linkedNoteId, createdDate) via `V37__create_weekly_reviews.sql`; added `Task.updatedDate` (`V38__add_task_updated_date.sql`, backfilled from `created_at`, kept current by a `@PreUpdate` lifecycle callback on `Task`) since nothing tracked "last touched" before this and stale-task detection needs it
  - [x] Review content is genuinely computed on demand, not snapshotted: `weeklyreview/WeeklyReviewService.getCurrentDraft()` composes completed-this-week / overdue / blocked+waiting / stale (14+ days untouched) task lists straight from `TaskRepository`, habit performance from `HabitService` + `HabitCheckInRepository`'s existing day-bucketed query, and projects-at-risk by calling Phase 7's `ProjectService.getOverview()` per project and filtering out LOW risk -- only the user's *decisions* and free-form summary get persisted, on `POST /api/v1/weekly-reviews`
  - [x] Decisions (reschedule/archive/delete/complete) apply transactionally through existing `TaskService` methods (new `updateDueDate`, existing `updateStatus`/`delete`/`markComplete`) inside one `@Transactional` method -- one bad decision rolls back the whole batch, per the "no partial apply" requirement
  - [x] Frontend: `/weekly-review` stepper (Completed / Overdue / Blocked & waiting / Habit performance / Projects at risk / Stale tasks / Plan & summary) with real data on every step; Overdue and Stale steps get inline Reschedule/Archive/Delete actions that stage a decision (shown as an undoable badge) rather than firing immediately, so nothing touches real data until "Finish review"; final step's free-form summary can optionally also be saved as a note via the existing `createNote` mutation; a "Start this week's review" suggestion card appears on Today once 6+ days have passed since the last completed review (or none exists yet) -- dismissible by simply not clicking it, never a blocking gate
  - [x] Test coverage: `WeeklyReviewServiceTest` (14 -- each draft section's computation incl. week-boundary filtering, stale-task detection, habit-performance math, risk filtering; all four decision types; summary/note persistence), `WeeklyReviewControllerTest` (4), `WeeklyReviewPage.test.tsx` (3)
  - [x] Verified end-to-end in a real browser against local Postgres + backend: created a task overdue since 2020, saw it counted on the Today prompt, opened the review, rescheduled it to a future date (staged as an undoable decision, not applied yet), wrote a summary, clicked Finish -- confirmed back in the Tasks list that the due date was actually updated to the new date. Zero console/page errors.
  - **Scope decision**: the "Decisions" step named in the original plan was folded into inline actions directly on the Overdue and Stale steps rather than a separate flat re-listing step -- same information, one less step to click through. "Link to an existing note" was simplified to "save the summary as a new note" (skips building a note-search-and-link picker); linking to an *existing* note is a reasonable follow-up.
- [ ] Phase 10 — Reminder foundation (backlog)
