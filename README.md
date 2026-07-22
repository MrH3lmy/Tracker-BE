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

### Auth configuration

- `JWT_SECRET` (**required**, no default) — random string of at least 32 bytes used to sign access/refresh tokens. If unset (or too short), the app fails to start with `app.security.jwt.secret must be set to a random string of at least 32 bytes` and nothing binds to port 8080 — this is a common cause of `ERR_CONNECTION_REFUSED` from the frontend. `docker-compose.yml` and `start-tracker.sh`/`start-tracker.bat` set a local-dev-only default for you; if you run `mvn spring-boot:run` directly, set it yourself, e.g. `export JWT_SECRET=$(openssl rand -base64 48)`.

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

### Double-click launch

Non-technical users can start the full Docker-based Tracker app by double-clicking the launcher for their operating system:

- **macOS:** double-click `launch/Tracker.command`. If macOS blocks the file because it was downloaded from the internet, right-click it, choose **Open**, and confirm that you want to run it.
- **Linux:** double-click `launch/Tracker.desktop`. Depending on your desktop environment, you may need to right-click the file, open **Properties**, allow it to run as a program, or choose **Allow Launching** first.
- **Windows:** double-click `launch/Tracker.bat`.

Each launcher calls the existing Docker startup script for that OS (`start-tracker-docker.sh` on macOS/Linux or `start-tracker-docker.bat` on Windows). The Docker startup script checks that Docker is installed and running, starts PostgreSQL, the backend, and the frontend with Docker Compose, waits for **both** `http://localhost:8080` (the backend finishing its Maven build and Flyway migrations, which is slower than the frontend) and `http://localhost:5173` to respond, and then opens the web app in your browser. Opening the browser before the backend is actually ready is what causes register/login to fail with a connection error immediately after startup. If startup fails, the launcher keeps the terminal window open so you can read the Docker or startup error message.

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

### 2b) Set JWT_SECRET (required for `mvn spring-boot:run`)

`start-tracker.sh`/`start-tracker.bat` set a local-dev-only `JWT_SECRET` for you automatically. If you run Maven directly instead (step 4 below), set it yourself first — the app refuses to start without it:

```bash
export JWT_SECRET=$(openssl rand -base64 48)
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

The app starts on `http://localhost:8080`. Make sure `JWT_SECRET` is set first (see step 2b) — without it the app fails to start and the frontend will show `ERR_CONNECTION_REFUSED` when it tries to reach the backend.

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

The frontend service uses the checked-in `frontend/package.json` and `frontend/package-lock.json`, runs `npm ci` (skipped on restart if `package-lock.json` is unchanged since the last install), then starts Vite with `npm run dev -- --host 0.0.0.0`. Its API base URL is set to `http://localhost:8080`, matching `frontend/.env.example`.

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

Before launching the packaged backend, make sure PostgreSQL is running and reachable, and that `JWT_SECRET` is set, with the expected environment variables:

```bash
export DB_URL=jdbc:postgresql://localhost:5432/taskpriority
export DB_USERNAME=taskpriority
export DB_PASSWORD=taskpriority
export JWT_SECRET=$(openssl rand -base64 48)
```

The Docker starter remains the easiest local option if you want the app, frontend, and PostgreSQL started together without installing PostgreSQL separately.

---

## Tenant isolation model

Every user-owned table has a `user_id` column, and application code scopes reads/writes to the authenticated user (see `TaskService.requireOwnedTask` and equivalents in other services). That's necessary but not sufficient on its own - a missed service-layer check could still create a cross-user relationship (Alice's task pointing at Bob's project) that the database would accept, since a plain `FOREIGN KEY (project_id) REFERENCES projects(id)` only checks that the id exists, not who owns it.

`V42__enforce_composite_tenant_isolation.sql` closes that gap at the database level for most user-owned relationships:

1. Every table referenced by id from another user-owned table gets a `UNIQUE (user_id, id)` key in addition to its primary key.
2. Every FK column on a child table is paired with a composite FK: `FOREIGN KEY (user_id, <fk_column>) REFERENCES <parent>(user_id, id)`. Postgres's default `MATCH SIMPLE` FK semantics mean a `NULL` FK column always satisfies the constraint regardless of `user_id`, so nullable relationships (e.g. `notes.task_id`) keep accepting `NULL` exactly as before - only a *non-null* cross-user reference is rejected.

**Not yet covered** (see the comment at the top of V42 for the full rationale):

- `tasks.board_column_id -> board_columns` and `board_columns.board_id -> boards`: both `boards` and `board_columns` have a permanently `NULL` `user_id` (there's no per-user board-provisioning feature yet - see V29's comment). Enforcing this today would reject every task with a `board_column_id` already set.
- `reminders.reference_id`: polymorphic (points at a task or a habit depending on `kind`), so a single composite FK can't express it.
- `projects.owner_user_id`: not a real FK today (no `REFERENCES` clause anywhere).
- `focus_session_pauses.session_id -> focus_sessions`: `focus_session_pauses` has no `user_id` column to build a composite key from.

