# Issue #309 — Test & Regression Inventory: Board / Matrix / Task Detail redesign

Lane C deliverable. Scope: what is already covered, what the redesigned surfaces need,
and the non-negotiable regression guards around readiness semantics.

Nothing in this document changes existing tests. It is an inventory plus a spec for new ones.

---

## 0. Surfaces in scope and their current test status

| Surface | Source | Test file | Status |
|---|---|---|---|
| Board | `frontend/src/pages/BoardPage.tsx` | — | **No test file at all** |
| Board column | `frontend/src/components/board/BoardColumn.tsx` | — | **None** |
| Board card | `frontend/src/components/board/BoardCard.tsx` | — | **None** |
| Matrix | `frontend/src/pages/MatrixPage.tsx` | — | **None** |
| Task Detail | `frontend/src/pages/TaskDetailPage.tsx` | `frontend/src/pages/TaskDetailPage.test.tsx` | 1 test, 71 lines |
| Readiness badge | `frontend/src/components/tasks/ReadinessBadge.tsx` | — | **None** (only exercised transitively) |
| Blocker disclosure | `frontend/src/components/tasks/BlockerDisclosure.tsx` | — | **None** directly; covered via `TasksPage.test.tsx` |
| Blocker summary | `frontend/src/components/tasks/BlockerSummary.tsx` | — | **None** |
| Readiness logic | `frontend/src/components/tasks/taskLenses.ts` | `frontend/src/components/tasks/taskLenses.test.ts` | Strong |
| Task list | `frontend/src/pages/TasksPage.tsx` | `frontend/src/pages/TasksPage.test.tsx` | Strong, 561 lines |

**Headline finding: two of the three redesigned surfaces (Board, Matrix) have zero automated
coverage today.** Any regression in Board drag/drop, keyboard move, column bucketing, Matrix
quadrant partitioning, or readiness rendering on either surface will ship silently.

---

## 1. Existing coverage that would catch a regression

### 1.1 Frontend — readiness core (strongest existing guard)

`frontend/src/components/tasks/taskLenses.test.ts`

- `taskWorkState` is asserted over **all seven statuses** (`BACKLOG`, `NOT_STARTED`, `IN_PROGRESS`,
  `WAITING`, `BLOCKED`, `DONE`, `CANCELLED`) for the full `blocked` × `ready` matrix:
  - `blocked=false, ready=false` → `waiting` (the `ready = !blocked` regression case)
  - `blocked=false, ready=true` → `ready`
  - `blocked=true, ready=*` → `blocked` (blocked always wins)
- Absent fields (`undefined`/`undefined`) → `waiting`, never `ready`.
- `matchesLens` — `WAITING`/`BACKLOG`/manually-`BLOCKED` rows with `blocked=false, ready=false`
  are excluded from both the Ready and the Blocked lens and land in Waiting.
- `countTaskLenses` asserts **exact partition**: `ready + blocked + waiting === all`.
- `countTaskSignals` counts overdue/followUp/important independently of work state.
- `isTaskLens` rejects unknown URL values.

This file is the single best existing defence against `ready = !blocked`. It is pure-function
level, though — it does not prove any *surface* consumes it.

### 1.2 Frontend — TasksPage (`frontend/src/pages/TasksPage.test.tsx`)

Readiness and blockers:
- "labels each row from the backend ready/blocked fields and never from `!blocked`"
- "counts the work-state rail over the whole scope and partitions it exactly"
- "filters to only backend-ready tasks when the Ready lens is pressed"
- "reads the lens from the URL so a link into `?readiness=blocked` lands on blocked work"
- "shows the first blocker inline and reveals the rest through an operable `+n` control"

Actionability containment:
- Ready/Blocked lenses and the Overdue signal do not suppress Done/Archived scopes.
- Returning to Active lands on a defined state (All, no signals).
- A `readiness` URL param is ignored while a history scope is showing.

Actions & state:
- Row complete + undo, status change + undo, row-menu delete, drawer create (incl. subtask).
- Focus session / follow-up / dependencies / notes / subtask / delete reachable **without hover**.
- Loading, error+retry, first-task empty, "nothing ready → point at blocked work", filters-match-nothing,
  empty-archive states.

