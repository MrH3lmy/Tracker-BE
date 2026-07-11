# CLAUDE.md

This file orients AI assistants working in this repository. For full user-facing setup/usage docs, see `README.md`; this file focuses on structure, workflows, and conventions relevant to making code changes.

## Project overview

Tracker-BE is a full-stack task-priority tracker:

- **Backend**: Spring Boot 3.3 / Java 21 REST API (`src/main/java/com/taskpriority`) for task CRUD, recurrence, prioritization/matrix views, planning, calendar export, settings, CSV import, and a "sticky notes" subsystem with screenshot attachments and AI-assisted actions.
- **Frontend**: Vite + React 19 + TypeScript SPA (`frontend/`) that consumes the backend's `/api/v1/**` REST API.

## Repository layout

```
src/main/java/com/taskpriority   Backend source (see "Backend" below)
src/main/resources               application.properties/.yml, Flyway migrations (db/migration)
src/test/java/com/taskpriority   Backend tests
frontend/                        Vite + React + TypeScript app
docs/frontend-endpoint-map.md    FE-to-API endpoint mapping (partially stale, see below)
API_DOCS.md                      Notes on the recurring-task completion contract
scripts/package/                 jpackage native-launcher build scripts
launch/                          Double-click launchers (macOS/Linux/Windows) that call the Docker start scripts
docker-compose.yml, Dockerfile   Postgres + backend + frontend stack
start-tracker*.sh/.bat           Convenience startup scripts (see README for which does what)
```

## Backend (Spring Boot)

**Stack**: Java 21, Spring Boot 3.3.5, Spring Data JPA, Bean Validation, Flyway, PostgreSQL (runtime), H2 + Testcontainers (tests), springdoc-openapi.

**No Maven wrapper is checked in** (`mvnw` does not exist in the repo root), even though `README.md` shows `./mvnw` examples. Use plain `mvn`:

```bash
mvn spring-boot:run       # run the app (port 8080)
mvn test                  # run tests
mvn clean install         # build
mvn -DskipTests clean package   # package only (what the Dockerfile does)
```

### Package map (`src/main/java/com/taskpriority`)

| Package | Contents |
|---|---|
| `model/` | JPA entities and enums (`Task`, `RecurrenceRule`, `Note`, `NoteBlock`, `NoteAttachment`, `Tag`, `Board`/`BoardColumn`, `TaskDependency`, `AppSetting`, etc.) |
| `repository/` | Spring Data JPA repositories; dynamic Note filtering via the Specification pattern (`NoteSpecifications`, `NoteRepositoryCustom`/`Impl`) |
| `service/` | Cross-cutting logic still backing the v1 API: `TaskService` (used directly by `TaskControllerV1`, `PlanningService`, `DashboardService`, `MatrixController`, `BlockerAnalysisService`, `NoteTaskConversionService`), `PriorityEngine`, `BlockerAnalysisService` |
| `common/exception/` | Global error handling: `GlobalExceptionHandler` (`@ControllerAdvice`), `ApiErrorResponse`, `ResourceNotFoundException` |
| `config/` | `WebConfig` — CORS filter, origins from `app.cors.allowed-origins` |
| `task/api/` `task/application/` `task/domain/` | **Current** v1 task API: `TaskControllerV1` (`/api/v1/tasks`), `ImportController`, `TaskApiMapper`, request/response records, `RecurrenceService`, `DuplicateDetectionService`, `ImportService` |
| `planning/` | `PlanningController` (`/api/v1/planning`), `MatrixController` (`/api/v1/matrix`), recommendation/working-calendar services |
| `settings/` | `SettingsController`/`SettingsService` (`/api/v1/settings`) |
| `dashboard/` | `DashboardController`/`DashboardService` (`/api/v1/dashboard`) |
| `calendar/` | `CalendarController`/`CalendarService` (`/api/v1/calendar`, month view + `.ics` export) |
| `notes/`, `notes/ai/`, `notes/api/` | Sticky-notes subsystem: notes, blocks, attachments, collections, templates, saved views, version history, and heuristic AI note actions |

All current and new work — backend or frontend — should target `/api/v1/**` (`task/api`, `planning`, `dashboard`, `calendar`, `settings`, `notes/api`). The scoring logic lives solely in `service/PriorityEngine.java` — there is no other copy to reconcile.

### Architecture patterns

