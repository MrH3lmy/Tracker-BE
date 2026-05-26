# Tracker-BE

Spring Boot backend for task planning, prioritization, recurrence, and analytics workflows.

## Feature summary

The API supports:

- Task CRUD (create, read, update, delete).
- Task lifecycle operations (mark complete, explicit status updates, archive views).
- Recurring tasks with same-task reset behavior (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`).
- Duplicate task detection.
- Planning views (today + weekly).
- Priority matrix view.
- Dashboard summaries.
- Calendar month summaries + `.ics` export.
- App settings read/update.
- CSV import endpoints for bulk task ingestion.

## Tech stack

- Java 21
- Spring Boot 3.3.x
- Spring Data JPA
- Flyway migrations
- PostgreSQL (runtime)
- H2 (tests)
- Maven

---

## Profiles and environment guidance

Use Spring profiles to separate environments:

- `dev`: local development (recommended for docker-compose and local runs).
- `test`: automated/integration testing profile.
- `prod`: production deployment profile.

Set active profile via:

```bash
export SPRING_PROFILES_ACTIVE=dev
```

or JVM arg:

```bash
-Dspring.profiles.active=dev
```

### Database configuration

`application.properties` reads DB connection info from environment variables with defaults:

- `DB_URL` (default: `jdbc:postgresql://localhost:5432/taskpriority`)
- `DB_USERNAME` (default: `taskpriority`)
- `DB_PASSWORD` (default: `taskpriority`)

Flyway is enabled by default and runs migrations at startup from `classpath:db/migration`.

---

## Local setup

### Prerequisites

- JDK 21
- Maven 3.9+
- PostgreSQL 16+ (if not using Docker)
- Node.js 20.19+ (for the optional frontend app)

### 1) Clone and enter project

```bash
git clone <your-repo-url>
cd Tracker-BE
```

### 2) Configure DB env vars (optional if using defaults)

```bash
export DB_URL=jdbc:postgresql://localhost:5432/taskpriority
export DB_USERNAME=taskpriority
export DB_PASSWORD=taskpriority
```

### 3) Run with Maven

```bash
./mvnw spring-boot:run
```

If Maven wrapper is unavailable in your environment:

```bash
mvn spring-boot:run
```

The app starts on `http://localhost:8080`.

---

## Frontend app

A Vite + React + TypeScript frontend lives under `frontend/`. It provides routed
screens for the v1 endpoint map and a request/response inspector for smoke
testing API calls.

```bash
cd frontend
npm install
npm run dev
```

The frontend reads its backend origin from `VITE_API_BASE_URL` and defaults to:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

Build check:

```bash
cd frontend
npm run build
```

---

## Run with Docker Compose (app + PostgreSQL)

Build and start everything:

```bash
docker compose up --build
```

Stop services:

```bash
docker compose down
```

Stop and remove DB volume:

```bash
docker compose down -v
```

Services:

- App: `http://localhost:8080`
- PostgreSQL: `localhost:5432` (`taskpriority/taskpriority`, DB `taskpriority`)

---

## Migration workflow (Flyway)

1. Add a new SQL migration file under:
   `src/main/resources/db/migration`
2. Follow naming convention:
   `V<version>__<description>.sql`
   - Example: `V2__add_task_tags.sql`
3. Start the app; Flyway auto-applies pending migrations.
4. Verify in DB using Flyway metadata table (`flyway_schema_history`).

Notes:

- Keep migrations forward-only and immutable once applied in shared environments.
- Use one migration per logical schema change.

---

## Recurring task completion strategy

This project uses a **same-task reset** strategy for recurring tasks:

1. Client calls `PATCH /api/v1/tasks/{id}/complete`.
2. Service marks completion timestamp for non-recurring tasks (`status=DONE`, `completedDate=now`).
3. For recurring tasks (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), service computes `nextDueDate`, stores:
   - `recurrenceRule.lastCompletedDate`
   - `recurrenceRule.nextDueDate`
4. The same task record is reset to active continuity:
   - `status=NOT_STARTED`
   - `dueDate=nextDueDate`
   - `completedDate=null`

### Recurrence rule behavior

- `DAILY`: `nextDueDate = completionDate + interval days`
- `WEEKLY`: honors `daysOfWeek`; picks next matching day and cadence by `interval` weeks.
- `MONTHLY`: honors `dayOfMonth`; clamps to end-of-month when day exceeds month length.
- `YEARLY`: honors `annualDate`; clamps invalid leap-day years to last day of month.

---

## Endpoint examples

### Task APIs

```bash
# List tasks
curl http://localhost:8080/api/v1/tasks

# Create task
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Prepare sprint plan",
    "dueDate": "2026-06-01",
    "effort": "MEDIUM"
  }'

# Mark complete
curl -X PATCH http://localhost:8080/api/v1/tasks/1/complete

# Update explicit status
curl -X PATCH "http://localhost:8080/api/v1/tasks/1/status?status=IN_PROGRESS"

# Archive view
curl http://localhost:8080/api/v1/tasks/archive

# Duplicates
curl http://localhost:8080/api/v1/tasks/duplicates
```

### Planning and analytics APIs

```bash
curl http://localhost:8080/api/v1/planning/today
curl http://localhost:8080/api/v1/planning/weekly
curl http://localhost:8080/api/v1/matrix
curl http://localhost:8080/api/v1/dashboard
```

### Calendar + settings + import

```bash
curl "http://localhost:8080/api/v1/calendar/month?year=2026&month=5"
curl http://localhost:8080/api/v1/calendar/export.ics
curl http://localhost:8080/api/v1/settings
curl -X PUT http://localhost:8080/api/v1/settings -H "Content-Type: application/json" -d '{"timezone":"UTC"}'
curl -X POST http://localhost:8080/api/v1/import/csv -H "Content-Type: text/plain" --data-binary @tasks.csv
```

---

## OpenAPI / Swagger URL

OpenAPI is enabled in this project via Springdoc. Local URLs:

- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

Quick checks:

```bash
curl -i http://localhost:8080/v3/api-docs
curl -i http://localhost:8080/swagger-ui/index.html
```