Responsive / a11y (the pattern to copy for Board and Matrix):
- Long title stays reachable — asserts `line-clamp-2` + `wrap-anywhere`, not one-line clipping.
- Truncated project name exposed in full to AT.
- Subtasks are a **nested** `role="list"` named `Subtasks of <title>`, not a flat sibling row.
- **No horizontal overflow**: asserts `container.querySelector('.overflow-x-auto')` is null and
  no `min-w-4xl`-style fixed-width wrapper exists.
- Result count announced as one contextual `role="status"` message, updated on lens change.

### 1.3 Frontend — Task Detail (`frontend/src/pages/TaskDetailPage.test.tsx`)

Exactly one test: "shows the blocked readiness state with an expanded list of blockers, and
navigates to a blocker on click". Fixture is `blocked=true, ready=false` with two blockers;
asserts both blocker titles render, the `Blocked` label renders, and clicking a blocker link
routes to `/tasks/10`.

Gap: only the `blocked=true` path exists. Nothing covers `blocked=false, ready=true`,
`blocked=false, ready=false`, or the empty-`blockers[]` case.

### 1.4 Frontend — Today & Project Detail (readiness regressions already pinned)

- `TodayPage.test.tsx`: "classifies tasks by the backend-provided `ready` field, not by inverting
  `blocked` (issue #297 regression)"; groups ready by overdue/due-today/scheduled-today and shows
  blocked separately **with blocker details**; loading/empty/error+retry.
- `ProjectDetailPage.test.tsx`: "counts and filters 'Ready to work' using the backend `ready` field,
  not just the absence of `blocked` (issue #297 regression)"; Blocked command tile deep-links to the
  Tasks tab pre-filtered to blocked.

### 1.5 Backend

`src/test/java/com/taskpriority/task/api/TaskDependencyReadinessIntegrationTest.java` — the
authoritative contract test, and it already treats the three fields as independent:
- `taskWithNoDependenciesIsReadyWhenOtherwiseActionable` → `blocked=false`, `ready=true`, `blockers=[]`
- `readinessHonorsWorkflowActionabilityAcrossAllStatuses` → iterates statuses asserting
  `blocked=false` with a per-status expected `ready` (**this is the existing `blocked=false && ready=false` guard**)
- `oneIncompletePrerequisiteBlocksTheTask` → asserts `blockers[0].id/title/status`
- `waitingTaskCanExposeDependencyBlockersButIsNeverReady`
- `multiplePrerequisitesWithOneIncompleteStillBlocks` → only the incomplete one appears in `blockers`
- `readyWhenAllPrerequisitesComplete`
- `completedTaskIsNeverReadyEvenWithNoOpenDependencies`, `cancelledTaskIsNeverReady`
- `deletingLastIncompleteDependencyMakesTaskReady`, `completingLastIncompletePrerequisiteMakesTaskReady`
- `relatedDependencyIsInformationalAndDoesNotParticipateInBlocksDag`

Supporting:
- `TaskReadinessBatchQueryIntegrationTest` — readiness is computed in **one** query per batch
  regardless of batch size (the N+1 guard that matters for Board/Matrix, which render many cards).
- `TaskDependencyCycleConcurrencyPostgresTest` — cycle rejection under concurrency.
- `BlockerAnalysisServiceTest`, `PriorityEngineTest`.
- `BoardControllerIntegrationTest` — columns in position order, empty list, **per-user isolation**.
- `MatrixControllerIntegrationTest` — a single test: `groupsTasksByPriorityCategoryAcrossTheMatrix`.
- `TaskControllerV1UpdateRegressionTest`, `TaskControllerV1PaginationTest`,
  `TaskControllerV1OwnershipIntegrationTest`, `ApiV1IntegrationTest`.

---

## 2. Gaps — new tests the redesigned surfaces need

### 2.1 `frontend/src/pages/BoardPage.test.tsx` (NEW FILE — highest priority)

Structure & data:
1. `renders one column per backend board column, in backend position order`
2. `buckets each task into its boardColumnId column and drops tasks with a null boardColumnId`
3. `orders cards inside a column by the shared board sort, not by fetch order`
4. `filters cards by the Focus segmented control (All / Work / Training & Life) without refetching columns`
5. `shows loading, error and "no board columns configured" empty states from QueryState`

Readiness on cards (must exist — Board cards currently show no readiness at all):
6. `renders a readiness badge on each card sourced from task.ready and task.blocked`
7. `shows a blocked card's first blocker identity on the card and the rest behind a +n control`
8. `renders a non-blocked, non-ready card as Waiting rather than Ready` *(see §3)*

Move semantics:
9. `moves a card to another column on drag end and calls PATCH /api/v1/tasks/{id}/move with the target column and index`
10. `appends to the end when dropped on empty column space and inserts at the hovered index when dropped on a card`
11. `does not issue a move when the column and position are unchanged`
12. `offers an undo toast that restores the previous boardColumnId and position`
13. `rolls the card back to its original column when the move request fails`

Keyboard-only move (§4):
14. `moves a card between columns using keyboard only (Tab to card, Space to lift, Arrow to target, Space to drop)`
15. `cancels a lifted card with Escape and leaves it in its original column`
16. `announces pick-up, move-over and drop through a live region`

### 2.2 `frontend/src/pages/MatrixPage.test.tsx` (NEW FILE)

1. `renders the four quadrants with their titles and subtitles`
2. `places each task in exactly one quadrant and the quadrant counts sum to the total`
3. `renders a per-quadrant empty state when a quadrant has no tasks`
4. `falls back to the generic view when the payload does not expose quadrant keys` (guards `supportsQuadrants`)
5. `renders a readiness badge per matrix card from ready/blocked` *(currently absent)*
6. `links each matrix card to /tasks/{id}`
7. `shows loading, error+retry and all-empty states`
8. `stacks quadrants to a single column below the md breakpoint` (assert the grid class contract,
   mirroring how `TasksPage.test.tsx` asserts `line-clamp-2`/`wrap-anywhere`)

### 2.3 `frontend/src/pages/TaskDetailPage.test.tsx` — additions

1. `renders Ready when the backend says ready=true and blocked=false, with an empty blockers list`
2. `renders Waiting — not Ready — when blocked=false and ready=false` *(see §3)*
3. `renders every blocker identity with its id, title and status, not just a count`
4. `renders no blocker disclosure and no "Blocked by" row when blockers is empty`
5. `renders the readiness badge before the dependency list in DOM order so screen readers hear state first`
6. `announces the readiness state through the announcement context on load and after a dependency change`
7. `keeps a very long blocker title reachable rather than clipping it to one line`
8. `shows loading, 404 not-found and error+retry states for the detail query`

### 2.4 Component-level (NEW FILES)

`frontend/src/components/tasks/ReadinessBadge.test.tsx`
1. `renders Blocked for blocked=true regardless of ready`
2. `renders Ready only for blocked=false && ready=true`
3. `renders Waiting for blocked=false && ready=false`
4. `renders Waiting when both fields are undefined`
5. `exposes the state as text, not colour alone`

`frontend/src/components/board/BoardCard.test.tsx`
1. `exposes an accessible name containing the title, status and readiness state`
2. `keeps aria-roledescription="draggable task card"`
3. `stops drag listeners from swallowing the title link click`
4. `meets the 44px minimum touch target for every interactive control on the card`

`frontend/src/components/tasks/BlockerDisclosure.test.tsx`
1. `renders the first blocker inline and hides the rest behind an expandable control`
2. `expands with keyboard (Enter/Space) and sets aria-expanded correctly`
3. `renders each blocker as a link to its task detail page`

### 2.5 Backend gaps

`src/test/java/com/taskpriority/board/BoardControllerIntegrationTest.java` — additions
1. `moveRejectsAColumnBelongingToAnotherUser`
2. `movePersistsPositionAndCompactsSiblingPositions`
3. `moveToAnEndIndexAppendsRatherThanFailing`
4. `moveOutOfRangePositionIsClampedOrRejectedDeterministically`

`src/test/java/com/taskpriority/planning/MatrixControllerIntegrationTest.java` — additions
1. `matrixTasksCarryReadyBlockedAndBlockersFields` *(see §3.3)*
2. `everyTaskAppearsInExactlyOneQuadrant`
3. `matrixIsScopedToTheAuthenticatedUser`

New: `TaskListReadinessContractIntegrationTest`
1. `listEndpointReturnsReadyBlockedAndBlockersForEveryTask` — the Board/Matrix surfaces read the
   **list** payload, not the detail payload; the existing readiness contract test only covers
   single-task GETs.

---

## 3. REGRESSION GUARD — readiness semantics (non-negotiable)

### 3.0 The invariant

`task.ready`, `task.blocked` and `task.blockers[]` are **three independent, backend-authoritative
fields**. The frontend never derives one from another.

Specifically:
- `ready` is **not** `!blocked`. A task can be `blocked=false, ready=false` — not
  dependency-blocked, yet not actionable (status is `WAITING`/`BACKLOG`/`DONE`/`CANCELLED`, or
  another backend rule applies).
- `blocked=true` **always** wins in presentation: a blocked task is never shown as Ready, even if
  the payload contains `ready=true` (defensive — such a payload is a backend bug, and the UI must
  not amplify it).
- `blockers[]` is **not** derivable from `blocked`. It carries **identities** (`id`, `title`,
  `status`) that must render. `blocked=true` with `blockers=[]` is legal and must not crash.
- Missing fields degrade to **Waiting**, never to Ready.

Any change that makes `ready` a computed function of `blocked` must break at least one test in
every one of the following groups.

### 3.1 Canonical fixture set (use verbatim in every new readiness test)

```ts
// frontend — the five fixtures that pin the invariant
export const READINESS_FIXTURES = [
  // 1. Ready: the only shape that may render "Ready".
  { id: 1, title: 'Ship the ingest retry path', status: 'NOT_STARTED',
    blocked: false, ready: true,  blockers: [] },

  // 2. THE GUARD: not blocked, but NOT ready. `ready = !blocked` renders this as Ready → FAIL.
  { id: 2, title: 'Await vendor signature', status: 'WAITING',
    blocked: false, ready: false, blockers: [] },

  // 3. Second guard shape: backlog work is not blocked and not ready.
  { id: 3, title: 'Rewrite the onboarding copy', status: 'BACKLOG',
    blocked: false, ready: false, blockers: [] },

  // 4. Blocked with NAMED blockers that must render by identity.
  { id: 4, title: 'Implement frontend checkout', status: 'NOT_STARTED',
    blocked: true,  ready: false,
    blockers: [
      { id: 10, title: 'Implement checkout API',      status: 'IN_PROGRESS'  },
      { id: 11, title: 'Finalize payment contract',   status: 'NOT_STARTED'  },
    ] },

  // 5. Contradictory payload: blocked wins, must never render Ready.
  { id: 5, title: 'Contradictory payload', status: 'IN_PROGRESS',
    blocked: true,  ready: true,  blockers: [{ id: 12, title: 'Upstream migration', status: 'WAITING' }] },
];
```

Fixture 2 and 3 are the ones that fail the instant anyone writes `ready = !blocked`.
Fixture 4 is the one that fails if `blockers[]` is reduced to a boolean or a count.
Fixture 5 is the one that fails if precedence is inverted.

### 3.2 Frontend component test shape

Apply this block to **each** of: `BoardPage.test.tsx`, `MatrixPage.test.tsx`,
`TaskDetailPage.test.tsx`, `ReadinessBadge.test.tsx`. Same names, same fixtures, per surface.

```tsx
describe('<Surface> - readiness is backend-authoritative (issue #282/#296/#297/#304/#309)', () => {

  it('never renders Ready for a task that is not blocked but not ready', async () => {
    // Fixture 2 + 3. This is THE `ready = !blocked` guard.
    renderSurface(READINESS_FIXTURES);
    const waitingCard = await findCardFor('Await vendor signature');
    expect(within(waitingCard).queryByText(/^Ready$/)).toBeNull();
    expect(within(waitingCard).getByText(/^Waiting$/)).toBeInTheDocument();

    const backlogCard = await findCardFor('Rewrite the onboarding copy');
    expect(within(backlogCard).queryByText(/^Ready$/)).toBeNull();
    expect(within(backlogCard).getByText(/^Waiting$/)).toBeInTheDocument();
  });

  it('renders Ready only when the backend sets ready=true and blocked=false', async () => {
    renderSurface(READINESS_FIXTURES);
    const card = await findCardFor('Ship the ingest retry path');
    expect(within(card).getByText(/^Ready$/)).toBeInTheDocument();
  });

  it('renders Blocked, never Ready, when blocked=true even if ready=true', async () => {
    // Fixture 5 — precedence guard.
    renderSurface(READINESS_FIXTURES);
    const card = await findCardFor('Contradictory payload');
    expect(within(card).getByText(/^Blocked$/)).toBeInTheDocument();
    expect(within(card).queryByText(/^Ready$/)).toBeNull();
  });

  it('renders each blocker by identity, not as a count derived from blocked', async () => {
    // Fixture 4 — blockers[] independence guard.
    renderSurface(READINESS_FIXTURES);
    const card = await findCardFor('Implement frontend checkout');
    await userEvent.click(within(card).getByRole('button', { name: /\+1/ }));
    expect(within(card).getByRole('link', { name: /Implement checkout API/ }))
      .toHaveAttribute('href', '/tasks/10');
    expect(within(card).getByRole('link', { name: /Finalize payment contract/ }))
      .toHaveAttribute('href', '/tasks/11');
  });

  it('degrades a payload missing ready/blocked to Waiting, never Ready', async () => {
    renderSurface([{ id: 99, title: 'Legacy payload', status: 'NOT_STARTED' }]);
    const card = await findCardFor('Legacy payload');
    expect(within(card).queryByText(/^Ready$/)).toBeNull();
    expect(within(card).getByText(/^Waiting$/)).toBeInTheDocument();
  });

  it('does not crash when blocked=true arrives with an empty blockers list', async () => {
    renderSurface([{ id: 98, title: 'Blocked, cause unknown', status: 'NOT_STARTED',
                     blocked: true, ready: false, blockers: [] }]);
    const card = await findCardFor('Blocked, cause unknown');
    expect(within(card).getByText(/^Blocked$/)).toBeInTheDocument();
  });

  it('counts the readiness rail as an exact partition of the rendered scope', async () => {
    // ready(1) + blocked(2) + waiting(2) === all(5). A `!blocked` derivation makes ready=3.
    renderSurface(READINESS_FIXTURES);
    expect(await screen.findByRole('button', { name: /^Ready, 1\b/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Blocked, 2\b/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Waiting, 2\b/ })).toBeInTheDocument();
  });
});
```

Additionally, extend the existing pure-function suite (`taskLenses.test.ts`) with a
**structural** guard so the invariant is stated once, machine-checkably:

```ts
it('taskWorkState output depends on `ready` even when `blocked` is held constant', () => {
  // If ready were derived from blocked, holding blocked=false constant would make these equal.
  expect(taskWorkState(task({ blocked: false, ready: true  }))).toBe('ready');
  expect(taskWorkState(task({ blocked: false, ready: false }))).toBe('waiting');
  expect(taskWorkState(task({ blocked: false, ready: true  })))
    .not.toBe(taskWorkState(task({ blocked: false, ready: false })));
});
```

### 3.3 Backend contract test shape

New file: `src/test/java/com/taskpriority/task/api/TaskReadinessFieldIndependenceIntegrationTest.java`
(`@SpringBootTest` + `@AutoConfigureMockMvc` + `@ActiveProfiles("local-test")`, matching
`TaskDependencyReadinessIntegrationTest`).

```java
@Test
void notBlockedButNotReady_isSerializedAsTwoIndependentFalseFields() throws Exception {
    // WAITING task, zero dependencies. blocked=false AND ready=false.
    // Anyone reintroducing `ready = !blocked` server-side makes ready=true here.
    Task waiting = seedTask("Await vendor signature", Status.WAITING);

    mockMvc.perform(get("/api/v1/tasks/" + waiting.getId()).with(auth()))
           .andExpect(jsonPath("$.blocked").value(false))
           .andExpect(jsonPath("$.ready").value(false))
           .andExpect(jsonPath("$.blockers").isArray())
           .andExpect(jsonPath("$.blockers.length()").value(0));
}

@Test
void backlogAndDoneAndCancelled_areAllNotBlockedAndNotReady() throws Exception {
    for (Status status : List.of(Status.BACKLOG, Status.DONE, Status.CANCELLED, Status.WAITING)) {
        Task t = seedTask("Task " + status, status);
        mockMvc.perform(get("/api/v1/tasks/" + t.getId()).with(auth()))
               .andExpect(jsonPath("$.blocked").value(false))
               .andExpect(jsonPath("$.ready").value(false));
    }
}

@Test
void blockersCarryIdentityNotJustACount() throws Exception {
    Task target = seedTask("Implement frontend checkout", Status.NOT_STARTED);
    Task api    = seedTask("Implement checkout API",      Status.IN_PROGRESS);
    Task cont   = seedTask("Finalize payment contract",   Status.NOT_STARTED);
    dependOn(target, api);
    dependOn(target, cont);

    mockMvc.perform(get("/api/v1/tasks/" + target.getId()).with(auth()))
           .andExpect(jsonPath("$.blocked").value(true))
           .andExpect(jsonPath("$.ready").value(false))
           .andExpect(jsonPath("$.blockers.length()").value(2))
           .andExpect(jsonPath("$.blockers[?(@.id == " + api.getId()  + ")].title")
                        .value(hasItem("Implement checkout API")))
           .andExpect(jsonPath("$.blockers[?(@.id == " + api.getId()  + ")].status")
                        .value(hasItem("IN_PROGRESS")))
           .andExpect(jsonPath("$.blockers[?(@.id == " + cont.getId() + ")].title")
                        .value(hasItem("Finalize payment contract")));
}

@Test
void readinessFieldsAreNotComplementary_acrossAMixedList() throws Exception {
    // The list payload is what Board and Matrix consume. Assert on the LIST, not just the detail.
    seedTask("Ready now",             Status.NOT_STARTED);            // blocked=false ready=true
    seedTask("Await vendor signature", Status.WAITING);               // blocked=false ready=false
    Task blocked = seedTask("Blocked one", Status.NOT_STARTED);
    dependOn(blocked, seedTask("Upstream", Status.IN_PROGRESS));      // blocked=true  ready=false

    mockMvc.perform(get("/api/v1/tasks").with(auth()))
           // At least one task must be blocked=false AND ready=false — impossible under `!blocked`.
           .andExpect(jsonPath("$.content[?(@.blocked == false && @.ready == false)]").isNotEmpty())
           // And ready must not be the exact complement of blocked over the whole list.
           .andExpect(jsonPath("$.content[?(@.blocked == false && @.ready == true)]").isNotEmpty())
           .andExpect(jsonPath("$.content[?(@.blocked == true  && @.ready == true)]").isEmpty());
}

@Test
void matrixAndBoardListPayloadsCarryAllThreeFields() throws Exception {
    // Board/Matrix render from these; a missing field silently degrades every card to Waiting.
    Task blocked = seedTask("Blocked one", Status.NOT_STARTED);
    dependOn(blocked, seedTask("Upstream", Status.IN_PROGRESS));

    mockMvc.perform(get("/api/v1/matrix").with(auth()))
           .andExpect(jsonPath("$..[?(@.id == " + blocked.getId() + ")].ready").exists())
           .andExpect(jsonPath("$..[?(@.id == " + blocked.getId() + ")].blocked").value(hasItem(true)))
           .andExpect(jsonPath("$..[?(@.id == " + blocked.getId() + ")].blockers").exists());
}
```

Keep `TaskReadinessBatchQueryIntegrationTest` green: readiness on Board/Matrix must stay a single
batched query, so any new per-card readiness rendering must not push the FE into per-task fetches.

### 3.4 Guard checklist — a `ready = !blocked` reintroduction must break all of these

| # | Test | File |
|---|---|---|
| 1 | `never derives ready from !blocked, for any workflow status` | `taskLenses.test.ts` (existing) |
| 2 | `taskWorkState output depends on ready even when blocked is held constant` | `taskLenses.test.ts` (new) |
| 3 | `labels each row from the backend ready/blocked fields and never from !blocked` | `TasksPage.test.tsx` (existing) |
| 4 | `classifies tasks by the backend-provided ready field, not by inverting blocked` | `TodayPage.test.tsx` (existing) |
| 5 | `counts and filters "Ready to work" using the backend ready field` | `ProjectDetailPage.test.tsx` (existing) |
| 6 | `never renders Ready for a task that is not blocked but not ready` | `BoardPage.test.tsx` (**new**) |
| 7 | same | `MatrixPage.test.tsx` (**new**) |
| 8 | same | `TaskDetailPage.test.tsx` (**new**) |
| 9 | `renders Waiting for blocked=false && ready=false` | `ReadinessBadge.test.tsx` (**new**) |
| 10 | `readinessHonorsWorkflowActionabilityAcrossAllStatuses` | `TaskDependencyReadinessIntegrationTest` (existing) |
| 11 | `notBlockedButNotReady_isSerializedAsTwoIndependentFalseFields` | `TaskReadinessFieldIndependenceIntegrationTest` (**new**) |
| 12 | `readinessFieldsAreNotComplementary_acrossAMixedList` | `TaskReadinessFieldIndependenceIntegrationTest` (**new**) |
| 13 | `blockersCarryIdentityNotJustACount` | `TaskReadinessFieldIndependenceIntegrationTest` (**new**) |

---

## 4. Responsive + accessibility coverage inventory

### 4.1 Current state

| Dimension | Board | Matrix | Task Detail | Tasks list |
|---|---|---|---|---|
| 375 / 768 / 1024 / 1440 | none | none | none | partial (no-overflow only) |
| Light / dark | none | none | none | none |
| WCAG AA contrast | none | none | none | none |
| Keyboard-only move | none (KeyboardSensor wired, untested) | n/a | n/a | n/a |
| SR announcement of readiness/blocked | none | none | none | partial (result count only) |
| Reduced motion | none | none | none | none |
| No horizontal overflow | **fails by construction** — `overflow-x-auto` wrapper | none | none | asserted |
| Touch targets ≥ 44px | none | none | none | none |

Two concrete findings worth flagging to the implementation lanes:

- `BoardPage.tsx` wraps its columns in `<div className="flex gap-4 overflow-x-auto pb-2">`. That is
  the exact pattern `TasksPage.test.tsx` explicitly forbids for the list. A board legitimately scrolls
  horizontally, so the new test must assert **scoped** overflow (the column rail scrolls; `document.body`
  and the page shell do not), not the blanket "no `.overflow-x-auto`" assertion used for the list.
- `BoardCard.tsx` sets `aria-label={title + ', status ' + status}` — **readiness is absent from the
  accessible name**, and no readiness badge is rendered at all. A screen-reader user cannot tell a
  blocked card from a ready one on the Board today.

### 4.2 Tests to add

Breakpoints (`frontend/src/pages/__responsive__/` or colocated; drive with a `matchMedia`
stub + `window.resizeTo` helper — no real browser needed for class-contract assertions):

1. `board: renders a single-column stacked rail at 375 with no body-level horizontal scroll`
2. `board: renders side-by-side columns at 768, 1024 and 1440`
3. `board: horizontal scrolling is confined to the column rail — document.body.scrollWidth === clientWidth at every breakpoint`
4. `matrix: quadrants stack to one column at 375 and 768, and form a 2x2 grid at 1024 and 1440`
5. `task detail: the readiness panel and the blocker list stay in the flow at 375 without truncation`
6. `every surface: no element exceeds the viewport width at 375/768/1024/1440`

Theme & contrast:
7. `renders correct readiness token colours under data-theme="light" and data-theme="dark"`
8. `readiness state is conveyed by text as well as colour (badge has a visible or sr-only label)`
9. `contrast: Ready / Blocked / Waiting badge foreground-on-background meets WCAG AA 4.5:1 in both themes`
   — computed from `frontend/src/styles/theme.css` tokens with a small contrast-ratio helper, asserted
   per theme; a token change that drops a badge below 4.5:1 fails the suite
10. `contrast: overdue and important card accents meet AA 3:1 as non-text indicators`

Keyboard-only board move:
11. `moves a card from To Do to In Progress with keyboard only and never touches the pointer`
12. `Escape during a lift returns the card to its original column and position`
13. `focus returns to the moved card after the drop`
14. `the column rail is reachable by Tab in visual order`

Screen-reader announcements:
15. `announces "<title>, Blocked by <n> tasks" when a blocked card receives focus`
16. `announces "<title>, Ready" for a ready card and "<title>, Waiting" for a not-ready one`
17. `announces pick-up / over-column / dropped-into-<column> through the dnd live region`
18. `announces the readiness change after a dependency is completed on the detail page`
19. `board and matrix each expose one contextual role="status" summary (n cards, m blocked)`

Reduced motion:
20. `respects prefers-reduced-motion: card drag transition and the drop animation are suppressed`
21. `respects prefers-reduced-motion: quadrant/column enter transitions are suppressed`

Touch targets:
22. `every interactive control on a board card is at least 44x44 CSS px at 375`
23. `the +n blocker disclosure control meets the 44px minimum on all surfaces`
24. `matrix card links and quadrant headers meet the 44px minimum at 375`

### 4.3 Suggested execution split

- Class-contract, DOM-shape, announcement and keyboard tests → Vitest + Testing Library, colocated
  (matches the repo's existing convention).
- Contrast ratios → a pure unit test over the `theme.css` token values; no rendering needed.
- True pixel geometry at four breakpoints × two themes → only if a browser-mode runner is added;
  otherwise assert the responsive class contract, exactly as `TasksPage.test.tsx` already does with
  `line-clamp-2` / `wrap-anywhere` / `.overflow-x-auto`.