- Layering: Controller → Service → Repository → Entity.
- DTOs are Java `record`s with Bean Validation annotations (`@NotBlank`, `@Size`, `@PositiveOrZero`, `@AssertTrue` for cross-field checks like start-date-before-due-date). Controllers use `@Validated @RequestBody`.
- Mapping between entities and DTOs is done by hand-written mapper classes (`TaskApiMapper`, `NoteTaskLinkMapper`) — no MapStruct.
- All error responses go through `GlobalExceptionHandler` and share the `ApiErrorResponse` shape (`timestamp`, `status`, `error`, `message`, `path`): 404 for `ResourceNotFoundException`, 400 for validation/type-mismatch/malformed-body errors, 413 for oversized uploads, 500 catch-all.
- REST conventions: `/api/v1/**` prefix; state-transition endpoints as action sub-paths (`PATCH /tasks/{id}/complete`, `PATCH /tasks/{id}/status?status=`, `PATCH /tasks/{id}/move`); `201` on create, `204` on delete; enums/filters passed as query params, not path segments.

### Entity model (highlights)

- `Task` 1–1 `RecurrenceRule` (cascade all, orphan removal). Many `Task` fields (`priorityScore`, `priorityCategory`, `ageFlag`, `daysLeft`, dependency/subtask id lists, etc.) are `@Transient` — computed at the service layer, never persisted.
- `TaskDependency` models blocking relationships between tasks.
- `Board` 1–* `BoardColumn`; `Task.boardColumnId` is a plain FK column, not a mapped relationship.
- Notes subsystem: `Note` (*–1 `Task` nullable, *–1 `NoteCollection`, *–* `Tag`) 1–* `NoteBlock` / `NoteAttachment` / `NoteVersion`; `NoteTaskLink` joins a note (optionally a specific block) to a task; `NoteAiGeneration` audits AI-assisted note actions.

### Migrations (Flyway)

`src/main/resources/db/migration`, naming `V<n>__description.sql`. Add new migrations as new files — **never edit an already-applied migration**; keep them forward-only. Schema evolution: V1–V5 built the core task tracker (tasks, recurrence, boards, dependencies, planning fields); V6 onward added the entire Notes subsystem (notes, tags, layout/canvas fields, attachments, blocks, task links, templates, collections, saved views, AI-generation audit log, version history).

### Configuration / profiles

- `application.properties` — base config. Postgres via `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` env vars (defaults point at local Postgres `taskpriority` db), `spring.jpa.hibernate.ddl-auto=validate` (schema owned by Flyway, not Hibernate), Flyway enabled against `classpath:db/migration`, CORS origins via `app.cors.allowed-origins` (default `http://localhost:5173,http://127.0.0.1:5173`), multipart/screenshot size limits.
- `application.yml` — springdoc/OpenAPI path config only.
- `application-local-test.properties` (profile `local-test`) — H2 in-memory (`MODE=PostgreSQL`), `ddl-auto=create-drop`, Flyway disabled. Used by integration tests via `@ActiveProfiles("local-test")`.
- README describes conceptual `dev`/`test`/`prod` Spring profiles, but only `local-test` has a dedicated properties file — `dev`/`prod` are just the base `application.properties` plus env var overrides.

### Testing

JUnit 5 + Mockito + MockMvc, run with `mvn test`. No shared base test class; each test wires its own annotations. Patterns in use:

- `@WebMvcTest` slice tests with mocked service beans (e.g. `TaskControllerV1ValidationTest`).
- `@SpringBootTest` + `@AutoConfigureMockMvc` + `@ActiveProfiles("local-test")` integration tests against H2 (e.g. `ApiV1IntegrationTest`).
- `@Testcontainers(disabledWithoutDocker = true)` tests against a real `postgres:16-alpine` container for Postgres-specific behavior/migrations (e.g. `NotesBodyMigrationPostgresTest`, `NoteControllerPostgresApiTest`).

No checkstyle/spotless/jacoco — the backend has no enforced formatting or lint plugin; match existing style by hand.

**Swagger UI**: `http://localhost:8080/swagger-ui/index.html` · **OpenAPI JSON**: `http://localhost:8080/v3/api-docs`.

## Frontend (Vite + React)

**Stack**: React 19, TypeScript ~6.0 (project-references tsconfig; note `strict` is **not** explicitly set in `tsconfig.app.json` — only `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` are on), Vite 8, `react-router-dom` v7, `@tanstack/react-query` v5. No axios, no zod, no UI/CSS framework, no Prettier, and no test framework/scripts configured.

