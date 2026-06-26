# Frontend Endpoint → Screen Mapping (Tracker-BE)

This document is the implementation-ready FE map for Tracker-BE using the **primary v1 API**.

- Base URL: `http://localhost:8080` (or your configured backend host)
- FE should use: `/api/v1/**`
- FE should avoid for new work: `/api/**`, `/api/analytics/**`

---

## 1) Endpoint → Screen Mapping

## A. Dashboard / Health

**Purpose:** quick sanity check and summary visibility.

### `GET /api/v1/dashboard`
- UI screen: `DashboardPage`
- Trigger: `Load Summary` button + auto-load on page entry
- Show:
  - HTTP status
  - Response time (ms)
  - JSON body (`TaskService.DashboardSummary`)

### Health check recommendation
Tracker-BE currently does not define `/health` or `/status` in app controllers.
Use one of these options:
1. If Spring Boot Actuator is enabled, use `GET /actuator/health`.
2. Otherwise, use `GET /api/v1/dashboard` as the app-level reachability check.

UI control label recommendation: **Check API**

---

## B. Auth Page

**Purpose:** validate authentication/token flows.

Current Tracker-BE route set does **not** include app auth endpoints such as:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

### FE policy for now
- Keep `AuthPage` scaffolded as **Not Implemented by backend yet**.
- Do not block domain pages on token logic until backend auth routes are added.
- When auth is introduced, implement:
  - token storage (demo-only localStorage)
  - `Authorization: Bearer <token>` request injection
  - auth badge (Logged In/Out)
  - token preview (first/last characters only)

---

## C. Main Feature Page (Tasks as Tracker entity)

Tracker-BE core entity is **Task** (`TaskControllerV1`).

## Tasks List / Search Page

### `GET /api/v1/tasks`
- UI screen: `TasksPage`
- Components:
  - `DataTable`
  - quick filter/search inputs (client-side initially)
- Show request metadata + response JSON in inspector panel

### `GET /api/v1/tasks/archive`
- UI placement: archive toggle/tab inside `TasksPage`
- Behavior: list archived/completed tasks returned by service

### `GET /api/v1/tasks/duplicates`
- UI placement: `Duplicates` tab in `TasksPage`
- Behavior: show duplicate groups (`DuplicateDetectionService.DuplicateGroup`)

## Task Detail Page

### `GET /api/v1/tasks/{id}`
- UI screen: `TaskDetailPage`
- Components:
  - detail panel
  - request/response inspector

### `GET /api/v1/tasks/{id}/detail`
- UI screen: `TaskDetailPage`
- Purpose: load the task and its ordered notes in a single request
- Response: `TaskDetailResponse` with:
  - `task`: existing `TaskResponse` payload
  - `notes`: ordered `NoteResponse[]` for the task
- Components:
  - detail panel from `task`
  - floating sticky-note canvas from `notes`
  - request/response inspector
- Notes frontend contract for the task-detail sticky-note canvas:
  - `displayOrder` is the visible sticky note number and the primary sort key for task notes.
  - `title` is the sticky-note heading/header text.
  - `tags` are categorization labels/chips rendered on each sticky note.
  - Layout fields (`positionX`, `positionY`, `width`, `height`, `color`, `zIndex`) restore the floating sticky-note placement when task detail loads.

## Task Create / Update / Delete

### `POST /api/v1/tasks`
- UI: create form in `TasksPage`
- Body: `CreateTaskRequest`
- Expected: HTTP `201`

### `PUT /api/v1/tasks/{id}`
- UI: inline edit form or dedicated edit section in `TaskDetailPage`
- Body: `UpdateTaskRequest`

### `DELETE /api/v1/tasks/{id}`
- UI: delete action with `ConfirmDialog`
- Expected: HTTP `204`

## Notes / Sticky Notes

### `GET /api/v1/notes?taskId={taskId}`
- UI placement: task-linked notes view and reusable notes data source.
- For task-scoped notes, render in ascending `displayOrder` and use `displayOrder` as the visible sticky note number.
- Keep `title` as the sticky-note heading/header.
- Render `tags` as categorization chips/labels on the sticky note; do not use tags as the note number or title.
- Use layout fields (`positionX`, `positionY`, `width`, `height`, `color`, `zIndex`) to restore floating sticky-note placement on task detail load.

### `PATCH /api/v1/notes/{id}/layout`
- UI trigger: sticky-note drag, resize, color, stacking, or order change.
- Body: `UpdateNoteLayoutRequest` with `displayOrder` plus layout fields.
- Persist `displayOrder` whenever the visible sticky note number or sort order changes.

## Task State Actions

### `PATCH /api/v1/tasks/{id}/complete`
- UI: row action `Complete`

### `PATCH /api/v1/tasks/{id}/status?status=<Status>`
- UI: status dropdown in row/detail view
- Use enum-safe client values to avoid invalid query values

UI behavior for all task mutations:
- Disable buttons while request is in-flight
- Show optimistic loading indicator
- Refetch or update cache after mutation
- Always log payload + response body in JSON inspector

---

## D. Related Domain Pages (Planner/Matrix/Calendar/Settings/Import)

