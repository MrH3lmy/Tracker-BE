# Issue #309 — Preservation checklist (Lane B capability + contract audit)

Inventory of **what** the Board / Matrix / Task Detail surfaces do today. Not a design. Every
unchecked box below must still be true after the redesign, **except** items explicitly marked
`[BUG — do not preserve]`.

Sources audited: `frontend/src/pages/BoardPage.tsx`, `MatrixPage.tsx`, `TaskDetailPage.tsx`,
`TaskDetailPage.test.tsx`, `frontend/src/components/board/**`, `frontend/src/components/tasks/**`,
`frontend/src/hooks/useApiQueries.ts`, `frontend/src/components/tasks/taskTypes.ts`,
`src/main/java/com/taskpriority/task/api/**`, `service/TaskService.java`,
`service/TaskReadinessService.java`, `repository/TaskDependencyRepository.java`,
`planning/MatrixController.java`.

There is **no `frontend/src/hooks/useBoardState.ts`** in the repo — board state is entirely local to
`BoardPage.tsx` plus React Query cache. Any redesign plan that assumes that hook is wrong.

---

## 1. Board (`/board`, `BoardPage.tsx` + `components/board/`)

### Columns & data
- [ ] Columns come from `GET /api/v1/board-columns` (`useBoardColumnsQuery`), rendered in the order the API returns them (`BoardColumnRecord`: `id`, `name`, `status?`, `position`).
- [ ] Tasks come from a single `GET /api/v1/tasks` call (`useTasksQuery('active')`) — **one query for the whole board**, not one per column.
- [ ] A task is placed in a column strictly by `task.boardColumnId`; tasks with `boardColumnId == null` are silently omitted from the board.
- [ ] Within a column, order is `sortTasksForBoard`: `position` ascending (`undefined` sorts last), tie-broken by `id` ascending.
- [ ] Per-column task **count badge**.
- [ ] Column header carries a status-derived accent (`ACCENT_BY_STATUS`, keyed on `column.status`: BACKLOG/NOT_STARTED, IN_PROGRESS, WAITING, BLOCKED, DONE, CANCELLED).
- [ ] Columns scroll horizontally (`overflow-x-auto`); each column is a fixed-width lane.

### Card content (`BoardCard`)
- [ ] Title rendered as `#{id} {title}`, a `<Link>` to `/tasks/{id}`, with `stopPropagation` so clicking navigates instead of starting a drag.
- [ ] Priority score badge (when `priorityScore` is a number).
- [ ] Due-date badge, formatted via `formatDate`, styled `critical` when overdue.
- [ ] "Important" badge when `task.important`.
- [ ] Recurrence streak badge (`🔥 {recurrence.currentStreak}`) when streak > 0.
- [ ] Left border accent: caution for `important`, critical for overdue.
- [ ] `aria-roledescription="draggable task card"` and an `aria-label` of `"{title}, status {status}"`.
- [ ] Long titles truncate (`truncate`) rather than wrapping the lane.

