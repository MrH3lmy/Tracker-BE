# Backlog: Phases 9-10

Implementation-ready issues for the remaining phases of `PRODUCT_IMPROVEMENT_PLAN.md`. Phases 1-8 are complete (see that document's checklist). Each item below is scoped to be picked up independently; dependencies between items are called out explicitly.

Conventions used throughout: all new tables get a `user_id BIGINT NOT NULL REFERENCES users(id)` column and an index on it, following `V28`/`V29`; all new endpoints require auth (default-deny, per `SecurityConfig`) and scope every query by `currentUserService.requireUserId()`; all new frontend data fetching goes through a `use<Thing>Query`/`use<Thing>Mutations` hook in `hooks/useApiQueries.ts`, never a raw `apiJson` call in a page component. `npm run test` (Vitest) is real and runs alongside `lint`/`build` for every phase — see Phase 4's notes in `PRODUCT_IMPROVEMENT_PLAN.md`. Date-only values now go through `lib/dateOnly.ts` (Phase 5) — reuse it, don't reinvent UTC-safe parsing again. Next free Flyway migration is **V37** (Phase 8 used V36).

**Left for a later pass**: Month-grid drag-and-drop (Phase 5); search result keyboard roving and a "recent items" empty state (Phase 6); a project-scoped Notes tab on `ProjectDetailPage` (Phase 7, union of notes linked to tasks in the project via the existing `NoteTaskLink` — the query is trivial, it's just not surfaced as a tab yet); Phase 8's focus-analytics area breakdown uses `Task.area` only, not `Task.projectId` (a project-level focus rollup is a reasonable follow-up now that Phase 7 exists) — see each phase's notes in `PRODUCT_IMPROVEMENT_PLAN.md`.

**Known pre-existing issue (found during Phase 8, not fixed — out of scope)**: `AuthProvider`'s own session-restore call to `POST /api/v1/auth/refresh` and `apiClient.ts`'s 401-retry-triggered refresh are two independent code paths, each with its own in-flight-request dedup but not sharing one with the other. On a hard page reload where both fire near-simultaneously, the loser's refresh call gets a 400 (refresh tokens are single-use/rotating) and the user is bounced to `/login`. A real fix means unifying both call sites behind one shared refresh-dedup mechanism in `apiClient.ts`. Worth an auth-hardening pass independent of Phases 9-10.

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

**Migration requirements**: `V37__create_weekly_reviews.sql`; possibly `V38__add_task_updated_date.sql` if `Task` has no last-modified timestamp yet (check first — if `updatedDate` doesn't exist, "stale tasks" needs it, and it's broadly useful beyond this feature too).

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

**Migration requirements**: `V39__add_user_timezone_and_quiet_hours.sql`, `V40__create_reminders.sql`, `V41__create_notification_outbox.sql`. All forward-only, all `user_id`-scoped where applicable (`Reminder`/`NotificationOutboxEntry` both carry `user_id` directly for query simplicity even though it's derivable via the reminder, matching this codebase's existing preference for direct `user_id` columns over always joining).

**Risks**: this is the only phase introducing `@Scheduled` jobs into a codebase that has never had one — get the idempotency key and transactional boundaries right the first time (test concurrent producer runs don't double-enqueue); clock/timezone bugs here are user-visible and annoying (test explicitly with a user in `Pacific/Kiritimati` (UTC+14) and `Etc/GMT+12` (UTC-12) to catch date-boundary mistakes, mirroring the timezone-extreme testing called out in Phase 5).

**Acceptance criteria**: a task due tomorrow at 9am generates exactly one reminder, delivered once, respecting the user's quiet hours; snoozing creates a new reminder at the chosen time and doesn't re-fire the old one; closing the browser tab does not prevent the reminder from existing server-side (verified by checking the outbox/notification row exists even with no client connected); no duplicate notifications from a producer job running twice for the same minute (idempotency key holds).

**Test cases**: reminder-computation tests (quiet-hours deferral, timezone conversion at DST boundaries and the UTC+14/UTC-12 extremes), outbox idempotency test (run producer twice, assert one row), dispatcher retry/backoff test, snooze-creates-new-reminder test, full migration test (Testcontainers Postgres, mirroring `NotesBodyMigrationPostgresTest`'s pattern).

**Dependencies**: Should land after Phase 8 (focus sessions) and 9 (weekly review) if those also want reminder kinds (`DAILY_PLANNING`/`WEEKLY_REVIEW`) — but the `TASK_DUE`/`TASK_START`/`FOLLOW_UP`/`HABIT` kinds have no such dependency and can ship as soon as timezone/quiet-hours (step 1) lands.

**Estimated complexity**: XL. Recommend splitting into at least 3 separate PRs matching sub-steps 1-2, 3-4, and 5 above.
