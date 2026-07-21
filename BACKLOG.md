# Backlog: Phases 4-10

Implementation-ready issues for the remaining phases of `PRODUCT_IMPROVEMENT_PLAN.md`. Phases 1-3 are complete (see that document's checklist). Each item below is scoped to be picked up independently; dependencies between items are called out explicitly.

Conventions used throughout: all new tables get a `user_id BIGINT NOT NULL REFERENCES users(id)` column and an index on it, following `V28`/`V29`; all new endpoints require auth (default-deny, per `SecurityConfig`) and scope every query by `currentUserService.requireUserId()`; all new frontend data fetching goes through a `use<Thing>Query`/`use<Thing>Mutations` hook in `hooks/useApiQueries.ts`, never a raw `apiJson` call in a page component.

---

## Phase 4 — Global quick capture

**User story**: As a user, I want to capture a task, note, or habit from anywhere in the app (header, mobile, or a keyboard shortcut) without navigating away from what I'm doing, including quickly typing a task in natural language.

**Scope**: A command-palette-style modal (Ctrl+K / Cmd+K, header button, mobile center action) that can create a Task, Note, or Habit, with local natural-language parsing for the task path.

**Backend tasks**: None required — reuses existing `POST /api/v1/tasks`, `POST /api/v1/notes`, `POST /api/v1/habits`.

**Frontend tasks**:
- Add `cmdk` (or a hand-rolled equivalent consistent with "no unnecessary dependencies" — evaluate against the existing Radix-based `Dialog`/`Popover` primitives first) for the palette shell.
- `quickCaptureContext.tsx` + global keydown listener for Ctrl+K/Cmd+K (respect input-focus context so it doesn't fire while typing elsewhere).
- `components/quickCapture/QuickCaptureModal.tsx`: type switcher (Task/Note/Habit), a simple default form (Title, When, Priority, Project/area) with advanced fields under a "More options" disclosure (Estimate, Recurrence, Dependencies, Follow-up, Risk, Track, Phase, Parent task) reusing `TaskCreateForm`'s field set rather than re-implementing it.
- `lib/naturalLanguageTaskParser.ts`: pure function parsing strings like "Finish payment service tomorrow 4pm #work !important 90m" into `{ title, dueDate, dueTime, tag, important, estimatedMinutes }`. Rule-based (date keywords: today/tomorrow/weekday names, `#tag`, `!important`, `NNm`/`NNh` duration, time `Npm`/`HH:mm`) — no ML/LLM dependency needed for this scope.
- Show a preview/confirmation step when parsing confidence is low (e.g., no recognized date, ambiguous tag) before submitting.
- Wire header "Quick add" button and mobile bottom nav's "Quick add" action to open the palette instead of (or in addition to) navigating to `/tasks?quickAdd=1`.

**Migration requirements**: None.

**Acceptance criteria**:
- Ctrl+K (Cmd+K on Mac) opens the palette from any authenticated route; Escape closes it; focus returns to the trigger on close.
- Creating a task from natural-language input produces the same task shape as the existing Tasks drawer (verified against `CreateTaskPayload`).
- Uncertain parses show an editable preview before save; never silently save a wrong interpretation.
- Fully keyboard-operable; screen-reader announces the modal open/type/result via existing `useAnnouncement()`.

**Test cases**: parser unit tests (date phrases, tags, duration, important flag, combinations, and unparseable input falling back to "title only"); modal open/close/keyboard nav; submit-per-type integration against existing mutations.

**Dependencies**: None (can start immediately).

**Estimated complexity**: M (parser + modal shell), S if reusing `TaskCreateForm` wholesale instead of rebuilding fields.

---

## Phase 5 — Real calendar experience

**User story**: As a user, I want an actual calendar grid (month/week/day) where I can see, create, and reschedule tasks and habits by clicking or dragging, not just a text summary.

**Scope**: Replace `CalendarPage`'s "month summary" card grid with a real month grid; add a week timeline view; deepen the existing Day view (`SchedulerPage`, already good) with drag-to-reschedule.

**Backend tasks**:
- `GET /api/v1/calendar/week?date=` — new endpoint returning 7 days of `{date, scheduledEntries, dueTasks}`, composing `SchedulerService.getDaySchedule()` per day (or a new batched `SchedulerService.getWeekSchedule(startDate)` to avoid 7 round trips — prefer the batched version).
- No changes needed to Month (`/api/v1/calendar/month`) or Day (`/api/v1/scheduler/day`) — both already return what's needed.

**Frontend tasks**:
- `components/calendar/MonthGrid.tsx`: real 7-column grid, current month highlighted, overdue/important indicators per day (reusing the existing `hasOverdue`/`hasImportant`/`taskCount` fields from `/api/v1/calendar/month`), Previous/Next/Today controls, click-a-date to open quick capture pre-filled with that date.
- `components/calendar/WeekTimeline.tsx`: 7-day time-grid view backed by the new week endpoint; drag a task between days calls `PUT /api/v1/scheduler/tasks/{id}` with the new date (reuse `useSchedulerMutations().scheduleTask`).
- Extend `SchedulerTimeline` (already used in Day view) with drag-and-drop time-slot changes using the existing `@dnd-kit` dependency already in the project (see `BoardPage`'s usage for the pattern).
- Existing ICS export button stays as-is.
- Timezone/date handling: audit every date-only field (`dueDate`, `scheduledDate`) to confirm it's parsed as UTC-midnight the way `PlanningPage.parsePlannerDate` already does, not via a raw `new Date(string)` that shifts by local offset — reuse that exact parsing helper (extract it into a shared `lib/dateOnly.ts` first).

**Migration requirements**: None.

**Risks**: drag-and-drop across a full month grid has more edge cases (multi-day drag targets, keyboard equivalents for accessibility) than the existing single-day board drag — budget extra time for keyboard-operable alternatives (e.g., a "Move to..." menu item alongside drag).

**Acceptance criteria**: Month loads current month automatically; Prev/Next/Today all work; a task due on a visible day renders on that day; dragging a task to a new day persists via the existing schedule endpoint and is reflected without a full page reload; ICS export still works; no date shifts by a day in any timezone (test explicitly at UTC-11 and UTC+13).

**Test cases**: month grid rendering for months with 4/5/6 calendar rows; week endpoint aggregation; drag-and-drop persists correct date; date-only parsing at timezone extremes (backend `LocalDate` tests already exist as a pattern in `RecurrenceServiceTest` — mirror it).

**Dependencies**: Extract `lib/dateOnly.ts` first (shared by this and any future date work).

**Estimated complexity**: L.

---

## Phase 6 — Global search

**User story**: As a user, I want to search across tasks, notes, habits, and tags from one place and jump straight to a result, including via the command palette.

**Scope**: `GET /api/v1/search`, a `/search` page, and Ctrl+K integration (builds on Phase 4's palette).

**Backend tasks**:
- New `search` package: `SearchController`, `SearchService`.
- `GET /api/v1/search?q=&type=&status=&due=&area=&tag=&page=&size=` — query params map to filters; `type` restricts to `task|note|habit|tag`; combine results into a paginated envelope `{ items: [{type, id, title, snippet, url}], page, size, totalElements }`.
- Backing queries: extend `TaskRepository`/`NoteRepository`/`HabitRepository`/`TagRepository` with `ILIKE`-based search methods (Postgres) or reuse `NoteSpecifications`' existing dynamic-filter pattern for notes; for tasks/habits, simple `title ILIKE %q%` is enough for v1 (no need for full-text search infra yet).
- **Indexes**: `V33__add_search_indexes.sql` — `CREATE INDEX idx_tasks_user_title ON tasks (user_id, lower(title))`, equivalent for `notes.title`, `habits.title`; consider a Postgres trigram index (`pg_trgm`) if substring search performance matters at scale — flag as a follow-up, don't block v1 on it.
- Respect existing soft-delete/`deleted` flags; never return deleted tasks.

**Frontend tasks**:
- `hooks/useApiQueries.ts`: `useSearchQuery(filters)`.
- `pages/SearchPage.tsx` at `/search` (added to the secondary nav slot, alongside Settings/Import): input + filter chips (`type:task`, `status:blocked`, `due:this-week`, `area:work`, `tag:decision` — parse these as a mini-DSL split on the first `:` in each space-separated token, similar spirit to the natural-language parser in Phase 4) + paginated result list, each result linking to its detail page (`/tasks/:id`, or the relevant note/habit view).
- Ctrl+K palette (Phase 4) gets a "search mode": typing without a recognized quick-capture pattern falls through to live search-as-you-type via this endpoint, with results navigable by arrow keys + Enter.

**Migration requirements**: `V33__add_search_indexes.sql` (see above; bump the number if Phase 5/7 land migrations first — always take the next free `V<n>`).

**Acceptance criteria**: search returns matches across all four types; filter tokens narrow results correctly and combine (AND semantics); results paginate; keyboard-only users can search and navigate to a result entirely via the palette; empty query shows recent items or a clear empty state (never a blank screen).

**Test cases**: backend — search each entity type independently and combined, filter-token parsing, pagination boundaries, soft-deleted exclusion, user isolation (user A never sees user B's results); frontend — DSL token parsing unit tests, palette search-mode keyboard nav.

**Dependencies**: Phase 4's command palette shell (for the in-palette search mode) — the standalone `/search` page has no dependency and can ship first.

**Estimated complexity**: M.

---

## Phase 7 — Projects and goals

**User story**: As a user, I want to group related tasks and notes under a Project with a target date, milestones, and a progress/risk summary, without losing the flexibility of `track`/`phase` grouping I already use.

**Scope**: First-class `Project`/`Milestone` entities; project list/overview/milestones/tasks/notes/progress views; link existing tasks to a project.

**Backend tasks**:
- New `model/Project.java`, `model/Milestone.java` entities. `Project`: id, userId, name, description, status (enum: `PLANNING/ACTIVE/AT_RISK/ON_HOLD/DONE/ARCHIVED`), startDate, targetDate, area, goal (text), ownerUserId (defaults to userId — future-proofing for eventual sharing, not used for access control yet), createdDate. `Milestone`: id, userId, projectId, title, targetDate, completedDate, status.
- Add `Task.projectId` (nullable `BIGINT`, FK to `projects.id`) — additive column, existing `track`/`phase` stay as-is and keep working for anyone not using Projects yet; do not remove or repurpose them.
- New `project` package: `ProjectController` (`/api/v1/projects`: CRUD, `GET /{id}/overview` combining task/note/time rollups), `MilestoneController` (`/api/v1/projects/{id}/milestones`), `ProjectService` computing: task counts by status, estimated-vs-actual minutes (sum `Task.estimatedMinutes`/`actualMinutes` for tasks in the project — reuse, don't duplicate, the capacity-risk math already in `PlanningService.getProjectBoard()`), risk summary (reuse `PlannerRiskResponse`'s LOW/MEDIUM/HIGH shape for consistency).
- `NoteTaskLink` already links notes to tasks; a project's "notes" view is simply the union of notes linked to any task where `task.projectId = :projectId` — no new note-project link table needed.
- Validation: `targetDate` after `startDate` (Bean Validation `@AssertTrue`, same pattern as task start/due date validation already in the codebase); milestone `targetDate` should warn (not block) if past the project's `targetDate`.

**Frontend tasks**:
- `pages/ProjectsPage.tsx` (list, under Tasks section as a 4th view — "Projects" tab in `TASK_VIEW_TABS` — or its own nav slot if it grows past a simple list; start under Tasks per the original IA note "Projects placeholder only if not implemented yet" — now it is implemented, so promote it out of placeholder status here).
- `pages/ProjectDetailPage.tsx` at `/tasks/projects/:id`: overview (progress ring, risk badge, estimated-vs-actual), Milestones list, Tasks (filtered task list reusing `TaskListView`), Notes (filtered note list reusing existing notes components).
- `hooks/useApiQueries.ts`: `useProjectsQuery`, `useProjectQuery(id)`, `useProjectMutations()`, `useMilestoneMutations()`.
- Task create/edit form: add an optional Project picker (under "More options", alongside track/phase/parentTaskId) that also lets someone set `track`/`phase` manually — don't force a migration of existing free-text grouping.

**Migration requirements**: `V33__create_projects.sql` (projects, milestones tables + indexes), `V34__add_project_id_to_tasks.sql` (nullable FK + index). Forward-only; no backfill needed since the column is nullable and additive.

**Acceptance criteria**: create/edit/archive a project; add milestones; assign tasks to a project via the task form; project overview shows real counts (not placeholders) computed from actual linked tasks; deleting a project does not delete its tasks (set `projectId` to null, confirmed via a dialog, not a cascade delete).

**Test cases**: entity/migration tests (mirror `HabitsMigrationPostgresTest`'s pattern for a Testcontainers-backed migration test); `ProjectServiceTest` (progress/risk computation with 0, some, and all tasks done); `ProjectControllerTest` validation slice test; user-isolation test (project from user A invisible to user B).

**Dependencies**: None technically, but pairs naturally with Phase 5 (calendar) since project target dates and milestones are calendar-relevant.

**Estimated complexity**: L.

---

## Phase 8 — Focus sessions

**User story**: As a user, I want to start a focus timer against a task, pause/resume/stop it, and have the actual time automatically recorded, with analytics on where my time actually goes versus my estimates.

**Scope**: Server-persisted focus sessions tied to `Task.estimatedMinutes`/`actualMinutes`; start/pause/resume/stop UI; analytics.

**Backend tasks**:
- New `model/FocusSession.java`: id, userId, taskId (nullable — allow a session with no task, e.g. general deep work), startedAt, pausedIntervals (store as a `List<Interval>` via a child table `focus_session_pauses(session_id, paused_at, resumed_at)` rather than a JSON blob, consistent with this codebase's preference for relational modeling over JSON columns — see how `TaskDependency`/`NoteBlock` are modeled), endedAt, status (`RUNNING/PAUSED/COMPLETED/ABANDONED`), note (nullable text), actualMinutes (computed on stop = elapsed minus paused time).
- `focus` package: `FocusSessionController` (`POST /api/v1/focus-sessions` start, `PATCH /{id}/pause`, `PATCH /{id}/resume`, `PATCH /{id}/stop` body `{ note?, completeTask? }`, `GET /api/v1/focus-sessions?from=&to=`), `FocusSessionService`.
- On stop with `completeTask: true` and a linked task: call the existing `TaskService.markComplete(taskId)` (reuse, don't duplicate completion logic) and add `actualMinutes` to `Task.actualMinutes` (sum, since a task can have multiple sessions).
- **Abandoned/interrupted sessions**: a session left `RUNNING` for longer than a configurable threshold (e.g. 4 hours, `app.focus.session.max-hours` property) should be treated as abandoned when next queried — either a `@Scheduled` sweep (first scheduled job in the codebase — coordinate with Phase 10's reminder worker so there's only one scheduling mechanism, not two independently invented ones) or a lazy check-on-read that flips stale `RUNNING` sessions to `ABANDONED` with `actualMinutes` capped at the threshold. Prefer the lazy check for v1 — simpler, no new infra.
- Analytics endpoint: `GET /api/v1/focus-sessions/analytics?from=&to=` returning: total focus minutes by day, by project/area (join through `Task.area`/`Task.projectId` once Phase 7 lands, else just `Task.area`), estimated-vs-actual per task (tasks where `actualMinutes` diverges from `estimatedMinutes` by more than e.g. 25%), and most productive hour-of-day (bucket session start times).

**Frontend tasks**:
- `components/focus/FocusTimerWidget.tsx`: persistent small widget (footer or header) showing running/paused state, elapsed time, pause/resume/stop controls — visible from any page once a session is active (state lives in a `focusSessionContext.tsx`, mirroring how `undoToastContext`/`announcementContext` are done).
- Start a session from a task's detail page or list row ("Start focus session" action).
- `pages/FocusAnalyticsPage.tsx` — likely a tab under Insights (`InsightsPage`, alongside Task/Habit analytics) rather than a new top-level nav item, per the same "don't over-fragment the sidebar" principle applied in Phase 2.
- Persist "session in progress" across a page refresh: on load, `GET /api/v1/focus-sessions?status=RUNNING` (or a dedicated `/active` endpoint) so the timer widget can resume showing state — this is exactly why sessions are server-persisted, not `localStorage`-only.

**Migration requirements**: `V35__create_focus_sessions.sql` (focus_sessions + focus_session_pauses tables, indexes on `user_id`, `task_id`, `started_at`).

**Acceptance criteria**: start/pause/resume/stop all persist correctly across a page reload; stopping with "complete task" checked marks the task done and adds to its actual minutes; an abandoned session (browser closed mid-session) is handled without corrupting analytics (capped duration, marked ABANDONED, not silently counted as hours of focus); analytics numbers are computed from real session data, not estimates.

**Test cases**: `FocusSessionServiceTest` (start/pause/resume/stop state machine, pause-time subtraction math, abandonment threshold), analytics aggregation tests (day/area/hour bucketing, estimate-divergence detection), controller slice tests for each transition including invalid ones (e.g. stopping an already-stopped session returns 409 or 400, not 500).

**Dependencies**: None required; richer with Phase 7 (project-level focus analytics) but works standalone against `Task.area` in the meantime.

**Estimated complexity**: L.

---

## Phase 9 — Weekly review

**User story**: As a user, I want a guided end-of-week flow that shows me what I finished, what's stuck, and helps me decide what to do about it, ending with a plan for next week.

**Scope**: A multi-step guided review UI backed by a persisted review record; recommendations generated from existing services; optional note link.

**Backend tasks**:
- New `model/WeeklyReview.java`: id, userId, weekStartDate, completedAt, summary (text, user-editable free-form recap), linkedNoteId (nullable FK to `notes.id`), createdDate.
- `weeklyreview` package: `WeeklyReviewController` (`GET /api/v1/weekly-reviews` list, `POST /api/v1/weekly-reviews` create/complete, `GET /api/v1/weekly-reviews/{id}`, `GET /api/v1/weekly-reviews/current-draft` — computes the review *content* live from existing services without persisting until the user finishes), `WeeklyReviewService`.
- Review content is **not stored as a snapshot table** — it's computed on demand from existing data (completed tasks via `TaskRepository` + date range, overdue via `DashboardService`, blocked/waiting via the same query `HomeService` already added, habit performance via `HabitService`/`HabitCheckInRepository`, projects-at-risk via Phase 7's `ProjectService` once it exists, stale tasks = active tasks with no `completedDate`/status change in >14 days — needs a `Task.updatedDate` column if one doesn't exist yet; check `Task` entity first, add via migration if missing). Only the user's *decisions* (reschedule/archive/delete choices, the free-form summary, next-week plan) get persisted on the `WeeklyReview` record plus corresponding mutations against the underlying tasks (e.g. "archive this task" during review just calls the existing status-change endpoint).
- `POST /api/v1/weekly-reviews` completion payload includes the decisions batch (task id -> action) and applies them transactionally via existing `TaskService` methods — no new task-mutation logic, just orchestration.

**Frontend tasks**:
- `pages/WeeklyReviewPage.tsx` (or a dedicated flow reachable from Insights/Today, not necessarily its own sidebar item): stepper UI — Completed / Overdue / Blocked & waiting / Habit performance / Projects at risk / Stale tasks / Decisions / Plan next week / Summary — each step a `Card` with real data and inline actions (reschedule = opens a date picker calling `updateTask`; archive/delete reuse existing task actions with the same undo-toast pattern from Phase 1).
- Final step: free-form summary textarea, optional "link to a note" (creates or links an existing note via `useNoteMutations().createNote`/`createTaskLink` reused as-is), "Finish review" button that posts the whole batch.
- Show a "Start this week's review" prompt on Today once 6+ days have passed since the last completed review (`GET /api/v1/weekly-reviews?limit=1` check) — not a hard gate, just a suggestion card, consistent with "no forced flows."

**Migration requirements**: `V36__create_weekly_reviews.sql`; possibly `V37__add_task_updated_date.sql` if `Task` has no last-modified timestamp yet (check first — if `updatedDate` doesn't exist, "stale tasks" needs it, and it's broadly useful beyond this feature too).

**Acceptance criteria**: every review step shows real, current data (no mocked/placeholder counts); decisions made during review actually apply to the underlying tasks; a completed review is retrievable later; skipping the review entirely has no negative effect (it's optional, not a blocking gate).

**Test cases**: `WeeklyReviewServiceTest` (each content section's computation, using fixtures similar to `HomeServiceTest`'s pattern), decision-application integration test (batch of reschedule/archive/delete decisions all land correctly, transactionally — one failure shouldn't partially apply), controller tests.

**Dependencies**: Reuses `HomeService`'s waiting/blocked/follow-up logic where it overlaps (extract shared filtering into a small helper if duplication starts to hurt) and Phase 7's `ProjectService` for the "projects at risk" section (degrade gracefully — omit that section — if Phase 7 hasn't shipped yet).

**Estimated complexity**: M-L.

---

## Phase 10 — Reminder foundation

**User story**: As a user, I want to be reminded about due tasks, start times, follow-ups, habits, daily planning, and my weekly review reliably, even if my browser tab isn't open, with control over quiet hours and snoozing.

**Scope**: The first genuinely server-driven, always-on delivery mechanism in this codebase (today, `Habit.reminderEnabled`/`reminderTime` are config-only with zero delivery). This is the largest and riskiest phase — ship it last, and ship it incrementally within itself (see sub-phases below).

**Backend tasks** (in dependency order — each sub-step is independently shippable):
1. **User timezone + quiet hours**: add `timezone` (IANA string, default `UTC`) and `quiet_hours_start`/`quiet_hours_end` (nullable `LocalTime`) to `users` table. Small, low-risk, unlocks everything else.
2. **Reminder schedule persistence**: `model/Reminder.java` — id, userId, kind (`TASK_DUE/TASK_START/FOLLOW_UP/HABIT/DAILY_PLANNING/WEEKLY_REVIEW`), referenceId (nullable — task/habit id, null for daily/weekly), scheduledFor (`Instant`, computed in UTC from the source event + user timezone), status (`PENDING/SENT/SNOOZED/DISMISSED/FAILED`), snoozedUntil (nullable `Instant`), createdDate. Reminders are *derived* rows, recomputed/upserted when their source changes (task due date edited -> its `TASK_DUE` reminder row is updated, not orphaned) — handle this via a hook in `TaskService`/`HabitService` save paths, or a periodic reconciliation job; the hook approach is more correct (reminders never point at a stale due date) so prefer it, accepting the small coupling cost.
3. **Outbox-based delivery events**: `model/NotificationOutboxEntry.java` — id, userId, reminderId, channel (`IN_APP/BROWSER_PUSH`, extensible), payload (title/body/link), status (`PENDING/SENT/FAILED`), attempts, nextAttemptAt, idempotencyKey (unique constraint — `reminderId + channel`, so re-running the producer never double-enqueues). A `@Scheduled` **producer** job (every minute) finds `Reminder`s with `scheduledFor <= now AND status = PENDING`, respects quiet hours (defer `scheduledFor` to the end of quiet hours rather than dropping it), and inserts outbox rows. A separate `@Scheduled` **dispatcher** job reads `PENDING` outbox rows and delivers them, with exponential backoff on `attempts` for `FAILED` rows (retry handling) — this two-job split (producer/dispatcher) is the standard transactional-outbox shape and keeps "decide what's due" separate from "actually deliver it," which matters once a second channel (email, mobile push) gets added later.
4. **Notification inbox**: `GET /api/v1/notifications` (paginated, filterable by read/unread), `PATCH /api/v1/notifications/{id}/read`, `PATCH /api/v1/notifications/{id}/snooze` (body: new time, creates a new `Reminder` row and marks the old outbox entry dismissed) — this is what "Snooze" means operationally: not pausing a timer, but rescheduling a fresh reminder.
5. **Browser notifications channel**: frontend requests Notification permission once (respect a dismiss/never-ask-again choice, don't nag); a lightweight polling or (preferably) SSE/WebSocket endpoint (`GET /api/v1/notifications/stream`) pushes new outbox entries to connected clients, which then call the browser Notification API. Polling every 30-60s is an acceptable v1 fallback if SSE is out of scope for the first cut — call this out explicitly as a follow-up rather than silently shipping only polling forever.

**Frontend tasks**:
- `pages/SettingsPage.tsx`: add timezone picker + quiet hours fields (reuse the existing `WeeklyHoursEditor`-style UI, generalized, or a simpler two-time-input pair) — this is genuinely user-facing config, keep it in the main Settings sections, not buried in Developer configuration.
- `components/notifications/NotificationInbox.tsx`: bell icon in the header (next to Quick Add) with unread count badge, dropdown/panel listing notifications, mark-read, snooze action.
- Migrate the existing `HabitReminderToasts` (currently a purely client-side, tab-must-be-open mechanism reading `habit.reminderEnabled`/`reminderTime` locally) to consume the new server-driven `HABIT` reminder kind instead, once delivery exists — don't run two parallel habit-reminder systems; this migration is part of Phase 10, not optional cleanup for later.

**Migration requirements**: `V38__add_user_timezone_and_quiet_hours.sql`, `V39__create_reminders.sql`, `V40__create_notification_outbox.sql`. All forward-only, all `user_id`-scoped where applicable (`Reminder`/`NotificationOutboxEntry` both carry `user_id` directly for query simplicity even though it's derivable via the reminder, matching this codebase's existing preference for direct `user_id` columns over always joining).

**Risks**: this is the only phase introducing `@Scheduled` jobs into a codebase that has never had one — get the idempotency key and transactional boundaries right the first time (test concurrent producer runs don't double-enqueue); clock/timezone bugs here are user-visible and annoying (test explicitly with a user in `Pacific/Kiritimati` (UTC+14) and `Etc/GMT+12` (UTC-12) to catch date-boundary mistakes, mirroring the timezone-extreme testing called out in Phase 5).

**Acceptance criteria**: a task due tomorrow at 9am generates exactly one reminder, delivered once, respecting the user's quiet hours; snoozing creates a new reminder at the chosen time and doesn't re-fire the old one; closing the browser tab does not prevent the reminder from existing server-side (verified by checking the outbox/notification row exists even with no client connected); no duplicate notifications from a producer job running twice for the same minute (idempotency key holds).

**Test cases**: reminder-computation tests (quiet-hours deferral, timezone conversion at DST boundaries and the UTC+14/UTC-12 extremes), outbox idempotency test (run producer twice, assert one row), dispatcher retry/backoff test, snooze-creates-new-reminder test, full migration test (Testcontainers Postgres, mirroring `NotesBodyMigrationPostgresTest`'s pattern).

**Dependencies**: Should land after Phase 8 (focus sessions) and 9 (weekly review) if those also want reminder kinds (`DAILY_PLANNING`/`WEEKLY_REVIEW`) — but the `TASK_DUE`/`TASK_START`/`FOLLOW_UP`/`HABIT` kinds have no such dependency and can ship as soon as timezone/quiet-hours (step 1) lands.

**Estimated complexity**: XL. Recommend splitting into at least 3 separate PRs matching sub-steps 1-2, 3-4, and 5 above.
