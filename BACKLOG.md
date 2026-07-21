# Backlog

All 10 phases from `PRODUCT_IMPROVEMENT_PLAN.md` are complete — see that document's checklist for what shipped in each one. This file now tracks deliberate scope cuts and follow-ups noted along the way, not planned work for a specific upcoming phase.

**Follow-ups noted during implementation** (none block anything currently shipped; pick up independently):

- **Month-grid drag-and-drop** (Phase 5): dragging a task on the Month calendar view would mean changing `Task.dueDate`, a riskier operation than the Week view's `TaskSchedule` date change that already ships. Month supports click-to-view and click-a-day-to-capture instead.
- **Search result keyboard roving + a "recent items" empty state** (Phase 6): current empty state is a "start typing" prompt; result navigation is click/Tab, not arrow-key roving.
- **Project-scoped Notes tab on `ProjectDetailPage`** (Phase 7): a project's notes would be the union of notes linked to tasks in the project via the existing `NoteTaskLink` — the query is trivial, it's just not surfaced as a tab yet.
- **Focus analytics project rollup** (Phase 8): the area breakdown uses `Task.area` only, not `Task.projectId`, even though Phase 7 (Projects) now exists.
- **Weekly Review "link to an existing note"** (Phase 9): simplified to "save the summary as a new note only" — a note-search-and-link picker for linking to an *existing* note is a reasonable follow-up.
- **Browser push / SSE notifications** (Phase 10): only the `IN_APP` channel is implemented; the inbox is polling-based (60s) rather than real-time push. `NotificationOutboxEntry.channel` is already extensible for a future `BROWSER_PUSH` channel.
- **Habit reminder unification** (Phase 10): the existing purely client-side `useHabitReminders`/`HabitReminderToasts` mechanism (silent/gentle/standard/persistent styles) was kept running as-is, alongside the new server-driven `HABIT` reminder kind, rather than migrated onto it. Retiring the client-only path is real follow-up work.
- **`TASK_START`/`DAILY_PLANNING` reminder kinds** (Phase 10): not implemented — `Task` has no time-of-day field to anchor a "start" reminder to (the Scheduler/`TaskSchedule` mechanism is a separate concept not wired into reminders), and there's no natural daily-planning trigger yet.

**Known pre-existing issue (found during Phase 8, not fixed — out of scope)**: `AuthProvider`'s own session-restore call to `POST /api/v1/auth/refresh` and `apiClient.ts`'s 401-retry-triggered refresh are two independent code paths, each with its own in-flight-request dedup but not sharing one with the other. On a hard page reload where both fire near-simultaneously, the loser's refresh call gets a 400 (refresh tokens are single-use/rotating) and the user is bounced to `/login`. A real fix means unifying both call sites behind one shared refresh-dedup mechanism in `apiClient.ts`. Worth an auth-hardening pass on its own.

Conventions established across all phases, for whoever picks up the above: all new tables get a `user_id BIGINT NOT NULL REFERENCES users(id)` column and an index on it; all new endpoints require auth (default-deny, per `SecurityConfig`) and scope every query by `currentUserService.requireUserId()`; all new frontend data fetching goes through a `use<Thing>Query`/`use<Thing>Mutations` hook in `hooks/useApiQueries.ts`, never a raw `apiJson` call in a page component; `npm run test` (Vitest) runs alongside `lint`/`build` for every change; date-only values go through `lib/dateOnly.ts`. Next free Flyway migration is **V41** (Phase 10 used V39/V40).