When adding a new table that references another user-owned table by id, add the same pair (composite unique key on the parent + composite FK on the child) in that table's own migration rather than waiting for a follow-up cleanup.

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

### Migration immutability policy

**Once a versioned migration file (`V<n>__*.sql`) has been merged to `main`, its content must never change again.** Editing an already-merged migration changes its Flyway checksum; any environment that already applied the old content will fail `flyway validate` (and refuse to start) the next time it deploys, even though nothing about its actual schema is wrong.

If a merged migration turns out to be broken or needs a different approach:

- **Do not edit the existing `V<n>__*.sql` file.** Leave it exactly as merged, bugs and all.
- Add a new migration (e.g. `V<n+1>__fix_<description>.sql`) that corrects the schema/data going forward. Make it idempotent — safe to run whether or not the original migration's bug ever manifested in a given environment.
- If the correction needs to special-case "did the broken version already run here", branch on the current schema/data state inside the new migration rather than assuming a starting point.

This is not a hypothetical: `V29__backfill_and_enforce_user_id_not_null.sql`, `V30__rebuild_app_settings_composite_key.sql`, and `V31__rebuild_priority_scoring_settings_user_scope.sql` were each edited in place after merging to `main` (twice, in V29's case) before this policy was written down. Their current content is correct and is now the frozen, canonical version — **do not edit them again**, even to "clean up" the history. If you deployed from `main` at a commit between when one of those files was first merged and when it was last edited, your `flyway_schema_history` table has a checksum for the old content and `flyway validate` will fail on your next deploy. Recover with:

1. **Back up your database first.**
2. Confirm your actual schema matches what the *current* V29/V30/V31 content would have produced (for V29: `tasks`, `task_dependencies`, `task_schedules`, `habits`, `habit_schedules`, `habit_check_ins`, `notes`, `tags`, `note_collections`, `note_templates`, `note_saved_views`, `note_attachments`, `note_blocks`, `note_task_links`, `note_ai_generations`, and `note_versions` all have `user_id NOT NULL`; for V30: `app_settings` has a `(user_id, setting_key)` primary key; for V31: `priority_scoring_settings` has a `(user_id, setting_name)` unique constraint). If it doesn't, you're in a different, worse state — restore from backup rather than repairing.
3. Once confirmed, run `flyway repair` to resync the recorded checksums with the current file content, then `flyway validate` to confirm the fix.

`flyway repair` is a recovery tool for exactly this situation, not a substitute for the immutability rule above — it should never be part of the normal migration workflow.

A CI check (`.github/workflows/migration-immutability.yml`) enforces this going forward: it fails any pull request that modifies or deletes a migration file that already exists on `main`.

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

## Reminder/notification outbox operations

The reminder producer (`ReminderService#produceReminders`) and outbox dispatcher (`#dispatchNotifications`) are `@Scheduled` jobs safe to run on multiple application instances at once:

- Each job takes a PostgreSQL transaction-scoped advisory lock (`pg_try_advisory_xact_lock`) for the duration of its run, so only one instance does the work per tick; every other instance's attempt returns immediately and tries again next tick.
- The dispatcher claims rows with `PENDING -> PROCESSING` via `FOR UPDATE SKIP LOCKED` in bounded batches (`app.notifications.dispatch-batch-size`, default 50), so two claim attempts can never select the same row.
- A row stuck in `PROCESSING` (e.g. the instance that claimed it crashed before finishing) is automatically recovered back to `PENDING` after `app.notifications.processing-lease-timeout-minutes` (default 5) by the next dispatcher run.
- A row that keeps failing moves to `FAILED` once `attempts` reaches `max_attempts` (`app.notifications.max-dispatch-attempts`, default 5) instead of retrying forever; each retry backs off exponentially (30s doubling, capped at 1 hour) via `next_attempt_at`.

**Replaying `FAILED` notifications**: after fixing whatever caused the failures, requeue them explicitly rather than resetting blindly - a `FAILED` row's `last_error_code`/`last_error_message` tell you why it stopped, and some failures (e.g. a deleted task/habit the reminder referenced) mean the notification should stay dead, not be replayed:

```sql
-- Inspect what's dead-lettered and why, before touching anything.
SELECT id, user_id, reminder_id, attempts, last_error_code, last_error_message
FROM notification_outbox WHERE status = 'FAILED' ORDER BY created_at;

-- Once you've confirmed a specific row's cause is fixed, requeue just that row.
UPDATE notification_outbox
SET status = 'PENDING', attempts = 0, next_attempt_at = now(), last_error_code = NULL, last_error_message = NULL
WHERE id = :id;
```

A row that keeps failing for the same reason across multiple replay attempts (check `attempts`/`last_error_code` before requeuing) is a poison message - leave it `FAILED` rather than looping it back in, and fix or remove the underlying cause (e.g. the reminder it's tied to) instead.

---

## CI and production readiness

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, as four independent jobs: `backend`, `frontend`, `dependency-and-secret-scan`, and `docker`. `.github/workflows/migration-immutability.yml` (see "Migration immutability policy" above) runs alongside them whenever a migration file changes. Mark all of these required in the repo's branch protection settings (Settings -> Branches -> add a rule for `main` -> Require status checks to pass) - a workflow file alone doesn't block merges by itself; someone with admin access has to opt the branch into requiring them.

### Running the same checks locally

```bash
# Backend: unit tests + Postgres/Testcontainers integration tests (needs Docker running locally;
# skipped automatically otherwise, same as `mvn test`) + JaCoCo coverage gate + SpotBugs, all
# bound to the `verify` phase.
mvn verify

# Backend, faster inner loop (unit + Testcontainers tests only, no coverage/SpotBugs gating):
mvn test

# Frontend
cd frontend
npm run lint
npm run test
npm run build
```

Coverage and SpotBugs reports land in `target/site/jacoco/` and `target/spotbugsXml.xml` (open `target/site/jacoco/index.html` in a browser, or run `mvn spotbugs:gui` for an interactive SpotBugs viewer). The CI workflow uploads both as build artifacts on every run, pass or fail.

To reproduce the Docker/Trivy job locally (needs Docker and [Trivy](https://trivy.dev/) installed):

```bash
docker build -t taskpriority-backend:local .
docker run --rm taskpriority-backend:local id -u   # must not print 0
trivy image taskpriority-backend:local
trivy fs .
```

### What's covered vs. what isn't yet

- **Coverage and SpotBugs thresholds are intentionally conservative** (see the comments next to their configuration in `pom.xml`) - set just below the measured baseline when each gate was added, not at some ideal target. Raise them over time rather than treating the current numbers as sufficient.
- **"Previous release schema to latest" and "seeded legacy schema to latest" migration scenarios are not yet automated**: there's no tagged release history to snapshot a prior schema from yet. Every Postgres/Testcontainers test in the suite does exercise "empty database to latest Flyway version" plus `flyway validate` and Hibernate `ddl-auto=validate` (both happen implicitly - those tests use the default profile's `spring.flyway.enabled=true`/`ddl-auto=validate` against a real Postgres container, not the H2 `local-test` profile). Once there's a real release history, add a job that restores a snapshot from a prior tag and runs the upgrade path against it.
- **OWASP Dependency-Check specifically isn't used** - Trivy's filesystem scan covers the same dependency-CVE-scanning need (plus secret scanning, replacing a separate Gitleaks step) with faster, more reliable CI runs than OWASP's NVD-sync-dependent tooling.
- **A CVSS/severity exception policy**: `CRITICAL`/`HIGH` findings fail the build; base-image OS packages with no fix available yet are excluded from the image scan (`ignore-unfixed: true`) since those are upstream's timeline, not this repo's. There's no documented process yet for a one-off exception on a real, unfixed CRITICAL/HIGH finding in this repo's own dependencies - add one (e.g. a `.trivyignore` entry with a linked tracking issue and expiry) if that need comes up rather than lowering the severity threshold.

### Production configuration

- Set `SPRING_PROFILES_ACTIVE=prod` to activate `application-prod.properties` (disables Swagger UI/OpenAPI JSON, restricts Actuator to `/actuator/health` only). It layers on top of the base `application.properties`, it doesn't replace it.
- Required environment variables (the app fails fast at startup if these are missing/invalid rather than starting in a broken state): `JWT_SECRET` (32+ random bytes - see `JwtService#init`), and the database connection (`DB_URL`/`DB_USERNAME`/`DB_PASSWORD`, which fail via the standard "connection refused"/auth-failure path if wrong rather than a custom check).
- Every request gets a correlation/request ID (`X-Request-Id` - reused from the inbound header if the caller already set one, otherwise generated) attached to the response and to the logging MDC for the duration of that request; see `RequestIdFilter`.
- In the `prod` profile, logs are structured JSON (one object per line, via `logstash-logback-encoder`) instead of the human-readable console format used everywhere else - see `logback-spring.xml`. Application code must not log full request/response bodies, tokens, or password hashes; `AuthService`/`JwtService` already avoid this.
- The Docker image runs as a dedicated non-root user (see the Dockerfile's `USER` directive) and defines a `HEALTHCHECK` against `/actuator/health`, which is reachable without authentication (see `SecurityConfig`) since orchestrator/container health probes never supply a JWT.

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