### Drag / move / keyboard
- [ ] dnd-kit `DndContext` with `closestCenter` collision detection.
- [ ] `PointerSensor` with a 6px activation distance (so a click on the title link is not a drag).
- [ ] `KeyboardSensor` with `sortableKeyboardCoordinates` — **keyboard drag-and-drop must survive** (space/enter to pick up, arrows to move, escape to cancel; this is dnd-kit's built-in behavior, not custom code).
- [ ] `SortableContext` per column with `verticalListSortingStrategy`.
- [ ] Drop target highlight on the hovered column (`isOver` → `bg-brand-soft ring-2 ring-brand`).
- [ ] Dragging card gets a lift affordance (scale + glow, `z-10`).
- [ ] Drop resolves the target column from either a column droppable id (`column-{id}`) or the hovered card's own `boardColumnId`.
- [ ] Target index = index of the hovered card within the column (excluding the dragged card), or "append to end" when dropped on empty column space.
- [ ] Move issues `PATCH /api/v1/tasks/{id}/move` with `{ boardColumnId, position }`.
- [ ] Optimistic reorder: `onMutate` cancels the `tasks('active')` query, snapshots it, and applies `applyOptimisticTaskMove` to the cache.
- [ ] **Rollback on error**: `onError` restores the snapshot (`context.previousActive`).
- [ ] `onSettled` invalidates the whole task family (`tasks`, `planning`, `matrix`, `scheduler`, `calendar`, `projects`).

### Undo
- [ ] After a successful move, a toast fires via `useUndoToast().showUndo(`"{title}" moved.`, …)`; the undo action re-issues `moveTask` with the task's previous `boardColumnId` and previous `position`.
- [ ] Undo toast auto-dismisses (context contract: "auto-dismisses after a few seconds").
- [ ] Undo is client-composed — there is **no server-side undo endpoint**; the redesign cannot assume one.
- [ ] `[BUG — do not preserve]` Undo replays the previous **stored** `position` (a step-scaled value, `POSITION_STEP` multiples assigned by `TaskService.renumber`) into a field the drop handler otherwise treats as a 0-based **index**. Undo therefore does not reliably restore the original slot.
- [ ] `[BUG — do not preserve]` The no-op guard `draggedTask.position === targetIndex` compares a step-scaled stored position against a 0-based index, so it almost never short-circuits; harmless but dead.

### Filters / context
- [ ] Focus `SegmentedControl` — `all` / `work` ("Work") / `training` ("Training & Life") — filters client-side by `task.area` via `matchesFocus` (WORK_AREAS vs TRAINING_AREAS; **area-less tasks count as Training & Life**).
- [ ] Focus is component-local `useState` — **not** persisted, not in the URL, and resets on navigation.
- [ ] `SectionTabs` with `TASK_VIEW_TABS` (shared Tasks/Board/Matrix view switcher) above the header.
- [ ] `PageHeader` title "Board" + description.

### Status semantics
- [ ] Column → status coupling is enforced **server-side** in `TaskService.moveTask`: if the target column has a `status`, the task's status is overwritten with it; moving into a DONE column runs `validateCanComplete` and stamps `completedDate`; moving out of DONE clears `completedDate`. The board never sets status itself.
- [ ] Positions are renumbered server-side in `POSITION_STEP` increments after a move.

### States
- [ ] Loading state while either columns or tasks are loading (`QueryState`).
- [ ] Error state when either query returns an API error (`isQueryError`).
- [ ] Empty state "No board columns configured." when there are zero columns.
- [ ] Per-column empty placeholder "No tasks" with `role="status"`.

---

## 2. Matrix (`/matrix`, `MatrixPage.tsx`)

### Quadrant logic
- [ ] Four quadrants keyed exactly on the backend `PriorityCategory` enum: `DO_NOW` ("Do now"), `SCHEDULE` ("Schedule"), `DELEGATE` ("Delegate"), `DELETE` ("Delete") — each with its own subtitle, accent, badge variant, and empty-state icon/label ("Clear for focus", "Nothing to reserve", "No handoffs", "No clutter found").
- [ ] Quadrant assignment is 100% server-computed (`PriorityEngine` → `Task.priorityCategory`); the FE only buckets by response key. **No client-side quadrant math exists — keep it that way.**
- [ ] Server scope (`TaskService.getMatrixView`): all of the user's tasks **excluding DONE/CANCELLED** and **restricted to `Area.WORK_AREAS`**. Non-work tasks never appear.
- [ ] Summary strip: total task count + a per-quadrant count badge.
- [ ] Per-quadrant count badge in each quadrant header.
- [ ] Defensive shape handling: `supportsQuadrants` — if the response contains none of the four keys, fall back to a raw JSON `<pre>` dump instead of erroring.
- [ ] Card key falls back to `title-index` when `id` is missing.

### Card content
- [ ] Title (fallback "Untitled task"), optional description.
- [ ] Metadata badges: due date (`Due {raw dueDate}`), status (via `formatEnumLabel`), priority score.
- [ ] Collapsible "Priority details" `<details>` disclosure showing `priorityReason`.

### Actions from this surface
- [ ] Manual load: the query is `enabled=false` until the user presses "Load matrix"; the same button then reads "Refresh matrix" and is disabled while fetching. (Inventory only — this is the current behavior, including the fact that it is the **only** action on the page.)
- [ ] `SectionTabs` view switcher.
- [ ] **No other task action exists on Matrix today**: cards are not links, there is no open/complete/status/move/reprioritize affordance, and no navigation to `/tasks/{id}`.

### Readiness truth on Matrix
- [ ] `MatrixController` maps through `TaskApiMapper.toResponse`, so every matrix task **already carries** `blocked`, `ready`, and `blockers[]` (readiness is attached by `computeDerivedFieldsBatch`).
- [ ] `[BUG — do not preserve]` The FE `MatrixTask` interface drops those fields entirely — Matrix shows no readiness or blocker information despite the payload containing it. A blocked task looks identical to a ready one.

### States
- [ ] Loading (including refetch), error, and "response present but empty" states via `QueryState`.

---

## 3. Task Detail (`/tasks/:id`, `TaskDetailPage.tsx`)

### Identity / deep link
- [ ] Route `/tasks/:id`; `id` parsed with `Number(id)`, detail query gated on `Number.isFinite(taskId)`.
- [ ] Header title is `#{id} {title}` — the id is user-visible and used for cross-referencing.
- [ ] Direct deep-linking works (verified in `TaskDetailPage.test.tsx` via `MemoryRouter initialEntries={['/tasks/5']}`).
- [ ] Blocker links navigate to `/tasks/{blockerId}` — task detail must remain reachable from another task detail.
- [ ] "Back to tasks" button navigates to `/tasks` (also used as the form's Cancel target).

### Data
- [ ] `GET /api/v1/tasks/{id}/detail` (`useTaskDetailQuery`) → `{ task, notes, screenshots, linkedNotes }`.
- [ ] `GET /api/v1/tasks` (`useTasksQuery('active')`) supplies the parent-task and dependency pickers.
- [ ] `GET /api/v1/projects` (`useProjectsQuery`) supplies the project picker.

### Editable fields (via `TaskCreateForm mode="edit"`) — every one must survive
- [ ] Title (required; focus + error summary link on invalid)
- [ ] Description (textarea)
- [ ] Status (select; `TaskStatus` union)
- [ ] Due date (date; `min` = start date)
- [ ] Parent task (select over active tasks)
- [ ] Project (select over projects — see project assignment below)
- [ ] Effort (`QUICK` / `MEDIUM` / `DEEP_WORK` / `LARGE`)
- [ ] Risk level (`LOW` / `MEDIUM` / `HIGH` / `CRITICAL`)
- [ ] Follow-up date (date)
- [ ] Blocked reason (**conditional**: shown when status is BLOCKED or a value already exists; **required** while status is BLOCKED)
- [ ] Waiting on (**conditional/required** while status is WAITING, together with a follow-up date)
- [ ] Risk reason (**required** for HIGH/CRITICAL risk; maxLength 500)
- [ ] Important (checkbox)
- [ ] Start date (date; `max` = due date) — in the collapsible "more" section
- [ ] Area (`WORK` / `STUDY` / `PERSONAL` / `HEALTH` / `FAMILY`)
- [ ] Estimated minutes (number, step 15)
- [ ] Actual minutes (number, step 15)
- [ ] Track (maxLength 120)
- [ ] Phase (maxLength 120)
- [ ] Recurrence: frequency, interval ("Every"), days-of-week checkbox group (WEEKLY), day-of-month (MONTHLY), annual month + day (YEARLY)
- [ ] Progressive disclosure: conditional fields appear only when the status/risk that needs them is selected, but an already-populated field stays visible in edit mode.
- [ ] Error summary with links in a fixed field order (`title`, `blockedReason`, `waitingOn`, `followUpDate`, `riskReason`) — links read in visual order.
- [ ] Submit sends `PUT /api/v1/tasks/{id}` with the **full** body from `buildTaskUpdateBody` (unset values sent as explicit `null`, `dependencyIds` echoed back, dates truncated to `yyyy-MM-dd`).
- [ ] Screen-reader announcement on save success/failure via `useAnnouncement`.
- [ ] `aria-busy` on the page while any of update / addDependency / removeDependency / updateTaskProject is pending; all controls disabled via `busy`.

### Project assignment
- [ ] Project is **not** part of the `PUT` body: after a successful task update, if the picker value differs from `task.projectId`, a second call `PATCH /api/v1/tasks/{id}/project` with `{ projectId }` fires (null clears it).
- [ ] The picker re-syncs from the task only when a *different* task id loads, not on every field change.
- [ ] Project mutation additionally invalidates the `projects` query family.

### Readiness + blocker visibility
- [ ] "Dependencies" card header carries `<ReadinessBadge blocked ready showReady />` — Task Detail is one of the triage contexts where the explicit **"Ready"** chip is shown (default elsewhere is blocked-only).
- [ ] `ReadinessBadge` renders "Blocked" (caution + AlertTriangle) when `blocked`, "Ready" (positive + CheckCircle2) when `showReady && ready`, and **nothing** otherwise — the third, unnamed state (`waiting`) must stay visually distinct from both.
- [ ] Readiness badges are a **different badge family** from workflow `Status` chips (`taskStatusVariant`) — the two axes must never be conflated.
- [ ] When `blocked && blockers.length > 0`, `<BlockerDisclosure defaultOpen>` renders "Waiting for N task(s)" with each blocker as a link to `/tasks/{blockerId}` plus its status badge — invariant: *a blocked chip never appears without the "why" one interaction away*.
- [ ] Blocker titles truncate; the list is scroll/expand-safe with many blockers (`BlockerSummary` elsewhere collapses to first + "Show N more").
- [ ] Covered by `TaskDetailPage.test.tsx`: blocked state renders, both blockers listed, "Blocked" chip present, clicking a blocker navigates to its detail page.

### Dependencies
- [ ] "Blocked by" row lists `task.dependencyIds` as `#id` (em-dash when empty). Backend semantics: edge is `(task → blocksTask)` = "task depends on blocksTask", so `dependencyIds` are this task's **prerequisites**. Label is correct today.
- [ ] "Blocks" row lists `task.blockingTaskIds` as `#id` — the **dependents** of this task.
- [ ] "Manage dependencies" button opens `ManageDependenciesDrawer`, pre-filled with this task's id as the dependent side.
- [ ] Add: `POST /api/v1/tasks/{id}/dependencies` `{ blocksTaskId }`; client-side guard rejects non-finite ids and self-dependency (`depId === blocksTaskId`); drawer closes on success.
- [ ] Remove: one "Unlink #{id}" button per entry in `dependencyIds` → `DELETE /api/v1/tasks/{id}/dependencies/{blocksTaskId}`, inside a group labeled `Dependency actions for {title}`.
- [ ] `[GAP — not currently possible]` There is no way to remove a **"Blocks"** edge from this page (removal requires calling with the dependent task's id).
- [ ] Server-side cycle prevention exists (`existsDependencyPath`, recursive CTE over `BLOCKS` edges) — the UI must surface that error, not pre-empt it.
- [ ] `RELATED`-type dependencies are informational and never affect readiness; the UI has no way to create or distinguish them today (`DependencyRequest.dependencyType` is never sent).

### Linked notes
- [ ] "Linked notes" card with a link to `/notes?taskId={id}`; the link label shows `{n} note(s)` from `detail.notes.length`, else "View notes".
- [ ] `[GAP]` `detail.screenshots` and `detail.linkedNotes` are fetched but never rendered.

### Focus session
- [ ] "Start focus session" primary action in the header, shown **only when `task.status !== 'DONE'`**, disabled while pending.
- [ ] `useFocusSessionMutations().startSession(task.id)`; announces success/failure ("Focus session started for \"{title}\".").
- [ ] Invalidates the `focus-sessions` and `tasks` query families.

### States / edge cases
- [ ] Loading (`isLoading || isFetching`), error, and "Task not found." empty state via `QueryState`.
- [ ] Non-numeric `:id` → query never fires, page shows the empty state rather than a request error.
- [ ] Long titles in the page header and in blocker rows.
- [ ] Many blockers / many dependency "Unlink" chips must wrap, not overflow.

---

## 4. Readiness semantics — the contract

**Producer:** `service/TaskReadinessService` is the single authoritative definition (issue #282).

- [ ] `CLOSED_STATUSES = {DONE, CANCELLED}` → `blocked=false, ready=false, blockers=[]`. A closed task is *neither*.
- [ ] `blocked = true` iff ≥1 `BLOCKS`-type prerequisite is in a non-closed status. `RELATED` edges never block.
- [ ] `ready = ACTIONABLE_STATUSES.contains(status) && !blocked`, where `ACTIONABLE_STATUSES = {NOT_STARTED, IN_PROGRESS}`. BACKLOG, WAITING and the manual BLOCKED status are **never ready** even with zero open prerequisites.
- [ ] `blockers[] = {id, title, status}` of each open prerequisite (`TaskBlockerSummary` → `TaskResponse.BlockerRef`), from one batched query (`findOpenBlockers`) — never N+1.
- [ ] Attached to entities by `TaskService.applyReadiness`, called from both `computeDerivedFields` (single) and `computeDerivedFieldsBatch` (lists), so **every** `TaskResponse` on `/tasks`, `/tasks/{id}`, `/tasks/{id}/detail`, `/tasks/today`, `/matrix` carries it.
- [ ] Dependency readiness is orthogonal to the manual workflow `status` field. A WAITING task can expose blockers; a NOT_STARTED task can be blocked. Never render them as one chip.

**Consumer contract (FE):**

- [ ] `taskLenses.taskWorkState()` is the only mapper: `blocked===true` → `blocked`; else `ready===true` → `ready`; else `waiting`. Three mutually exclusive states.
- [ ] `ready` is **never** inferred from `!blocked` (that inference was regression #297 on Today).
- [ ] `blocked` wins over `ready` so a blocked task can never render as actionable.
- [ ] Lens counts (`countTaskLenses`) are computed over the **whole** scope array, never a filtered/paginated slice (#304).
- [ ] `TodayTaskRecord.todayReason` and Today's ordering are server-computed and never re-derived client-side.

**Client-side derivation audit — bugs to fix, not preserve:**

- [ ] `[BUG]` `taskUtils.isOverdue()` falls back to a client-side date comparison (`due < now`, with `setHours(23,59,59,999)`) when `task.overdue` is falsy. The backend already computes `overdue`/`urgent`/`daysLeft` in `PriorityEngine`; the client fallback uses the browser clock/timezone and can disagree with the server. Used by `BoardCard`, `TaskRow`, `renderDueDate`, and the `overdue` signal lens.
- [ ] `[BUG]` `MatrixPage` drops `blocked`/`ready`/`blockers` from the payload (section 2) — Matrix has **no** readiness truth today even though the API supplies it.
- [ ] `[BUG]` `BoardPage`/`BoardCard` render no readiness at all: a blocked task is indistinguishable from a ready one on the board, though `/api/v1/tasks` returns `blocked`, `ready` and `blockers` for every card.
- [ ] `[OK, keep]` Board column bucketing, board sort, focus filter, and Matrix quadrant bucketing are pure re-shaping of server-provided fields — not derivation of truth.
- [ ] `[BUG — semantic drift]` `BoardColumn`'s `ACCENT_BY_STATUS` includes a `BLOCKED` entry keyed on the **column's workflow status**, which is unrelated to dependency `blocked`. Two different meanings of "blocked" already share one visual language.

---

## 5. Cross-cutting behavior to preserve

- [ ] Query keys / invalidation: `invalidateTaskFamily` invalidates `tasks`, `planning`, `matrix`, `scheduler`, `calendar`, `projects` after every task mutation.
- [ ] Optimistic update exists **only** for `moveTask`; all other mutations are invalidate-on-success.
- [ ] All API results are `ApiCallResult`-shaped (`{ ok, data, error }`), checked with `isQueryError` — errors never throw into the render path.
- [ ] Every request is recorded in the `apiClient` rolling history (last 50) for the dev-tools request inspector.
- [ ] Accessibility: `useAnnouncement()` live-region messages on save / focus session; `aria-label` on metadata groups and dependency action groups; `role="status"` on empty placeholders; `aria-busy` on in-flight pages; `sr-only` labels.
- [ ] `SectionTabs` / `TASK_VIEW_TABS` is the shared switcher between Tasks, Board and Matrix — it is defined in `router/routes.tsx`, the single source of truth for routes/tabs.
- [ ] Theme: all colors come from `[data-theme]` tokens (`bg-card`, `text-fg-muted`, `border-line`, `border-t-brand`, …) — no hard-coded colors.

---

## BACKEND CONTRACT GAPS

Things the current API **cannot express**, which the redesign must either design around or accompany with a backend change.

1. **No batch / atomic reorder.** `PATCH /tasks/{id}/move` moves exactly one task. A multi-card reorder, a multi-select drag, or "move column contents" is N sequential requests with no transaction and no partial-failure story.
2. **No undo endpoint and no move receipt.** Undo is a client-composed inverse `move`. The response returns the task's *new* renumbered position, never the previous one, so the client's "previous position" is only its own stale cache value. Concurrent edits silently break undo.
3. **`position` is ambiguous across the wire.** The FE sends a 0-based **index**; the server stores/returns a **step-scaled** ordinal (`POSITION_STEP` multiples via `renumber`). Nothing in `MoveTaskRequest` (`@Min(0) Integer position`) distinguishes the two. Any redesign that reads `task.position` back and re-sends it (undo, keyboard move, "move to top") inherits this.
4. **No column-scoped or paginated board fetch.** `GET /api/v1/tasks` defaults to `size=200`, caps at `500`, and the board requests page 0 with no params. A user with >200 board tasks silently loses cards; there is no per-column pagination, no `hasMore` per column, and the FE ignores the `X-Total-Count` / `X-Has-Next` headers the API does return.
5. **The board query does not filter by status.** `useTasksQuery('active')` sends no `status` param, so `/tasks` returns DONE/CANCELLED tasks too; they only stay off the board because they lack a `boardColumnId` or land in a DONE column. "Active" is a FE label, not a server contract.
6. **Focus filtering is client-side only.** `GET /tasks` accepts a single `area` enum, but the board's Work / Training&Life split is a *set* of areas (`WORK_AREAS` vs `TRAINING_AREAS`, plus "no area counts as Training"). The API cannot express a multi-area filter, so the split cannot move server-side without an API change — and it therefore filters only the already-truncated page.
7. **No readiness filter or sort on any list endpoint.** `blocked` / `ready` are response-only. There is no `?ready=true`, no `?blocked=true`, no ordering by readiness — so any "Ready first" board/matrix lane must be computed over a client-held page (which collides with gap 4).
8. **Matrix has no parameters at all.** `GET /api/v1/matrix` takes no query params: no project scope, no area scope, no include-done, no pagination, no sort. Its WORK-areas-only, exclude-DONE/CANCELLED scope is hard-coded in `TaskService.getMatrixView` and is not discoverable by the client, so the UI cannot honestly label what is being shown or offer a scope switch.
9. **Matrix response shape is an untyped map.** `Map<PriorityCategory, List<TaskResponse>>` omits empty categories entirely (`groupingBy`), carries no counts/totals, and has no envelope — the FE has to probe for known keys (`supportsQuadrants`) and fall back to a JSON dump.
10. **No endpoint moves a task between quadrants.** Quadrant is derived from `priorityScore`/`priorityCategory` by `PriorityEngine`; there is no way to set a category directly, so a "drag between quadrants" interaction is not expressible without a backend change.
11. **Project assignment cannot be part of a task update.** `UpdateTaskRequest` has no `projectId`; it requires the separate `PATCH /tasks/{id}/project`. Saving a task and its project is two non-atomic requests, and a failure of the second leaves the UI reporting "Task updated".
12. **`PUT /tasks/{id}` is full-replace only.** There is no PATCH for arbitrary fields, so every inline edit must send the entire task body (`buildTaskUpdateBody` explicitly nulls unset fields) — last-write-wins, with no optimistic-concurrency token (`updatedDate` is returned but never checked).
13. **Dependency removal is direction-locked.** `DELETE /tasks/{id}/dependencies/{blocksTaskId}` only removes an edge where `{id}` is the dependent. Detail's "Blocks" list has no removal path.
14. **Dependency type is write-only in practice.** `DependencyRequest.dependencyType` exists (`BLOCKS` / `RELATED`) but `TaskResponse` exposes only flat `dependencyIds` / `blockingTaskIds` with no type, so the client cannot tell a required prerequisite from an informational link — while readiness silently uses only `BLOCKS`.
15. **`blockers[]` is one level deep and prerequisite-side only.** No transitive chain, no "what does unblocking this unblock", and no blocker info on the `blockingTaskIds` (dependents) side.
16. **No dependency-candidate endpoint.** The dependency picker is populated from the full `/tasks` page, so it is bounded by gap 4 and cannot search, exclude already-linked tasks, or pre-exclude cycle-creating candidates (cycle detection only surfaces as a server error after submit).
17. **Detail payload is fetch-all.** `GET /tasks/{id}/detail` always returns notes + screenshots + linkedNotes with no field selection or pagination; the page currently uses only `notes.length`.
18. **Board columns are read-only over the API surface the FE uses.** `useBoardColumnsQuery` is a bare GET; there is no create/rename/reorder/archive column mutation in `useApiQueries`, so any column-management affordance in a redesign needs new wiring.
19. **Naming hazard.** `blocksTaskId` in `DependencyRequest` / the DELETE path denotes the **prerequisite** (the task being depended on), which reads as the exact opposite. The FE labels are correct today only by convention; renaming the concept in the UI without a matching API note invites an inversion bug.
