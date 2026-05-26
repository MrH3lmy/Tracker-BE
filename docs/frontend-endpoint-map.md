# Frontend Endpoint Map

This document maps backend endpoints intended for frontend integration.

## FE Routing Policy

- **Primary endpoints (use these):** `/api/v1/**`
- **Legacy/deprecated endpoints (avoid for new FE work):** `/api/**` and `/api/analytics/**`

---

## Primary Endpoints (`/api/v1/**`)

### Tasks API (`TaskControllerV1`)

| Method | Path | Params / Body | Response model class |
|---|---|---|---|
| GET | `/api/v1/tasks` | None | `List<TaskResponse>` |
| GET | `/api/v1/tasks/{id}` | Path: `id` (`Long`) | `TaskResponse` |
| POST | `/api/v1/tasks` | Body: `CreateTaskRequest` (`title`, `description`, `dueDate`, `important`, `status`, `area`, `effort`, `blockedReason`, `waitingOn`, `followUpDate`, `recurrence`) | `TaskResponse` (wrapped in `ResponseEntity`, HTTP 201) |
| PUT | `/api/v1/tasks/{id}` | Path: `id` (`Long`); Body: `UpdateTaskRequest` (same shape as create) | `TaskResponse` |
| DELETE | `/api/v1/tasks/{id}` | Path: `id` (`Long`) | `Void` (wrapped in `ResponseEntity<Void>`, HTTP 204) |
| PATCH | `/api/v1/tasks/{id}/complete` | Path: `id` (`Long`) | `TaskResponse` |
| PATCH | `/api/v1/tasks/{id}/status` | Path: `id` (`Long`); Query: `status` (`Status`) | `TaskResponse` |
| GET | `/api/v1/tasks/archive` | None | `List<TaskResponse>` |
| GET | `/api/v1/tasks/duplicates` | None | `List<DuplicateDetectionService.DuplicateGroup>` |

### Import API (`ImportController`)

| Method | Path | Params / Body | Response model class |
|---|---|---|---|
| POST | `/api/v1/import/csv` | Body: raw `String` CSV payload | `int` |
| POST | `/api/v1/import/tasks` | Body: raw `String` CSV payload | `ImportService.ImportResult` |

### Planning API (`PlanningController`)

| Method | Path | Params / Body | Response model class |
|---|---|---|---|
| GET | `/api/v1/planning/today` | None | `PlanningController.TodayViewResponse` |
| GET | `/api/v1/planning/weekly` | None | `List<PlanningController.DailyPlanResponse>` |

### Matrix API (`MatrixController`)

| Method | Path | Params / Body | Response model class |
|---|---|---|---|
| GET | `/api/v1/matrix` | None | `Map<PriorityCategory, List<TaskResponse>>` |

### Calendar API (`CalendarController`)

| Method | Path | Params / Body | Response model class |
|---|---|---|---|
| GET | `/api/v1/calendar/month` | Query: `year` (`int`), `month` (`int`) | `Map<LocalDate, CalendarService.DaySummary>` |
| GET | `/api/v1/calendar/export.ics` | None | `String` (wrapped in `ResponseEntity<String>`, `text/calendar`) |

### Settings API (`SettingsController`)

| Method | Path | Params / Body | Response model class |
|---|---|---|---|
| GET | `/api/v1/settings` | None | `Map<String, String>` |
| PUT | `/api/v1/settings` | Body: `Map<String, String>` | `Map<String, String>` |

### Dashboard API (`DashboardController`)

| Method | Path | Params / Body | Response model class |
|---|---|---|---|
| GET | `/api/v1/dashboard` | None | `TaskService.DashboardSummary` |

---

## Legacy / Deprecated Endpoints (`/api/**`, `/api/analytics/**`)

> Keep for backward compatibility only. Frontend should migrate to `/api/v1/**`.

### Legacy Tasks (`TaskController`)

| Method | Path | Params / Body | Response model class |
|---|---|---|---|
| GET | `/api/tasks` | None | `List<TaskResponse>` (wrapped in `ResponseEntity`) |
| POST | `/api/tasks` | Body: `CreateTaskRequest` | `TaskResponse` (wrapped in `ResponseEntity`, HTTP 201) |
| PUT | `/api/tasks/{id}` | Path: `id` (`Long`); Body: `UpdateTaskRequest` | `TaskResponse` (wrapped in `ResponseEntity`) |

### Legacy Analytics (`AnalyticsController`)

| Method | Path | Params / Body | Response model class |
|---|---|---|---|
| GET | `/api/analytics/matrix` | None | `Map<PriorityCategory, List<TaskResponse>>` (wrapped in `ResponseEntity`) |
| GET | `/api/analytics/dashboard` | None | `TaskService.DashboardSummary` (wrapped in `ResponseEntity`) |
| GET | `/api/analytics/today` | None | `TaskService.TodayView` (wrapped in `ResponseEntity`) |
| GET | `/api/analytics/weekly-plan` | None | `List<TaskService.DailyPlan>` (wrapped in `ResponseEntity`) |
| GET | `/api/analytics/duplicates` | None | `List<DuplicateDetectionService.DuplicateGroup>` (wrapped in `ResponseEntity`) |

