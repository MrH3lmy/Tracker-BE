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

### Session model (access/refresh tokens)

- The access token is a short-lived JWT (`app.security.jwt.access-token-ttl-minutes`, default 15) returned in the JSON response body and sent by clients as `Authorization: Bearer <token>`. It is never persisted server-side.
- The refresh token is a long-lived (`app.security.jwt.refresh-token-ttl-days`, default 30), opaque, single-use, randomly generated value. Only its SHA-256 hash is stored, in `user_sessions` (see `AuthService`/`UserSessionRepository`) - the raw value is never persisted or logged.
- **Web client contract**: the refresh token is set via `Set-Cookie` (`HttpOnly`, `Secure` outside local dev, configurable `SameSite`, scoped to `Path=/api/v1/auth`) and is never present in a JSON response or request body. `POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout` read it from that cookie only.
- Every refresh rotates the token exactly once (enforced by an atomic conditional `UPDATE`, see `AuthServiceRefreshConcurrencyPostgresTest`) and all sessions issued from the same original login/registration share a `family_id`. Presenting a token that was already consumed in an earlier, already-committed rotation is treated as a replay/theft signal and revokes every active session in that family, not just the presented one (see `AuthService#refresh` and `AuthServiceRefreshConcurrencyPostgresTest#replayingAnAlreadyRotatedTokenRevokesTheDescendantSession`).
- **CSRF model**: `/refresh` and `/logout` authenticate purely from the ambient cookie (no bearer token, no CSRF token). Primary defense is `SameSite=Lax`/`Strict`, which stops browsers from attaching the cookie to a cross-site POST; as defense in depth, both endpoints also reject the request (`403`) when a browser-supplied `Origin` header is present and isn't one of `app.cors.allowed-origins`. A request with no `Origin` header at all is allowed through (some non-browser/legacy clients omit it, and that case is covered by cookie scoping instead) - see `AuthController#rejectDisallowedOrigin`.
- CORS is credentialed (`Access-Control-Allow-Credentials: true`) but only ever for the explicit origin list in `app.cors.allowed-origins`, never `*` (see `WebConfig`).
- **Native/desktop (Flutter) client contract** (issue #257): a dedicated route tree at `POST /api/v1/auth/native/{register,login,refresh,logout,logout-all}` - never inferred from `User-Agent` or any other spoofable header. This is a public-client contract: there is no client secret, and none should ever be embedded in a native/Flutter build, which cannot protect a static secret. The functional difference from the web contract above is entirely about *where the refresh token travels*: the native routes return it as a `refreshToken` field in the JSON response body (register/login/refresh) and read it from a `refreshToken` field in the request body (refresh/logout) instead of a cookie - for the client to persist in OS-backed secure storage (iOS Keychain / Android Keystore / Windows Credential Manager / macOS Keychain / Linux Secret Service or equivalent). Everything else - rotation, replay-family detection, session cap, rate limiting - is the exact same `AuthService` code path the web contract uses; see `NativeAuthController` and `AuthResponse` (returned directly as the native JSON body, contrast `AuthResponseBody` for the web contract). No `Origin`/CSRF check applies to the native routes (see `NativeAuthController`'s class-level Javadoc for why: CSRF is inherently a browser-ambient-credential attack, and a native client must copy its token into the request body explicitly).
- **Session/device metadata**: every session now records which channel issued it (`UserSession#platform` - `WEB`, `ANDROID`, `IOS`, `WINDOWS`, `MACOS`, or `LINUX`; browser-issued sessions are always `WEB`, native routes require the client to declare it explicitly) and carries that forward unchanged across refresh rotations. `GET /api/v1/auth/sessions` (bearer-authenticated, works for either channel) lists every active session for the current user - id, `deviceLabel`, `platform`, `createdAt`, `lastUsedAt`, `expiresAt` - and `DELETE /api/v1/auth/sessions/{id}` revokes one specific session (e.g. "sign out that lost phone") without touching the caller's other devices; a session belonging to another user reports `404`, not `403`, so the endpoint never confirms whether an id exists for someone else's account. See `AuthSessionsController`/`SessionSummaryResponse`.
- **Which endpoints are public**: only `register`/`login`/`refresh`/`logout` (web and native) authenticate off something presented in the request itself (a password, or an explicit refresh token/cookie) and are `permitAll()` in `SecurityConfig`. `logout-all` (both contracts) and the session-listing/revocation endpoints need to know *which* user is asking, so they require a bearer token like the rest of the API - listing the public paths explicitly (rather than `permitAll()`-ing the whole `/api/v1/auth/**` prefix) is what makes that enforced by Spring Security itself rather than left to each controller to remember.

### Authentication rate limiting

`AuthRateLimitService` applies independent, fixed-window rate-limit policies to `/api/v1/auth/{register,login,refresh}` - and identically to their `/api/v1/auth/native/*` counterparts, since `NativeAuthController` calls the exact same `AuthRateLimitService` methods (see `com.taskpriority.ratelimit`). Each policy is `max-attempts` within `window-seconds`; defaults and env var overrides:

| Policy | Property | Env var | Default |
|---|---|---|---|
| Login, per IP | `app.rate-limit.login.ip.max-attempts` / `.window-seconds` | `RATE_LIMIT_LOGIN_IP_MAX_ATTEMPTS` / `_WINDOW_SECONDS` | 20 / 900s |
| Login, per account | `app.rate-limit.login.account.max-attempts` / `.window-seconds` | `RATE_LIMIT_LOGIN_ACCOUNT_MAX_ATTEMPTS` / `_WINDOW_SECONDS` | 5 / 900s |
| Register, per IP | `app.rate-limit.register.ip.max-attempts` / `.window-seconds` | `RATE_LIMIT_REGISTER_IP_MAX_ATTEMPTS` / `_WINDOW_SECONDS` | 10 / 3600s |
| Refresh, per IP | `app.rate-limit.refresh.ip.max-attempts` / `.window-seconds` | `RATE_LIMIT_REFRESH_IP_MAX_ATTEMPTS` / `_WINDOW_SECONDS` | 10 / 300s |

Tuning guidance: the per-account login policy is intentionally tighter than per-IP (5 vs 20) since it's the more targeted brute-force signal (many failed logins against one account) - loosen per-IP first if you have legitimate shared-IP traffic (NAT/office networks), not per-account. A successful login/refresh resets that specific IP/account bucket without touching unrelated ones (see `AuthRateLimitService#recordLoginSuccess`/`recordRefreshSuccess`) - failed attempts that never succeed are the only thing that accumulates toward the limit.

- **Storage**: Redis-backed by default (`app.rate-limit.redis-enabled=true`), so counters are shared across every application instance and survive individual instance restarts - see `RedisRateLimiter` (atomic Lua increment-and-expire, so concurrent requests across instances can't race past the limit). Configure the connection via `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` (`spring.data.redis.*`). `docker-compose.yml`'s `redis` service is the local example.
- **Redis failure behavior**: fails open. If Redis is unreachable, requests are allowed through (logged as a warning) rather than every login/registration/refresh going down with it - an availability outage in a supporting service shouldn't become an authentication outage. Monitor the `auth.ratelimit.requests` metric (below) and Redis's own health to catch this rather than relying on limiter behavior to surface it.
- **Local/single-instance fallback**: set `RATE_LIMIT_REDIS_ENABLED=false` to use `LocalRateLimiter`, a bounded in-memory fixed-window map (no Redis dependency) - this is what the `local-test` Spring profile uses for the test suite. Not appropriate for a real multi-instance deployment (each instance tracks its own counters, and counters reset on restart).
- **Trusted proxies**: `app.rate-limit.trusted-proxies` (`RATE_LIMIT_TRUSTED_PROXIES`) is a comma-separated CIDR list. Empty (the default) means `X-Forwarded-For` is never trusted and the direct TCP peer is always used as the client IP - correct with no reverse proxy in front of the app, wrong behind one (every request will appear to come from the proxy). Set this to your load balancer/reverse proxy's subnet in front of a real deployment; see `TrustedProxyResolver` for exactly how the direct-peer-must-be-trusted check works and why a spoofed header from an untrusted direct caller can't bypass it.
- **Response**: a blocked request gets `429 Too Many Requests` with a `Retry-After` header (seconds) and the standard `ApiErrorResponse` body - no internal counters or account-existence information is revealed.
- **Monitoring**: `auth.ratelimit.requests` (Micrometer counter, tags `endpoint` ∈ {login,register,refresh}, `dimension` ∈ {ip,account}, `outcome` ∈ {allowed,blocked}) - exposed wherever the app's Micrometer registry is exported. No raw email/IP ever appears in a metric label, log line, or Redis key: account keys are SHA-256 hashed the same way `AuthService` hashes refresh tokens before persisting them (see `AuthRateLimitService#accountKey`), and Redis keys embed the IP directly (server-side infrastructure, not a public log/metric surface) rather than a hash, since correlating operational Redis state to a specific client during an incident is the point of that particular value.
- **Emergency override**: there's no separate kill switch beyond raising the relevant `*_MAX_ATTEMPTS`/`*_WINDOW_SECONDS` env var (or `RATE_LIMIT_REDIS_ENABLED=false` to at least stop cross-instance amplification) and redeploying - a dedicated runtime-toggle endpoint wasn't built. `RateLimitPolicy` rejects a non-positive `maxAttempts`, so "disable" in practice means setting a very high attempt count rather than zero.

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
- MinIO (S3-compatible object storage for note attachments): API `http://localhost:9000`, console `http://localhost:9001` (`taskpriority-dev` / `taskpriority-dev-secret`)

The frontend service uses the checked-in `frontend/package.json` and `frontend/package-lock.json`, runs `npm ci` (skipped on restart if `package-lock.json` is unchanged since the last install), then starts Vite with `npm run dev -- --host 0.0.0.0`. Its API base URL is set to `http://localhost:8080`, matching `frontend/.env.example`.

### Note attachment storage

Note screenshot attachments (`NoteAttachment`) can live in one of two places, selected per-row by `storage_provider`:

- **`DATABASE`** (default everywhere `app.storage.s3.enabled` isn't explicitly set to `true`): bytes live in `note_attachments.data` (`bytea`), exactly as before. Every existing environment, and every test in this repo, uses this path unless it opts in.
- **`S3`**: bytes live in an S3-compatible bucket instead - see `AttachmentStorage`/`S3AttachmentStorage`/`AttachmentStorageConfig`. Uploads stream directly from the multipart request to the bucket (no `MultipartFile#getBytes()` buffering); downloads/deletes go through the same interface. `docker compose up` enables this against the `minio` service automatically. To point at real S3 (or a different MinIO/LocalStack instance) elsewhere, set: `STORAGE_S3_ENABLED=true`, `STORAGE_S3_BUCKET`, `STORAGE_S3_REGION`, `STORAGE_S3_ACCESS_KEY`/`STORAGE_S3_SECRET_KEY` (omit both to fall back to the AWS SDK's normal credential chain), `STORAGE_S3_ENDPOINT` (only for a non-AWS provider), `STORAGE_S3_PATH_STYLE_ACCESS` (`true` for MinIO/LocalStack, generally `false` for real AWS S3).

Known gaps, tracked as follow-up rather than blocking this pass (issue #261): there is no backfill job to migrate already-stored `DATABASE`-provider rows to `S3` after enabling it - existing rows keep reading from PostgreSQL indefinitely (which is a legitimate documented behavior, not a bug, but the issue's "migrate everything to object storage" goal isn't automated). Deleting a note cascades attachment rows away in PostgreSQL (`ON DELETE CASCADE`) without going through `NoteService.deleteScreenshot`, so it does **not** delete the corresponding S3 objects - only deleting a screenshot individually does. Antivirus/malware scanning, per-file/per-user upload quota beyond the existing size limit, and presigned client-direct-upload are not implemented.

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

`GET /api/v1/tasks` and `GET /api/v1/tasks/archive` are paginated and filtered in PostgreSQL (see `TaskSpecifications`/`TaskService#findPage`), not loaded in full and filtered in Java. The JSON body stays a plain array for backward compatibility; page metadata is returned in response headers instead: `X-Total-Count`, `X-Total-Pages`, `X-Page`, `X-Page-Size`, `X-Has-Next`. Query params: `page` (default `0`), `size` (default `200`, server-capped at `500` regardless of what's requested), `status` (repeatable), `projectId`, `boardColumnId`, `area`, `riskLevel`, `dueDateFrom`/`dueDateTo` (`yyyy-MM-dd`), `search` (case-insensitive title substring). Sort order is always `position` then `id` ascending, matching every other position-ordered task query in this codebase, so ordering stays deterministic across pages.

Known gaps, tracked as follow-up rather than blocking this pass: the matrix view (`GET /api/v1/matrix`) still groups by `priorityCategory`, which is computed at request time by `PriorityEngine` and isn't a database column, so it isn't paginated/DB-filtered here; the frontend still requests a single page (defaulting to the 200-row page size above) rather than offering incremental loading/page navigation - both are real, just out of scope for this change.

```bash
# List tasks (first page, default size)
curl http://localhost:8080/api/v1/tasks

# Filtered + paginated
curl "http://localhost:8080/api/v1/tasks?status=NOT_STARTED&status=IN_PROGRESS&projectId=1&page=0&size=50"

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

- Each job takes a PostgreSQL transaction-scoped advisory lock (`pg_try_advisory_xact_lock`) for the duration of its run, so only one instance does the work per tick; every other instance's attempt returns immediately and tries again next tick. This lock guards *production* only - dispatch deliberately never takes it (see below).
- The dispatcher claims rows with `PENDING -> PROCESSING` via `FOR UPDATE SKIP LOCKED` in bounded batches (`app.notifications.dispatch-batch-size`, default 50), so two claim attempts can never select the same row. Unlike production, every healthy instance dispatches concurrently on its own schedule - `FOR UPDATE SKIP LOCKED` is what keeps their claims disjoint, not a leader lock.
- Each claim stamps the batch with the claiming instance's **worker identifier** (`notification_outbox.worker_id`, populated by `WorkerIdentity` - `hostname:<8-char-random-suffix>`, generated once per JVM lifetime). This lets a stuck/recovered row or a duplicate-processing incident be traced back to the specific instance that handled it: `SELECT worker_id, count(*) FROM notification_outbox GROUP BY worker_id;`.
- A row stuck in `PROCESSING` (e.g. the instance that claimed it crashed before finishing) is automatically recovered back to `PENDING` after `app.notifications.processing-lease-timeout-minutes` (default 5) by the next dispatcher run.
- A row that keeps failing moves to `FAILED` once `attempts` reaches `max_attempts` (`app.notifications.max-dispatch-attempts`, default 5) instead of retrying forever; each retry backs off exponentially (30s doubling, capped at 1 hour) via `next_attempt_at`.
- **Recovered-row fencing**: lease recovery only handles a worker that's actually gone. A worker that's merely *slow* (long GC pause, network blip) can still be alive and finish processing *after* another worker has already reclaimed and possibly completed the same row. To prevent that stale write from silently overwriting the replacement worker's outcome, every delivery/failure write is a conditional `UPDATE ... WHERE id = ? AND processing_started_at = ?` keyed on the exact claim timestamp the worker observed (`NotificationOutboxRepository#markDelivered`/`#markDeliveryOutcome`) rather than a blind save. If the row's `processing_started_at` has moved on (someone else reclaimed it), the update affects zero rows, the stale worker's outcome is discarded, and `notifications.outbox.stale_claim_discarded` is incremented - see `ReminderServiceMultiInstancePostgresTest#aRecoveredAndReclaimedRowCannotBeOverwrittenByTheOriginalWorkersStaleOutcome` for the proof.

**Metrics** (via Micrometer `MeterRegistry`, exposed at `/actuator/prometheus` when enabled): `notifications.outbox.claimed`, `.recovered`, and `.stale_claim_discarded` are untagged counts (not per-channel); `notifications.outbox.delivered`, `.retried`, and `.failed` are tagged by `channel` (currently only `IN_APP`); `notifications.outbox.processing.duration` is a `Timer` measuring claim-to-outcome latency. None of these are tagged by worker id - a random per-restart suffix in every worker id would make that an unbounded-cardinality label, so worker-level attribution is a `worker_id` column query (above), not a metric dimension.

**Throughput benchmarks** (`ReminderServiceMultiInstancePostgresTest`, Testcontainers, real Postgres):
- `manyConcurrentWorkersClaimEveryEntryExactlyOnceAndReportThroughput` drives 8 concurrent simulated worker identities against `claimBatch` over 2,000 queued entries, asserts every entry is claimed by exactly one worker and its `worker_id` column matches its actual claimer, and logs the achieved claim throughput (entries/sec).
- `throughputIncreasesWithMoreConcurrentWorkers` measures the same claim loop with 1 worker vs. 8 workers over identical volumes and asserts the 8-worker run clears the 1-worker run by a comfortable margin - the actual "removing the leader lock improves horizontal throughput" proof, not just a non-regression floor.
- `claimQueryUsesTheCompositeStatusNextAttemptIndexNotASequentialScan` seeds a realistic status mix, runs `EXPLAIN` on the claim query, and asserts the plan isn't a full table scan (backed by the `(status, next_attempt_at)` index from V41).

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

### Branch protection / merge policy for `main`

A workflow file only *runs* checks; it doesn't *block* merges on its own. An admin must configure a branch protection rule or repository ruleset for `main` (Settings -> Rules -> Rulesets, or the legacy Settings -> Branches -> Branch protection rules) with:

- Require a pull request before merging, with conversation resolution required.
- Require branches to be up to date with `main` before merging (or use the merge queue).
- Require these status checks to pass, using their exact job names so the rule keeps matching after workflow refactors:
  - `Backend build, test, coverage, static analysis` (from `ci.yml`, job `backend`)
  - `Frontend build, lint, test` (from `ci.yml`, job `frontend`)
  - `Dependency + secret scan (Trivy)` (from `ci.yml`, job `dependency-and-secret-scan`)
  - `Docker build + image scan` (from `ci.yml`, job `docker`)
  - `Fail if an existing migration file was modified or deleted` (from `migration-immutability.yml`, only runs when migration files change - configure it as required anyway so a PR that touches migrations can't merge without it reporting)
- Do not allow cancelled, skipped, neutral, or timed-out mandatory jobs to satisfy the rule (this is the default GitHub Actions status-check behavior as long as the job names above are marked required and are not wrapped in a `continue-on-error: true` step).
- Block force pushes and branch deletion on `main`.
- Apply the rule to administrators as well, with a documented break-glass exception (below) for the rare case that requires bypassing it.

#### Emergency bypass ("break glass") process

Bypassing required checks on `main` must be exceptional and auditable:

1. State the reason for the bypass in the merge commit message or a linked issue comment.
2. Get explicit approval from a named repository admin before merging.
3. Open a follow-up issue tracking the underlying CI/check failure that was bypassed.
4. Trigger an immediate post-merge CI run against `main` (push an empty commit or re-run the workflow) and confirm its result.
5. Have a rollback plan (revert commit or previous known-good SHA) ready before merging.

Verify the policy works by opening a temporary draft PR with a deliberately failing test - GitHub should grey out/disable the merge button until the check passes.

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
docker run --rm --entrypoint id taskpriority-backend:local -u   # must not print 0
trivy image taskpriority-backend:local
trivy fs .
```

### What's covered vs. what isn't yet

- **Coverage and SpotBugs thresholds are intentionally conservative** (see the comments next to their configuration in `pom.xml`) - set just below the measured baseline when each gate was added, not at some ideal target. Raise them over time rather than treating the current numbers as sufficient.
- **"Previous release schema to latest" and "seeded legacy schema to latest" migration scenarios are not yet automated**: there's no tagged release history to snapshot a prior schema from yet. Every Postgres/Testcontainers test in the suite does exercise "empty database to latest Flyway version" plus `flyway validate` and Hibernate `ddl-auto=validate` (both happen implicitly - those tests use the default profile's `spring.flyway.enabled=true`/`ddl-auto=validate` against a real Postgres container, not the H2 `local-test` profile). Once there's a real release history, add a job that restores a snapshot from a prior tag and runs the upgrade path against it.
- **OWASP Dependency-Check specifically isn't used** - Trivy's filesystem scan covers the same dependency-CVE-scanning need (plus secret scanning, replacing a separate Gitleaks step) with faster, more reliable CI runs than OWASP's NVD-sync-dependent tooling.
- **A CVSS/severity exception policy**: `CRITICAL`/`HIGH` findings fail the build; base-image OS packages with no fix available yet are excluded from the image scan (`ignore-unfixed: true`) since those are upstream's timeline, not this repo's. For a real, unfixed CRITICAL/HIGH finding whose vulnerable code path genuinely isn't reachable, add a `.trivyignore` entry (repo root - Trivy loads it automatically, no workflow change needed) with a comment explaining why it doesn't apply here, a linked tracking issue for the real fix, and an expiry date to force re-assessment - see the `GHSA-qwww-vcr4-c8h2` entry (issue #268) for the pattern. Never lower the severity threshold instead.

### Production configuration

- Set `SPRING_PROFILES_ACTIVE=prod` to activate `application-prod.properties` (disables Swagger UI/OpenAPI JSON, restricts Actuator to `/actuator/health` only). It layers on top of the base `application.properties`, it doesn't replace it - and the base file's convenient localhost/dev-credential defaults are exactly what `application-prod.properties` overrides with no-default placeholders (issue #259), so the two files together are what makes `prod` fail fast instead of silently starting against `localhost`.
- **`dev`/local profiles are the only place with convenient defaults.** Only the `prod` and `local-test` (automated tests, H2) profiles have dedicated properties files; running without `SPRING_PROFILES_ACTIVE` set at all uses the base `application.properties` defaults directly - fine for `mvn spring-boot:run` against a local Postgres, not a supported production configuration. `prod` is the only profile intended for a real deployment.
- **Required environment variables** in the `prod` profile - the app fails at startup (before accepting any traffic) if one is missing, naming the property without ever printing a value:

  | Variable | Secret? | Enforced by |
  |---|---|---|
  | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | password is secret | no-default placeholder in `application-prod.properties` (Spring's own placeholder resolution) |
  | `JWT_SECRET` (32+ random bytes) | secret | `JwtService#init` (`@PostConstruct`), checked everywhere, all profiles |
  | `CORS_ALLOWED_ORIGINS` | not secret | no-default placeholder + `ProductionConfigValidator` (also rejects a wildcard origin) |
  | `REDIS_HOST` (backs distributed auth rate limiting, see below) | not secret | no-default placeholder in `application-prod.properties` |

  `ProductionConfigValidator` (`com.taskpriority.config`, `@Profile("prod")`) additionally sanity-checks that `app.notifications.dispatch-batch-size`/`max-dispatch-attempts`/`processing-lease-timeout-minutes` are positive. There are currently no external email/SMS notification providers in this API (`NotificationChannel` only has `IN_APP`), so there's nothing else in that category to require yet - add it here when one is introduced.
- **Redis is deliberately not a hard runtime dependency.** `REDIS_HOST` must be set explicitly in `prod` (so a real deployment can't silently default to `localhost` and quietly lose cross-instance rate-limit sharing), but if Redis becomes unreachable *after* startup, `RedisRateLimiter` fails open rather than taking authentication down with it - see "Authentication rate limiting" above. `management.health.redis.enabled=false` keeps a Redis outage from flipping `/actuator/health` (and therefore the Docker `HEALTHCHECK`/orchestrator readiness probe) to `DOWN` for the same reason.
- Every request gets a correlation/request ID (`X-Request-Id` - reused from the inbound header if the caller already set one, otherwise generated) attached to the response and to the logging MDC for the duration of that request; see `RequestIdFilter`.
- In the `prod` profile, logs are structured JSON (one object per line, via `logstash-logback-encoder`) instead of the human-readable console format used everywhere else - see `logback-spring.xml`. Application code must not log full request/response bodies, tokens, or password hashes; `AuthService`/`JwtService` already avoid this, and `AuthRateLimitService`/`RedisRateLimiter` never put a raw email in a rate-limit key or log line either (see "Authentication rate limiting").
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