Run from `frontend/`:

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # preview production build
```

### Directory map (`frontend/src`)

| Path | Contents |
|---|---|
| `components/` | Shared primitives (`ProgressBar`, `QueryState`, `RequestInspector`, `StackedProgressBar`) plus `tasks/` and `notes/` feature subfolders |
| `pages/` | One component per route (`DashboardPage`, `TasksPage`, `NotesPage`, `PlanningPage`, `MatrixPage`, `CalendarPage`, `SettingsPage`, `ImportPage`, `DeveloperToolsPage`, `PlaceholderPage`) |
| `hooks/useApiQueries.ts` | All React Query hooks/mutations, keyed by a centralized `queryKeys` object |
| `hooks/useBoardState.ts` | Task board local state logic |
| `router/routes.tsx` | Single source of truth for route/tab config, consumed by `App.tsx` |
| `styles/tokens.css` | Design tokens (spacing, radii, per-theme colors) driven by a `[data-theme]` attribute |
| `validation/` | Hand-rolled validators (no schema library) — `json.ts`, `settings.ts`, `import.ts`, `calendar.ts`, `taskStatus.ts` |
| `apiClient.ts`, `themeContext.tsx`, `announcementContext.tsx` | API client, theme, and accessibility-announcement contexts (see below) |

### API layer

`apiClient.ts` is a hand-rolled `fetch` wrapper — no axios. Base URL comes from `VITE_API_BASE_URL` (empty string = same-origin requests). It exposes `apiJson`/`apiText`/`apiFormData`/`apiDownload` and keeps a rolling history of the last 50 calls for the dev-tools request inspector.

`hooks/useApiQueries.ts` wraps it with React Query: a `queryKeys` object per domain, one `use<Thing>Query` hook per GET endpoint, and mutation-factory hooks per domain (`useTaskMutations()`, `useNoteMutations()`, etc.) whose `onSuccess` invalidates related query keys. Task drag-and-drop reordering uses an optimistic update (`onMutate` snapshot + `onError` rollback).

### State management

No Redux/Zustand — React Query is the server-state layer. Two React Context providers at the app root:

- `themeContext.tsx` — active theme (8 options), persisted to `localStorage`, synced from backend settings once loaded.
- `announcementContext.tsx` — global ARIA live-region message for accessibility.

Everything else is local `useState`/`useReducer`.

### Component & styling conventions

- PascalCase component files colocated with a same-named `*.module.css` (CSS Modules; class composition done manually via `.filter(Boolean).join(' ')`, no `classnames` dependency).
- Props interfaces named `<Component>Props`; per-feature domain types centralized in `*Types.ts` files (`taskTypes.ts`, `noteTypes.ts`).
- Recurring pattern: `as const` literal array + derived union type + type guard (see `validation/taskStatus.ts`) for enum-like values.
- Strong accessibility conventions: `aria-label`/`aria-describedby`/`role`, `sr-only` spans, live-region announcements via `useAnnouncement()`.
- ESLint flat config (`frontend/eslint.config.js`): `js.configs.recommended` + `typescript-eslint` recommended + `react-hooks` + `react-refresh` (Vite), no custom rule overrides. No Prettier.

### `docs/frontend-endpoint-map.md` — partially stale

This doc reads as an earlier planning/spec document, not a description of the current app. Its **endpoint-to-`/api/v1` mapping and the note-screenshot `downloadUrl` resolution contract are accurate and worth citing**. Its scaffold/build-steps sections are **not**: it recommends axios/zod/Tailwind (none of which are used) and names pages like `ErrorPlaygroundPage.tsx`/`AuthPage.tsx` that don't exist — the actual `/errors` route renders the generic `PlaceholderPage`, and there is no `pages/AuthPage.tsx` (the backend has no auth endpoints at all yet).

## Running the full stack locally

- **Recommended**: `./start-tracker-docker.sh` (or `.bat` on Windows) — starts Postgres, backend, and frontend via `docker-compose.yml`. Frontend at `http://localhost:5173`, backend at `http://localhost:8080`.
- **Manual**: `mvn spring-boot:run` (requires Postgres already running and reachable via `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`) plus `npm run dev` in `frontend/` separately. `start-tracker.sh`/`.bat` only start the backend — they do **not** start Postgres or the frontend.

## Recurring task completion ("same-task reset")

`PATCH /api/v1/tasks/{id}/complete` behaves differently depending on whether the task recurs:

- **Non-recurring**: `status=DONE`, `completedDate=now`.
- **Recurring** (`DAILY`/`WEEKLY`/`MONTHLY`/`YEARLY`): the service computes `nextDueDate`, updates `recurrenceRule.lastCompletedDate`/`nextDueDate`, then resets the *same* task row back to active — `status=NOT_STARTED`, `dueDate=nextDueDate`, `completedDate=null` — rather than creating a new task instance.

Frequency semantics: `DAILY` adds `interval` days; `WEEKLY` honors `daysOfWeek` and an `interval`-week cadence; `MONTHLY` honors `dayOfMonth`, clamped to end-of-month; `YEARLY` honors `annualDate`, clamped on invalid leap-day years. See `API_DOCS.md` and `RecurrenceService`/`RecurrenceServiceTest` for details.

## Conventions and gotchas

- Target `/api/v1/**` for any new or modified backend↔frontend integration.
- No Maven wrapper — use `mvn`, not `./mvnw`.
- Add new Flyway migrations as new `V<n+1>__*.sql` files; never edit an applied one.
- No formatter/linter is enforced on the backend; the frontend has ESLint but no Prettier — match existing style by hand in both.
- Backend testing is `mvn test` only; the frontend currently has no test framework or `test` script at all.
