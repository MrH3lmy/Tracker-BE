# Board — real-browser smoke test

Run against the **actual Spring backend** (not a stand-in): the packaged
application on the `local-test` profile (H2 in-memory, Flyway disabled), with
the real `NativeAuthController` / JWT auth, the real seeded `board_columns`, and
tasks and dependencies created through the real `/api/v1` endpoints so that
`blocked`, `ready` and `blockers[]` are computed by `BlockerAnalysisService`
rather than fixtured.

Driven by Playwright against the Vite dev server pointed at that backend. Every
persistence assertion is checked against the **server's own** `GET /api/v1/tasks`
response, not against the DOM, and the key ones are re-checked after a full page
reload.

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local-test -Dspring-boot.run.useTestClasspath=true
VITE_API_BASE_URL=http://localhost:8080 npm run dev   # in frontend/
```

## Result

```
PASS  board loads tasks from the real backend — 5 cards
PASS  board summary reflects backend readiness — "5 tasks, 2 blocked"
PASS  blocked task shows the backend Blocked badge
PASS  blocked task exposes its blocker list in one interaction
PASS  menu move persisted to the backend — column 1 (Backlog) -> 2 (Not Started)
PASS  menu move survives a full page refresh
PASS  undo restores the column the task came from — 2 -> 1 -> 2
PASS  drag raises a floating overlay copy — 2 copies
PASS  cross-column drag persisted to the backend — column 1 -> 2
PASS  overlay is torn down after the drop
PASS  drag survives a full page refresh
PASS  cancelled drag tears the overlay down
PASS  cancelled drag moves nothing on the server — still in column 2
PASS  same-column downward reorder actually moves the card (regression) — Not Started: top card "Upgrade the CI runners to " -> "Renew the production TLS c"
PASS  move control is keyboard focusable
PASS  move menu opens from the keyboard

16/16 checks passed
```

## What each check covers

| Check | Why it is here |
|---|---|
| board loads tasks from the real backend | The board renders live API data, not a fixture shape |
| board summary reflects backend readiness | The one atomic status region sums `task.blocked` as the server reported it |
| blocked task shows the backend Blocked badge | Readiness is backend truth, rendered not inferred |
| blocked task exposes its blocker list | A Blocked badge is never shown without its explanation one interaction away |
| menu move persisted / survives refresh | The non-drag movement path really writes `PATCH /tasks/{id}/move` |
| undo restores the column | The undo toast reverses the move on the server, not just in the cache |
| drag raises a floating overlay copy | `DragOverlay` mounts a second copy while the drag is in flight |
| cross-column drag persisted / survives refresh | Drag and the menu commit the same mutation |
| overlay is torn down after the drop | No orphaned overlay after `onDragEnd` |
| cancelled drag tears the overlay down | `onDragCancel` cleans up |
| cancelled drag moves nothing on the server | Escape aborts without spending a request |
| same-column downward reorder | Regression: this silently resolved to a no-op before `resolveDrop` |
| move control is keyboard focusable / opens from the keyboard | The WCAG 2.2 AA drag alternative is reachable without a pointer |

## Note on re-runs

The backend rate-limits `POST /api/v1/auth/refresh`. Running the suite several
times in quick succession trips that throttle and the app bounces to `/login` —
that is the backend defending itself, not a board defect. Space the runs out, or
reuse one browser context.