## Planning

### `GET /api/v1/planning/today`
### `GET /api/v1/planning/weekly`
- UI screen: `PlanningPage`
- Tabs:
  - `Today`
  - `Weekly`

## Matrix

### `GET /api/v1/matrix`
- UI screen: `MatrixPage`
- Render by `PriorityCategory` buckets

## Calendar

### `GET /api/v1/calendar/month?year=YYYY&month=M`
- UI screen: `CalendarPage`
- Inputs: year + month selector

### `GET /api/v1/calendar/export.ics`
- UI action: `Export ICS`
- Behavior: download text/calendar file

## Settings

### `GET /api/v1/settings`
### `PUT /api/v1/settings`
- UI screen: `SettingsPage`
- Key/value editor with save action

## Import

### `POST /api/v1/import/csv`
### `POST /api/v1/import/tasks`
- UI screen: `ImportPage`
- Input: CSV textarea/file load
- Show parsed result/count response payload

---

## E. Error Playground

**Purpose:** verify backend validation/error consistency.

UI screen: `ErrorPlaygroundPage`

Preset scenarios:
1. Missing required body fields (`POST /api/v1/tasks` with incomplete JSON) → expect 400/validation error
2. Invalid enum value (`PATCH /api/v1/tasks/{id}/status?status=BAD_VALUE`) → expect 400
3. Missing resource (`GET /api/v1/tasks/999999999`) → expect 404
4. Invalid path variable (`GET /api/v1/tasks/not-a-number`) → expect 400
5. Malformed JSON body on create/update → expect parser/validation error

Display for each response:
- status code
- error message
- validation field list (if present)
- correlation/request ID (if backend exposes one)

---

## 2) Wireframe + Component Checklist

## App Layout
- Top nav tabs:
  - Dashboard
  - Tasks
  - Planning
  - Matrix
  - Calendar
  - Settings
  - Import
  - Error Playground
- Split view:
  - Left: request forms/inputs
  - Right: response/log inspector

## Reusable Components
- `ApiRequestForm` (method, URL, payload)
- `JsonViewer` (pretty print + copy)
- `StatusBadge` (2xx/4xx/5xx)
- `DataTable`
- `ConfirmDialog`
- `Toast`
- `RequestHistoryPanel` (last 10 calls)

Auth-specific components (`AuthTokenPill`, auth badge) should be added when backend auth routes exist.

## Suggested Pages
- `DashboardPage.tsx`
- `TasksPage.tsx`
- `TaskDetailPage.tsx`
- `PlanningPage.tsx`
- `MatrixPage.tsx`
- `CalendarPage.tsx`
- `SettingsPage.tsx`
- `ImportPage.tsx`
- `ErrorPlaygroundPage.tsx`
- `AuthPage.tsx` (scaffold/placeholder until backend auth is added)

---

## 3) Build Steps (Frontend Implementation Guide)

## Step 0 — Prerequisites
- Node.js 20+
- npm or pnpm
- Running Tracker-BE backend locally

## Step 1 — Scaffold frontend
```bash
npm create vite@latest tracker-fe-demo -- --template react-ts
cd tracker-fe-demo
npm install
npm install axios react-router-dom @tanstack/react-query zod
```
Optional UI stack:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Step 2 — Setup env
Create `.env`:
```bash
VITE_API_BASE_URL=http://localhost:8080
```

## Step 3 — Create API client
`src/api/client.ts`:
- axios instance with `baseURL` from env
- request interceptor for shared headers
- response interceptor to normalize error shape for UI

## Step 4 — Add routing shell
Routes:
- `/dashboard`
- `/tasks`
- `/planning`
- `/matrix`
- `/calendar`
- `/settings`
- `/import`
- `/errors`
- `/auth` (placeholder)

Build shared layout with nav + response console area.

## Step 5 — Build domain pages first
Implement these before auth-dependent flows:
- Dashboard
- Tasks CRUD + actions
- Planning
- Matrix
- Calendar
- Settings
- Import

## Step 6 — Build Error Playground
- preloaded invalid request presets
- exact backend error rendering

## Step 7 — Add request/response inspector
For every action:
- method + endpoint + payload
- response status + body
- maintain last 10 calls

## Step 8 — Add Auth page when backend routes exist
- register/login/me/refresh/logout
- token storage + auth header
- logout clears query cache and token

## Step 9 — QA checklist (manual)
- no token path behavior (once auth exists)
- valid domain flows succeed
- create/update/delete reflected in UI
- validation errors readable
- network failures show fallback message

## Step 10 — README for demo consumers
Include:
- install/run commands
- env setup
- backend URL config
- endpoint coverage table
- known limitations

---

## 4) Suggested Milestones

1. **Milestone 1 (Half day):** scaffold + shared API client + Dashboard
2. **Milestone 2 (1 day):** Tasks CRUD + detail/actions + inspector
3. **Milestone 3 (Half day):** Planning + Matrix + Calendar
4. **Milestone 4 (Half day):** Settings + Import + Error Playground + docs polish
5. **Milestone 5 (Later, optional):** Auth flow after backend auth endpoints are added
