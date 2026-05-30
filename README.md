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

## One-click / easy start

The recommended one-click way to run the full Tracker app locally is with Docker because the existing Docker Compose stack starts every required service for you:

- `postgres:16-alpine` database
- Spring Boot backend
- Vite frontend

Use the root-level Docker convenience script for your OS. It checks that Docker is installed and running, then starts the existing `docker-compose.yml` stack with `docker compose up --build`. The frontend container installs dependencies from `frontend/package-lock.json`, starts Vite from the `frontend/` directory, and points the UI at `VITE_API_BASE_URL=http://localhost:8080`.

macOS/Linux:

```bash
./start-tracker-docker.sh
```

Windows:

```bat
start-tracker-docker.bat
```

After startup, open:

- Frontend URL: `http://localhost:5173`
- Backend URL: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`

---

## Local setup

### Prerequisites

- JDK 21
- Maven 3.9+
- PostgreSQL 16+ (if not using Docker)

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

### 3) Run the backend-only startup scripts

The repository includes simple backend-only startup scripts that verify Java 21, build `target/taskpriority-0.0.1-SNAPSHOT.jar` when it is missing, set the `dev` Spring profile, apply the default DB environment values, and start only the Spring Boot backend.

> **Warning:** `start-tracker.sh` and `start-tracker.bat` do not start PostgreSQL or the frontend. Before running them, make sure PostgreSQL is already running and reachable with your `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` settings. Start the frontend dev server separately from `frontend/` (for example, with `npm run dev`) if you need the UI at `http://localhost:5173`. For a full-app one-click startup that includes PostgreSQL, backend, and frontend, use `start-tracker-docker.sh` or `start-tracker-docker.bat` instead.

macOS/Linux:

```bash
./start-tracker.sh
```

Windows:

```bat
start-tracker.bat
```

The backend starts on `http://localhost:8080`, and Swagger UI is available at `http://localhost:8080/swagger-ui/index.html`.

### 4) Run with Maven

```bash
./mvnw spring-boot:run
```

If Maven wrapper is unavailable in your environment:

```bash
mvn spring-boot:run
```

The app starts on `http://localhost:8080`.

---

## Run with Docker Compose (frontend + app + PostgreSQL)

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

- Frontend: `http://localhost:5173`
- App/API: `http://localhost:8080`
- PostgreSQL: `localhost:5432` (`taskpriority/taskpriority`, DB `taskpriority`)

The frontend service uses the checked-in `frontend/package.json` and `frontend/package-lock.json`, runs `npm ci`, then starts Vite with `npm run dev -- --host 0.0.0.0`. Its API base URL is set to `http://localhost:8080`, matching `frontend/.env.example`.

---

## Optional native packaging with JDK 21 `jpackage`

The repository includes optional helper scripts for creating platform-specific native launchers around the Spring Boot JAR. This packaging flow is useful for distributing the backend as a desktop-style command launcher, but it does **not** replace the database requirement: PostgreSQL is still required at runtime unless you use the Docker-based starter described above, which starts PostgreSQL for you.

The generated launcher starts the packaged Spring Boot JAR with behavior equivalent to:

```bash
java -jar taskpriority-0.0.1-SNAPSHOT.jar
```

### Packaging prerequisites

- JDK 21 from a full JDK distribution, with both `java` and `jpackage` on `PATH`.
- Maven 3.9+ or the Maven wrapper if one is added later.
- Platform packaging tools for installer formats:
  - Windows `.exe` / `.msi`: run on Windows; WiX Toolset may be required for `.msi` generation depending on your JDK packaging toolchain.
  - macOS `.app` / `.dmg`: run on macOS.
  - Linux `.deb` / `.rpm`: run on the matching Linux packaging environment with the required system packaging tools installed.

`jpackage` is platform-specific. Build Windows packages on Windows, macOS packages on macOS, and Linux packages on Linux. The `app-image` type creates an unpacked application image for the current platform.

### Build packages

macOS/Linux:

```bash
# Unpacked app image for the current OS
./scripts/package/package.sh app-image

# macOS examples
./scripts/package/package.sh dmg

# Linux examples
./scripts/package/package.sh deb
./scripts/package/package.sh rpm
```

Windows:

```bat
REM Unpacked app image for Windows
scripts\package\package.bat app-image

REM Windows installer examples
scripts\package\package.bat exe
scripts\package\package.bat msi
```

Each script performs the same workflow:

1. Verifies that JDK 21 and `jpackage` are available.
2. Builds `target/taskpriority-0.0.1-SNAPSHOT.jar` with Maven using `clean package`.
3. Copies the JAR into `target/jpackage-input/`.
4. Runs `jpackage` with `--main-jar taskpriority-0.0.1-SNAPSHOT.jar`.
5. Writes package output under `build/jpackage/`.

You can customize the package command with environment variables:

```bash
APP_NAME=TaskPriorityBackend \
OUTPUT_DIR=dist/native \
JPACKAGE_OPTIONS="--vendor ExampleOrg --linux-shortcut" \
./scripts/package/package.sh deb
```

On Windows, set the same variables before running `package.bat`:

```bat
set APP_NAME=TaskPriorityBackend
set OUTPUT_DIR=dist\native
set JPACKAGE_OPTIONS=--vendor ExampleOrg
scripts\package\package.bat msi
```

### Running a packaged launcher

Before launching the packaged backend, make sure PostgreSQL is running and reachable with the expected environment variables:

```bash
export DB_URL=jdbc:postgresql://localhost:5432/taskpriority
export DB_USERNAME=taskpriority
export DB_PASSWORD=taskpriority
```

The Docker starter remains the easiest local option if you want the app, frontend, and PostgreSQL started together without installing PostgreSQL separately.

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
